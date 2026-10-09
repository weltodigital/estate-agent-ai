// Applies supabase/migrations to an in-memory Postgres (PGlite) with a stub
// Supabase auth schema, then checks tenancy isolation, the worker queue and
// the write guards. Run: pnpm test:db
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
const dir = fileURLToPath(new URL("../migrations", import.meta.url));
const db = new PGlite();
const q = (s, p) => db.query(s, p);
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
for (const f of readdirSync(dir).sort()) { try { await db.exec(readFileSync(`${dir}/${f}`, "utf8")); } catch (e) { console.log("ERR in", f, e.message, e.position); process.exit(1); }  }
const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
await q(`insert into auth.users (id,email) values ($1,'a@x.com'),($2,'b@x.com')`, [A, B]);
assert.equal((await q(`select count(*)::int n from profiles`)).rows[0].n, 2, "profile per auth user");
async function as(user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false); select set_config('request.jwt.claim.role','authenticated',false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claim.role','',false);`); }
}
const orgA = await as(A, async () => (await q(`select create_organisation('Agency A') id`)).rows[0].id);
const orgB = await as(B, async () => (await q(`select create_organisation('Agency B') id`)).rows[0].id);
// service role inserts branch + run
const br = (await q(`insert into branches (org_id,name,town) values ($1,'A Branch','Portsmouth') returning id`, [orgA])).rows[0].id;
await q(`insert into scan_runs (org_id,branch_id,kind,engines,budget_usd) values ($1,$2,'manual','{openai}',5)`, [orgA, br]);
assert.equal(await as(A, async () => (await q(`select count(*)::int n from branches`)).rows[0].n), 1);
assert.equal(await as(B, async () => (await q(`select count(*)::int n from branches`)).rows[0].n), 0, "no cross-org reads");
assert.deepEqual(await as(B, async () => (await q(`select name from organisations`)).rows.map((r) => r.name)), ["Agency B"]);
await assert.rejects(as(A, () => q(`insert into branches (org_id,name,town) values ($1,'x','y')`, [orgA])), /row-level security/);
await assert.rejects(as(A, () => q(`select * from claim_scan_run('w')`)), /permission denied/);
const claimed = (await q(`select id, status, attempts from claim_scan_run('w1')`)).rows;
assert.equal(claimed.length, 1);
assert.equal(claimed[0].status, "running");
assert.equal((await q(`select id from claim_scan_run('w2')`)).rows.length, 0, "no double claim");
assert.equal(Number((await q(`select add_scan_cost($1, 0.25) c`, [claimed[0].id])).rows[0].c), 0.25);
const rec = (await q(`insert into recommendations (org_id,branch_id,rule_id,fingerprint,title,why,priority,effort,evidence_json) values ($1,$2,'r','r','t','w',1,'S','{"a":1}') returning id`, [orgA, br])).rows[0].id;
await as(A, () => q(`update recommendations set status='done' where id=$1`, [rec]));
assert.deepEqual((await q(`select status, completed_at is not null c from recommendations`)).rows[0], { status: "done", c: true });
await assert.rejects(as(A, () => q(`update recommendations set why='hacked' where id=$1`, [rec])), /only status/);
const n = await as(B, async () => (await q(`update recommendations set status='dismissed' where id=$1`, [rec])).affectedRows);
assert.equal(n, 0, "no cross-org writes");
await assert.rejects(as(A, () => q(`update profiles set is_admin=true where id=$1`, [A])), /administrator/);
assert.equal((await q(`select count(*)::int n from prompts`)).rows[0].n, 20);
assert.equal(await as(B, async () => (await q(`select count(*)::int n from prompts`)).rows[0].n), 20, "library readable");
await as(A, () => q(`update profiles set full_name='Ann' where id=$1`, [A]));
assert.equal((await q(`select full_name from profiles where id=$1`, [A])).rows[0].full_name, "Ann");
assert.equal(await as(B, async () => (await q(`select count(*)::int n from profiles where id=$1`, [A])).rows[0].n), 0);
console.log("db tests passed");

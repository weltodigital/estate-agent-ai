import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, requireDbEnv } from "./env";

let client: SupabaseClient | null = null;

/** Service-role client: the worker writes on behalf of every organisation. */
export function db(): SupabaseClient {
  if (!client) {
    requireDbEnv();
    client = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Throws on a Supabase error so failures surface instead of silently returning null. */
export function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

/** PostgREST caps rows per request (1000 by default); page through everything. */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  what: string,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const res = await page(from, from + pageSize - 1);
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}

/** Inserts in chunks to keep request bodies small. */
export async function insertChunked(table: string, rows: Record<string, unknown>[], chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    must(await db().from(table).insert(rows.slice(i, i + chunk)), `insert ${table}`);
  }
}

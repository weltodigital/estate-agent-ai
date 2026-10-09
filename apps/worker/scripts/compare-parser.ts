// Compares a candidate parser model against the parses already stored.
// Read-only on scan data; the candidate's API cost is logged like any parse.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=... \
//     pnpm tsx scripts/compare-parser.ts claude-haiku-5-5

import { normaliseAgentName } from "@privett/core";
import { RunBudget } from "../src/cost";
import { db } from "../src/db";
import { parseAnswer } from "../src/parse";

const candidate = process.argv[2] ?? "claude-haiku-5-5";

const { data: results, error } = await db()
  .from("scan_results")
  .select("id, prompt_text, answer_text, model")
  .eq("parse_status", "ok")
  .not("answer_text", "is", null);
if (error) throw error;
const { data: mentions, error: mErr } = await db()
  .from("agent_mentions")
  .select("scan_result_id, normalised_name, position, sentiment_score");
if (mErr) throw mErr;

const budget = new RunBudget(null, 5, 0);
let sameSet = 0;
let sameOrder = 0;
let jaccardSum = 0;
const sentimentDiffs: number[] = [];
const diffs: string[] = [];

for (const r of results ?? []) {
  const base = (mentions ?? [])
    .filter((m) => m.scan_result_id === r.id)
    .sort((a, b) => a.position - b.position);
  const baseNames = base.map((m) => m.normalised_name);
  const out = await parseAnswer(r.prompt_text, r.answer_text!, budget, candidate);
  if (!out.parsed) {
    diffs.push(`[parse failed] ${r.prompt_text}: ${out.error}`);
    continue;
  }
  const candNames = out.parsed.agents.map((a) => normaliseAgentName(a.name));
  const a = new Set(baseNames);
  const b = new Set(candNames);
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  jaccardSum += union ? inter / union : 1;
  if (inter === a.size && inter === b.size) sameSet++;
  if (baseNames.join("|") === candNames.join("|")) sameOrder++;
  for (const m of base) {
    const c = out.parsed.agents.find((x) => normaliseAgentName(x.name) === m.normalised_name);
    if (c && m.sentiment_score !== null) sentimentDiffs.push(Math.abs(c.sentiment_score - m.sentiment_score));
  }
  if (inter !== a.size || inter !== b.size) {
    diffs.push(
      `${r.prompt_text}\n    stored:    ${baseNames.join(", ")}\n    ${candidate}: ${candNames.join(", ")}`,
    );
  }
}

const n = results?.length ?? 0;
const pct = (x: number) => `${Math.round((x / Math.max(n, 1)) * 100)}%`;
console.log(`\n${candidate} vs stored parses, ${n} answers`);
console.log(`  same agents named:      ${sameSet}/${n} (${pct(sameSet)})`);
console.log(`  same agents, same order: ${sameOrder}/${n} (${pct(sameOrder)})`);
console.log(`  mean overlap (Jaccard): ${(jaccardSum / Math.max(n, 1)).toFixed(2)}`);
const mean = sentimentDiffs.length ? sentimentDiffs.reduce((x, y) => x + y, 0) / sentimentDiffs.length : 0;
console.log(`  mean sentiment gap:     ${mean.toFixed(1)} points over ${sentimentDiffs.length} agents`);
console.log(`  cost:                   $${budget.spentUsd.toFixed(4)}`);
if (diffs.length) console.log(`\nDifferences:\n  ${diffs.join("\n  ")}`);

// Loads a branch's stored responses for metric computation.

import type { AgentMentionRow, ScanResultRow } from "@privett/core";
import { db, fetchAll } from "./db";

export interface ResultRow extends ScanResultRow {
  branch_prompt_id: string | null;
}
export interface MentionRow extends AgentMentionRow {
  agent_name: string;
}
export interface CitationRow {
  scan_result_id: string;
  domain: string;
  is_own_domain: boolean;
  competitor_id: string | null;
}

async function byResultIds<T>(table: string, columns: string, ids: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    out.push(...(await fetchAll<T>((from, to) => db().from(table).select(columns).in("scan_result_id", chunk).range(from, to) as never, `select ${table}`)));
  }
  return out;
}

export async function loadBranchData(branchId: string, fromIso: string, toIso?: string) {
  const results = await fetchAll<ResultRow>((from, to) => {
    let q = db()
      .from("scan_results")
      .select("id, engine, intent_group, created_at, prompt_text, parse_status, branch_prompt_id")
      .eq("branch_id", branchId)
      .gte("created_at", fromIso);
    if (toIso) q = q.lt("created_at", toIso);
    return q.order("created_at").range(from, to);
  }, "select scan_results");
  const ids = results.filter((r) => r.parse_status === "ok").map((r) => r.id);
  const [mentions, citations] = await Promise.all([
    byResultIds<MentionRow>(
      "agent_mentions",
      "scan_result_id, agent_name, normalised_name, position, is_branch, matched_competitor_id, matched_league_agent_id, match_confidence, sentiment_score, descriptors",
      ids,
    ),
    byResultIds<CitationRow>("citations", "scan_result_id, domain, is_own_domain, competitor_id", ids),
  ]);
  return { results, mentions, citations };
}

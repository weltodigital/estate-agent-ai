// The one mapping from stored rows (scan_results + agent_mentions) to metric
// inputs. Used by the worker's weekly rollups, the dashboard and league
// tables, so every surface computes metrics identically.

import type { MetricResponse, ResponseAgent } from "./metrics";

export interface ScanResultRow {
  id: string;
  engine: string;
  intent_group: string;
  created_at: string;
  prompt_text: string;
  parse_status: string;
}

export interface AgentMentionRow {
  scan_result_id: string;
  normalised_name: string;
  position: number;
  is_branch: boolean;
  matched_competitor_id: string | null;
  matched_league_agent_id: string | null;
  match_confidence: string;
  sentiment_score: number | null;
  descriptors: string[] | null;
}

/** Subject keys: "branch" for the tracked branch, else the competitor / league agent id. */
export const BRANCH_KEY = "branch";

export function toMetricResponses(results: ScanResultRow[], mentions: AgentMentionRow[]): MetricResponse[] {
  const byResult = new Map<string, AgentMentionRow[]>();
  for (const m of mentions) {
    const list = byResult.get(m.scan_result_id) ?? [];
    list.push(m);
    byResult.set(m.scan_result_id, list);
  }
  return results.map((r) => ({
    id: r.id,
    engine: r.engine,
    intentGroup: r.intent_group,
    createdAt: r.created_at,
    promptText: r.prompt_text,
    parsed: r.parse_status === "ok",
    agents: (byResult.get(r.id) ?? []).map(
      (m): ResponseAgent => ({
        subjectKey: m.is_branch ? BRANCH_KEY : (m.matched_competitor_id ?? m.matched_league_agent_id),
        normalisedName: m.normalised_name,
        position: m.position,
        sentimentScore: m.sentiment_score,
        descriptors: m.descriptors ?? [],
        confidence: (m.match_confidence as ResponseAgent["confidence"]) ?? "none",
      }),
    ),
  }));
}

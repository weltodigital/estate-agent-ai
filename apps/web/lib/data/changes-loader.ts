import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CompetitorRow, RecommendationRow } from "./branch-data";
import { computeChanges, type Change, type RunAnswer } from "./changes";
import { fetchAll } from "./paginate";

interface RunRow {
  id: string;
  started_at: string | null;
  created_at: string;
}

async function loadRunAnswers(runId: string): Promise<RunAnswer[]> {
  const supabase = await getSupabaseServerClient();
  const rows = await fetchAll<{
    engine: string;
    prompt_text: string;
    parse_status: string;
    agent_mentions: { is_branch: boolean; matched_competitor_id: string | null; match_confidence: string }[];
  }>((a, b) =>
    supabase
      .from("scan_results")
      .select("engine, prompt_text, parse_status, agent_mentions(is_branch, matched_competitor_id, match_confidence)")
      .eq("scan_run_id", runId)
      .order("id")
      .range(a, b),
  );
  return rows.map((r) => {
    const high = r.agent_mentions.filter((m) => m.match_confidence === "high");
    return {
      engine: r.engine,
      prompt: r.prompt_text,
      parsed: r.parse_status === "ok",
      named: high.some((m) => m.is_branch),
      competitorIds: high.map((m) => m.matched_competitor_id).filter((x): x is string => !!x),
    };
  });
}

/** What changed between the branch's last two finished scans. Null if there's only one. */
export async function loadChanges(
  branchId: string,
  competitors: CompetitorRow[],
  recs: RecommendationRow[],
): Promise<Change[] | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("scan_runs")
    .select("id, started_at, created_at")
    .eq("branch_id", branchId)
    .in("status", ["completed", "budget_exceeded"])
    .order("created_at", { ascending: false })
    .limit(2);
  const runs = (data ?? []) as RunRow[];
  if (runs.length < 2) return null;
  const [latest, previous] = [runs[0]!, runs[1]!];
  const [latestAnswers, previousAnswers] = await Promise.all([loadRunAnswers(latest.id), loadRunAnswers(previous.id)]);
  return computeChanges({
    latest: { startedAt: latest.started_at ?? latest.created_at, answers: latestAnswers },
    previous: { startedAt: previous.started_at ?? previous.created_at, answers: previousAnswers },
    competitors: competitors
      .filter((c) => c.status !== "hidden")
      .map((c) => ({ id: c.id, name: c.name, firstSeenAt: c.first_seen_at })),
    fixesResolved: recs
      .filter((r) => r.verified_result === "resolved" && r.verified_at)
      .map((r) => ({ id: r.id, title: r.title, verifiedAt: r.verified_at! })),
  });
}

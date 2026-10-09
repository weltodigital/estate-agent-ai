// Weekly metric rollups into metrics_weekly, for the trend charts. Recomputes
// every week touched by a run, for the branch and each non-hidden competitor,
// across engine x intent (each plus 'all'), using the same core functions as
// the dashboard.

import {
  BRANCH_KEY,
  computeSubjectMetrics,
  INTENT_GROUPS,
  toMetricResponses,
  weekStart,
  type MetricResponse,
} from "@privett/core";
import { loadBranchData } from "./data";
import { db, fetchAll, must } from "./db";

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function rollupRows(
  responses: MetricResponse[],
  subjects: { kind: "branch" | "competitor"; key: string; id: string }[],
  base: { org_id: string; branch_id: string; week_start: string },
) {
  const engines = ["all", ...new Set(responses.map((r) => r.engine))];
  const intents = ["all", ...INTENT_GROUPS];
  const rows: Record<string, unknown>[] = [];
  const now = new Date().toISOString();
  for (const engine of engines) {
    for (const intent of intents) {
      const filter = { engines: engine === "all" ? undefined : [engine], intentGroups: intent === "all" ? undefined : [intent] };
      for (const s of subjects) {
        const m = computeSubjectMetrics(responses, s.key, { filter });
        if (!m.responses) continue;
        rows.push({
          ...base,
          engine,
          intent_group: intent,
          subject_kind: s.kind,
          subject_id: s.id,
          responses: m.responses,
          mentions: m.mentions,
          visibility: m.visibility,
          avg_position: m.position,
          avg_sentiment: m.sentiment,
          share_of_voice: m.shareOfVoice,
          updated_at: now,
        });
      }
    }
  }
  return rows;
}

export async function updateRollups(branchId: string, orgId: string, runId: string) {
  const runResults = await fetchAll<{ created_at: string }>(
    (from, to) => db().from("scan_results").select("created_at").eq("scan_run_id", runId).range(from, to),
    "select run results",
  );
  const weeks = [...new Set(runResults.map((r) => weekStart(r.created_at)))];
  const competitors = must(await db().from("competitors").select("id").eq("branch_id", branchId).neq("status", "hidden"), "select competitors") as { id: string }[];
  const subjects = [
    { kind: "branch" as const, key: BRANCH_KEY, id: branchId },
    ...competitors.map((c) => ({ kind: "competitor" as const, key: c.id, id: c.id })),
  ];

  for (const week of weeks) {
    const { results, mentions } = await loadBranchData(branchId, `${week}T00:00:00Z`, `${addDays(week, 7)}T00:00:00Z`);
    const rows = rollupRows(toMetricResponses(results, mentions), subjects, { org_id: orgId, branch_id: branchId, week_start: week });
    for (let i = 0; i < rows.length; i += 500) {
      must(
        await db()
          .from("metrics_weekly")
          .upsert(rows.slice(i, i + 500), { onConflict: "branch_id,week_start,engine,intent_group,subject_kind,subject_id" }),
        "upsert metrics_weekly",
      );
    }
  }
}

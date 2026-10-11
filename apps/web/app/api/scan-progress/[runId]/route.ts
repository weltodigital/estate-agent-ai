import { NextResponse, type NextRequest } from "next/server";
import { buildTicker, estimateEtaSeconds, isFinished, perEngineProgress, type ScanProgressPayload } from "@/lib/data/scan-progress";
import { fetchAll } from "@/lib/data/paginate";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;
const NO_STORE = { "cache-control": "no-store" };

/**
 * Live progress for one scan run (UX spec section 4). Allowed for members of
 * the run's organisation, or with the free scan's access token. Returns
 * counts and the agents named so far, never the answers themselves.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!UUID.test(runId) || (token && !UUID.test(token))) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }

  const admin = getSupabaseAdminClient();
  let allowed = false;
  if (token) {
    const { data } = await admin.from("free_scans").select("id").eq("access_token", token).eq("scan_run_id", runId).maybeSingle();
    allowed = !!data;
  } else {
    // RLS decides: the row is only visible to members of the run's org.
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.from("scan_runs").select("id").eq("id", runId).maybeSingle();
    allowed = !!data;
  }
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

  const { data: run } = await admin
    .from("scan_runs")
    .select("status, engines, progress, started_at, finished_at")
    .eq("id", runId)
    .single();
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

  const results = await fetchAll<{ id: string; engine: string; parse_status: string; created_at: string }>((a, b) =>
    admin.from("scan_results").select("id, engine, parse_status, created_at").eq("scan_run_id", runId).order("created_at").range(a, b),
  );
  const doneByEngine = new Map<string, number>();
  for (const r of results) doneByEngine.set(r.engine, (doneByEngine.get(r.engine) ?? 0) + 1);

  const engines = (run.engines as string[]) ?? [];
  const progress = (run.progress ?? {}) as { done?: number; total?: number };
  const total = Math.max(progress.total ?? 0, results.length);
  const done = results.length;

  const recent = results
    .filter((r) => r.parse_status === "ok")
    .slice(-30);
  const { data: mentions } = recent.length
    ? await admin
        .from("agent_mentions")
        .select("scan_result_id, agent_name, position, is_branch, match_confidence")
        .in(
          "scan_result_id",
          recent.map((r) => r.id),
        )
    : { data: [] };

  const finished = isFinished(run.status);
  const payload: ScanProgressPayload = {
    status: run.status,
    engines,
    perEngine: perEngineProgress(engines, total, doneByEngine),
    done,
    total,
    ticker: buildTicker(recent, mentions ?? []),
    startedAt: run.started_at,
    finishedAt: run.finished_at,
    etaSeconds: finished || run.status === "queued" ? null : estimateEtaSeconds({ done, total, startedAt: run.started_at }),
  };
  return NextResponse.json(payload, { headers: NO_STORE });
}

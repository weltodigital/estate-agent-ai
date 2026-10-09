import "server-only";
import { getOrgPlan } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Queue a scan for a branch, enforcing plan limits server-side:
 * paid plan only, one queued/running scan at a time, and the weekly manual
 * scan allowance. Engines, runs and budget come from the plan.
 */
export async function enqueueScan(opts: {
  orgId: string;
  branchId: string;
  kind: "manual" | "scheduled";
}): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const admin = getSupabaseAdminClient();
  const { data: branch } = await admin
    .from("branches")
    .select("id")
    .eq("id", opts.branchId)
    .eq("org_id", opts.orgId)
    .is("archived_at", null)
    .maybeSingle();
  if (!branch) return { ok: false, error: "Branch not found." };

  const plan = await getOrgPlan(opts.orgId);
  if (!plan.paid) return { ok: false, error: "Scans need an active plan." };

  const { count: inFlight } = await admin
    .from("scan_runs")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", opts.branchId)
    .in("status", ["queued", "running"]);
  if ((inFlight ?? 0) > 0) return { ok: false, error: "A scan is already in progress for this branch." };

  if (opts.kind === "manual") {
    const { count: recent } = await admin
      .from("scan_runs")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", opts.branchId)
      .eq("kind", "manual")
      .gte("created_at", new Date(Date.now() - WEEK_MS).toISOString());
    if ((recent ?? 0) >= plan.limits.manualScansPerWeek) {
      return {
        ok: false,
        error: `Your plan includes ${plan.limits.manualScansPerWeek} extra scan${plan.limits.manualScansPerWeek === 1 ? "" : "s"} a week per branch. Weekly scans still run as normal.`,
      };
    }
  }

  const { data: run, error } = await admin
    .from("scan_runs")
    .insert({
      org_id: opts.orgId,
      branch_id: opts.branchId,
      kind: opts.kind,
      engines: plan.limits.engines,
      runs_per_prompt: plan.limits.runsPerPrompt,
      budget_usd: plan.limits.scanBudgetUsd,
    })
    .select("id")
    .single();
  if (error || !run) return { ok: false, error: "Couldn't queue the scan. Please try again." };
  return { ok: true, runId: run.id as string };
}

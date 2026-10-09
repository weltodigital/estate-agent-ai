// Enqueues weekly (plan interval) scans for paid branches.

import { ACTIVE_SUBSCRIPTION_STATUSES, effectiveLimits } from "@privett/core";
import { db, must } from "./db";
import { log } from "./log";

interface Sub {
  org_id: string;
  plan_id: string;
  status: string;
  branch_quantity: number;
}

export async function scheduleDueScans(now = new Date()): Promise<number> {
  const subs = must(
    await db().from("subscriptions").select("org_id, plan_id, status, branch_quantity").in("status", [...ACTIVE_SUBSCRIPTION_STATUSES]),
    "select subscriptions",
  ) as Sub[];
  const byOrg = new Map<string, Sub[]>();
  for (const s of subs) byOrg.set(s.org_id, [...(byOrg.get(s.org_id) ?? []), s]);

  let queued = 0;
  for (const [orgId, orgSubs] of byOrg) {
    const { limits, paid } = effectiveLimits(orgSubs);
    if (!paid) continue;
    // Only as many branches as the plan pays for, oldest first.
    const branches = must(
      await db().from("branches").select("id").eq("org_id", orgId).is("archived_at", null).order("created_at").limit(limits.maxBranches),
      "select branches",
    ) as { id: string }[];
    for (const b of branches) {
      const last = must(
        await db().from("scan_runs").select("status, created_at").eq("branch_id", b.id).neq("kind", "league").order("created_at", { ascending: false }).limit(1),
        "select last scan",
      ) as { status: string; created_at: string }[];
      const latest = last[0];
      if (latest && (latest.status === "queued" || latest.status === "running")) continue;
      const due = !latest || now.getTime() - Date.parse(latest.created_at) >= limits.scanIntervalDays * 24 * 3600 * 1000;
      if (!due) continue;
      must(
        await db().from("scan_runs").insert({
          org_id: orgId,
          branch_id: b.id,
          kind: "scheduled",
          engines: limits.engines,
          runs_per_prompt: limits.runsPerPrompt,
          budget_usd: limits.scanBudgetUsd,
        }),
        "insert scan_run",
      );
      queued++;
    }
  }
  if (queued) log.info("scheduled scans queued", { queued });
  return queued;
}

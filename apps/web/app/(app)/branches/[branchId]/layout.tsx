import { MANUAL_SCAN_WINDOW_DAYS } from "@privett/core";
import type { ReactNode } from "react";
import { BranchHeader } from "@/components/app/branch-header";
import { BranchTabs } from "@/components/app/branch-tabs";
import { requireBranch } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

const WINDOW_MS = MANUAL_SCAN_WINDOW_DAYS * 86_400_000;

export default async function BranchLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const { branch, org, plan } = await requireBranch(branchId);
  const supabase = await getSupabaseServerClient();
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const [{ data: branches }, { data: inFlight }, { data: manual }] = await Promise.all([
    supabase.from("branches").select("id, name, town").eq("org_id", org.id).is("archived_at", null).order("created_at"),
    supabase.from("scan_runs").select("id").eq("branch_id", branch.id).in("status", ["queued", "running"]).limit(1),
    supabase.from("scan_runs").select("created_at").eq("branch_id", branch.id).eq("kind", "manual").gte("created_at", windowStart).order("created_at"),
  ]);

  // Mirrors the checks in enqueueScan, which still decides on the server.
  const allowance = plan.limits.manualScansPerMonth;
  const used = manual?.length ?? 0;
  let blocked: string | null = null;
  if (!plan.paid) blocked = "Scans need an active plan.";
  else if (inFlight?.length) blocked = "A scan is running now.";
  else if (used >= allowance) {
    const next = manual?.[0] ? new Date(new Date(manual[0].created_at).getTime() + WINDOW_MS).toISOString() : null;
    blocked = allowance === 0
      ? "Extra scans come with Pro and Agency."
      : next
        ? `Extra scan used. Next one from ${formatDate(next)}.`
        : "No extra scans on your plan.";
  }
  const hint = !blocked && allowance > 0 ? `${allowance - used} extra scan${allowance - used === 1 ? "" : "s"} left this month` : null;

  return (
    <div className="mx-auto max-w-6xl">
      <BranchHeader
        branch={{ id: branch.id, name: branch.name, town: branch.town }}
        branches={branches ?? []}
        scanBlockedReason={blocked}
        scanHint={hint}
      />
      <BranchTabs branchId={branch.id} />
      {children}
    </div>
  );
}

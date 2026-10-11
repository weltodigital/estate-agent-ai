"use server";

import { revalidatePath } from "next/cache";
import { requireBranch } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STATUSES = ["discovered", "pinned", "hidden"] as const;
export type CompetitorStatus = (typeof STATUSES)[number];

export async function updateCompetitorStatus(
  branchId: string,
  competitorId: string,
  status: CompetitorStatus,
): Promise<{ ok: true } | { error: string }> {
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Unknown status." };
  const { branch } = await requireBranch(branchId);
  const supabase = await getSupabaseServerClient();
  // RLS limits the update to the user's organisation.
  const { error, count } = await supabase
    .from("competitors")
    .update({ status }, { count: "exact" })
    .eq("id", competitorId)
    .eq("branch_id", branch.id);
  if (error || !count) return { error: "We couldn’t save that change. Please try again." };
  revalidatePath(`/branches/${branch.id}`, "layout");
  return { ok: true };
}

/** Form version, kept for no-JS use. */
export async function setCompetitorStatus(formData: FormData) {
  await updateCompetitorStatus(
    String(formData.get("branch_id") ?? ""),
    String(formData.get("competitor_id") ?? ""),
    String(formData.get("status") ?? "") as CompetitorStatus,
  );
}

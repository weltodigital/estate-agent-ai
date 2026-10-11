"use server";

import { revalidatePath } from "next/cache";
import { requireBranch } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STATUSES = ["todo", "done", "dismissed"] as const;
export type FixStatus = (typeof STATUSES)[number];

/** Used by the optimistic Fixes board; returns an error instead of throwing. */
export async function updateRecommendationStatus(branchId: string, id: string, status: FixStatus): Promise<{ ok: true } | { error: string }> {
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Unknown status." };
  const { branch } = await requireBranch(branchId);
  const supabase = await getSupabaseServerClient();
  // Only status changes; a database trigger sets completed_at and clears any
  // previous re-check result, so the next scan re-checks the signal.
  const { error, count } = await supabase
    .from("recommendations")
    .update({ status }, { count: "exact" })
    .eq("id", id)
    .eq("branch_id", branch.id);
  if (error || !count) return { error: "We couldn’t save that change. Please try again." };
  revalidatePath(`/branches/${branch.id}`, "layout");
  return { ok: true };
}

/** Form version, kept for links and no-JS use. */
export async function setRecommendationStatus(formData: FormData) {
  await updateRecommendationStatus(
    String(formData.get("branch_id") ?? ""),
    String(formData.get("recommendation_id") ?? ""),
    String(formData.get("status") ?? "") as FixStatus,
  );
}

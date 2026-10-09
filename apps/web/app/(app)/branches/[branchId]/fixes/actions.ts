"use server";

import { revalidatePath } from "next/cache";
import { requireBranch } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STATUSES = ["todo", "done", "dismissed"] as const;

export async function setRecommendationStatus(formData: FormData) {
  const branchId = String(formData.get("branch_id") ?? "");
  const id = String(formData.get("recommendation_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(STATUSES as readonly string[]).includes(status)) return;
  const { branch } = await requireBranch(branchId);
  const supabase = await getSupabaseServerClient();
  // Only status changes; a database trigger sets completed_at and clears any
  // previous re-check result, so the next scan re-checks the signal.
  await supabase.from("recommendations").update({ status }).eq("id", id).eq("branch_id", branch.id);
  revalidatePath(`/branches/${branch.id}`, "layout");
}

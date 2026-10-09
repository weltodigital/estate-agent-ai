"use server";

import { revalidatePath } from "next/cache";
import { requireBranch } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STATUSES = ["discovered", "pinned", "hidden"] as const;

export async function setCompetitorStatus(formData: FormData) {
  const branchId = String(formData.get("branch_id") ?? "");
  const competitorId = String(formData.get("competitor_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(STATUSES as readonly string[]).includes(status)) return;
  const { branch } = await requireBranch(branchId);
  const supabase = await getSupabaseServerClient();
  // RLS limits the update to the user's organisation.
  await supabase.from("competitors").update({ status }).eq("id", competitorId).eq("branch_id", branch.id);
  revalidatePath(`/branches/${branch.id}`, "layout");
}

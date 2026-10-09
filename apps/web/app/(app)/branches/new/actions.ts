"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/platform/action-form";
import { requireOrg } from "@/lib/auth";
import { countActiveBranches } from "@/lib/billing";
import { createBranchWithPrompts, normaliseWebsite, splitList } from "@/lib/branches";
import { enqueueScan } from "@/lib/scans";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createBranch(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!ctx.plan.paid) return { error: "Tracking a branch needs an active plan." };
  if ((await countActiveBranches(ctx.org.id)) >= ctx.plan.limits.maxBranches) {
    return { error: "You've used every branch on your plan." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const town = String(formData.get("town") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  if (!name || !town) return { error: "Branch name and town are required." };
  if (website && !normaliseWebsite(website).domain) return { error: "That website address doesn't look right." };

  let branchId: string;
  try {
    ({ branchId } = await createBranchWithPrompts(getSupabaseAdminClient(), {
      orgId: ctx.org.id,
      name: name.slice(0, 120),
      aliases: splitList(formData.get("aliases")).slice(0, 10),
      website: website || null,
      town: town.slice(0, 80),
      areas: splitList(formData.get("areas")).slice(0, 10),
      postcode: String(formData.get("postcode") ?? "").trim().toUpperCase() || null,
      promptLimit: ctx.plan.limits.promptsPerBranch,
    }));
  } catch (err) {
    console.error("createBranch failed", err);
    return { error: "Couldn't save the branch. Please try again." };
  }

  // First scan is the regular kind so it doesn't use the weekly manual allowance.
  const queued = await enqueueScan({ orgId: ctx.org.id, branchId, kind: "scheduled" });
  if (!queued.ok) console.error("first scan not queued", queued.error);
  redirect(`/branches/${branchId}`);
}

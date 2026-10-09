"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/platform/action-form";
import { ORG_COOKIE, requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function createOrganisation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Please enter your agency's name." };
  const supabase = await getSupabaseServerClient();
  const { data: orgId, error } = await supabase.rpc("create_organisation", { org_name: name.slice(0, 120) });
  if (error || !orgId) return { error: "Couldn't create your organisation. Please try again." };
  (await cookies()).set(ORG_COOKIE, String(orgId), { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/settings/billing?welcome=1");
}

export async function claimFreeScan(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("free_scan_id") ?? "");
  const admin = getSupabaseAdminClient();
  const { data: scan } = await admin
    .from("free_scans")
    .select("id, email, org_id, branch_id, claimed_by")
    .eq("id", id)
    .maybeSingle();
  // The signed-in email is verified (magic link or Google), so a match proves ownership.
  if (!scan || scan.claimed_by || !scan.org_id || scan.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { error: "That scan can't be claimed." };
  }
  const { data: org } = await admin.from("organisations").select("claimed").eq("id", scan.org_id).maybeSingle();
  if (!org || org.claimed) return { error: "That scan has already been claimed." };

  const { error } = await admin
    .from("organisation_members")
    .insert({ org_id: scan.org_id, user_id: user.id, role: "owner" });
  if (error) return { error: "Couldn't claim the scan. Please try again." };
  await admin.from("organisations").update({ claimed: true }).eq("id", scan.org_id);
  await admin.from("free_scans").update({ claimed_by: user.id }).eq("id", scan.id);

  (await cookies()).set(ORG_COOKIE, scan.org_id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/settings/billing?welcome=1");
}

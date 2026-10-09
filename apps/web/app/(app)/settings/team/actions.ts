"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/platform/action-form";
import { requireOrg } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function inviteMember(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (ctx.role !== "owner") return { error: "Only an owner can invite colleagues." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  const role = formData.get("role") === "owner" ? "owner" : "member";
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("organisation_invites")
    .insert({ org_id: ctx.org.id, email, role, invited_by: ctx.user.id });
  if (error) return { error: "Couldn't create the invite. Please try again." };
  revalidatePath("/settings/team");
  return { ok: "Invite created. Copy the link below and send it to your colleague." };
}

export async function revokeInvite(formData: FormData) {
  const ctx = await requireOrg();
  const supabase = await getSupabaseServerClient();
  await supabase.from("organisation_invites").delete().eq("id", String(formData.get("invite_id"))).eq("org_id", ctx.org.id);
  revalidatePath("/settings/team");
}

export async function removeMember(formData: FormData) {
  const ctx = await requireOrg();
  const supabase = await getSupabaseServerClient();
  // RLS: owners only, and never yourself.
  await supabase
    .from("organisation_members")
    .delete()
    .eq("org_id", ctx.org.id)
    .eq("user_id", String(formData.get("user_id")));
  revalidatePath("/settings/team");
}

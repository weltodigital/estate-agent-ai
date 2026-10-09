"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, ORG_COOKIE } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/accept-invite/${token}`)}`);

  const admin = getSupabaseAdminClient();
  const { data: invite } = await admin
    .from("organisation_invites")
    .select("id, org_id, email, role, accepted_at")
    .eq("token", token)
    .maybeSingle();
  // The address must match: the invite link alone isn't proof of identity.
  if (!invite || invite.accepted_at || invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    redirect(`/accept-invite/${token}`);
  }

  await admin
    .from("organisation_members")
    .upsert({ org_id: invite.org_id, user_id: user.id, role: invite.role }, { onConflict: "org_id,user_id", ignoreDuplicates: true });
  await admin.from("organisation_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  (await cookies()).set(ORG_COOKIE, invite.org_id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}

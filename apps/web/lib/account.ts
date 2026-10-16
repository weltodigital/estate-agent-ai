import "server-only";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { planAccountDeletion, type Membership } from "@/lib/account-plan";

/**
 * Deletes an organisation and everything scoped to it (branches, scans,
 * answers, fixes, referrals, invites; all cascade). Stripe subscriptions are
 * cancelled first so nobody is charged for a deleted account. Stripe keeps
 * the customer and invoices: we need those for accounting records.
 * Caller must have checked the user is an owner of this org.
 */
export async function deleteOrganisation(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("org_id", orgId);
  if (error) throw error;
  for (const s of subs ?? []) {
    if (s.status === "canceled" || s.status === "incomplete_expired") continue;
    try {
      await getStripe().subscriptions.cancel(s.stripe_subscription_id);
    } catch (err) {
      // Already gone in Stripe: nothing left to cancel.
      if ((err as { code?: string }).code !== "resource_missing") throw err;
    }
  }
  // Free scans hold the email of whoever ran them; the org link alone would
  // only be nulled, so remove them explicitly.
  const { error: fsError } = await admin.from("free_scans").delete().eq("org_id", orgId);
  if (fsError) throw fsError;
  const { error: orgError } = await admin.from("organisations").delete().eq("id", orgId);
  if (orgError) throw orgError;
}

/** The signed-in user's memberships with enough detail to plan a deletion. */
export async function loadMemberships(userId: string): Promise<Membership[]> {
  const admin = getSupabaseAdminClient();
  const { data: mine, error } = await admin
    .from("organisation_members")
    .select("org_id, role, organisations(name, is_demo)")
    .eq("user_id", userId);
  if (error) throw error;
  const orgIds = (mine ?? []).map((m) => m.org_id as string);
  const { data: all, error: allError } = orgIds.length
    ? await admin.from("organisation_members").select("org_id, user_id, role").in("org_id", orgIds)
    : { data: [], error: null };
  if (allError) throw allError;
  return (mine ?? [])
    .filter((m) => !(m.organisations as unknown as { is_demo?: boolean } | null)?.is_demo)
    .map((m) => {
      const others = (all ?? []).filter((r) => r.org_id === m.org_id && r.user_id !== userId);
      return {
        orgId: m.org_id as string,
        orgName: (m.organisations as unknown as { name: string } | null)?.name ?? "",
        role: m.role as "owner" | "member",
        otherMembers: others.length,
        otherOwners: others.filter((r) => r.role === "owner").length,
      };
    });
}

/**
 * Deletes the user's sign-in, profile and memberships, any organisation they
 * are the only member of, and free scans run with their email address.
 * Refuses when they're the last owner of an organisation others still use.
 */
export async function deleteAccount(user: { id: string; email: string }): Promise<{ error?: string }> {
  const plan = planAccountDeletion(await loadMemberships(user.id));
  if (plan.blockedBy.length) {
    return {
      error: `Make someone else an owner of ${plan.blockedBy.map((m) => m.orgName).join(", ")} first, or remove the other members.`,
    };
  }
  for (const orgId of plan.deleteOrgs) await deleteOrganisation(orgId);

  const admin = getSupabaseAdminClient();
  if (user.email) {
    const { error } = await admin.from("free_scans").delete().eq("email", user.email.toLowerCase());
    if (error) throw error;
  }
  // Cascades to profiles and organisation_members.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return {};
}

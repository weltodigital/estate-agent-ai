import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { effectiveLimits, type PlanId, type PlanLimits } from "@privett/core";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const ORG_COOKIE = "privett_org";

export async function getUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export interface OrgContext {
  user: { id: string; email: string };
  org: { id: string; name: string; stripe_customer_id: string | null };
  role: "owner" | "member";
  isAdmin: boolean;
  plan: { planId: PlanId; limits: PlanLimits; paid: boolean };
  memberships: { org_id: string; name: string; role: "owner" | "member" }[];
}

/**
 * The signed-in user's current organisation. Users in several orgs pick one
 * (stored in a cookie); otherwise the first. No org yet -> onboarding.
 */
export async function requireOrg(): Promise<OrgContext> {
  const user = await requireUser();
  const supabase = await getSupabaseServerClient();
  const { data: rows } = await supabase
    .from("organisation_members")
    .select("org_id, role, organisations(id, name, stripe_customer_id)")
    .eq("user_id", user.id);
  const memberships = (rows ?? []).map((r) => {
    const o = r.organisations as unknown as { id: string; name: string; stripe_customer_id: string | null };
    return { org_id: r.org_id as string, role: r.role as "owner" | "member", org: o };
  });
  if (!memberships.length) redirect("/onboarding");

  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const current = memberships.find((m) => m.org_id === wanted) ?? memberships[0]!;

  const [{ data: profile }, plan] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    getOrgPlan(current.org_id),
  ]);

  return {
    user: { id: user.id, email: user.email ?? "" },
    org: current.org,
    role: current.role,
    isAdmin: !!profile?.is_admin,
    plan,
    memberships: memberships.map((m) => ({ org_id: m.org_id, name: m.org.name, role: m.role })),
  };
}

export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!data?.is_admin) redirect("/dashboard");
  return user;
}

/** Plan limits from the org's Stripe subscriptions. Server-side source of truth. */
export async function getOrgPlan(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data: subs } = await admin
    .from("subscriptions")
    .select("plan_id, status, branch_quantity")
    .eq("org_id", orgId);
  return effectiveLimits(subs ?? []);
}

/** Loads a branch the current user can see, or 404s. */
export async function requireBranch(branchId: string) {
  const ctx = await requireOrg();
  const supabase = await getSupabaseServerClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("*")
    .eq("id", branchId)
    .eq("org_id", ctx.org.id)
    .is("archived_at", null)
    .maybeSingle();
  if (!branch) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return { ...ctx, branch: branch as BranchRow };
}

export interface BranchRow {
  id: string;
  org_id: string;
  name: string;
  aliases: string[];
  website: string | null;
  domain: string | null;
  town: string;
  areas: string[];
  postcode: string | null;
  place_id: string | null;
  tracking_key: string;
  archived_at: string | null;
  created_at: string;
}

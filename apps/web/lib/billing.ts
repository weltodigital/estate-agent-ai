import "server-only";
import { getPlans, type PlanId } from "@privett/core";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Display labels. Stripe is the source of truth for what's charged; these
 * defaults match the Stripe prices and can be overridden by env without code.
 */
export function priceLabel(planId: PlanId): string {
  const labels: Record<PlanId, string> = {
    free: "Free",
    starter: process.env.NEXT_PUBLIC_PRICE_STARTER_LABEL || "£39 / month",
    pro: process.env.NEXT_PUBLIC_PRICE_PRO_LABEL || "£99 / month",
    agency: process.env.NEXT_PUBLIC_PRICE_AGENCY_LABEL || "£79 per branch / month",
  };
  return labels[planId];
}

export function purchasablePlans() {
  return Object.values(getPlans()).filter((p) => p.id !== "free");
}

export async function countActiveBranches(orgId: string): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { count } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("archived_at", null);
  return count ?? 0;
}

export async function getOrgSubscriptions(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

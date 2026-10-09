import "server-only";
import { getPlans, type PlanId } from "@privett/core";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** Price labels are config: prices are set in Stripe and may change. */
export function priceLabel(planId: PlanId): string {
  const env: Record<PlanId, string | undefined> = {
    free: "Free",
    pro: process.env.NEXT_PUBLIC_PRICE_PRO_LABEL,
    multi: process.env.NEXT_PUBLIC_PRICE_MULTI_LABEL,
  };
  return env[planId] || "Pricing on request";
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

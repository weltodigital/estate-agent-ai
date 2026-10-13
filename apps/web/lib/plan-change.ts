import "server-only";
import { getPlans, type PlanBranch, type PlanId, type PlanLimits } from "@privett/core";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** The organisation's active branches with their questions, oldest first (the order scans keep them in). */
export async function loadPlanBranches(orgId: string): Promise<PlanBranch[]> {
  const admin = getSupabaseAdminClient();
  const { data: branches } = await admin
    .from("branches")
    .select("id, name, areas")
    .eq("org_id", orgId)
    .is("archived_at", null)
    .order("created_at");
  if (!branches?.length) return [];
  const { data: prompts } = await admin
    .from("branch_prompts")
    .select("id, branch_id, text, area, active")
    .in("branch_id", branches.map((b) => b.id))
    .order("created_at");
  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    areas: b.areas ?? [],
    prompts: (prompts ?? []).filter((p) => p.branch_id === b.id).map(({ id, text, area, active }) => ({ id, text, area, active })),
  }));
}

/** A plan's limits at a given branch count (Agency is per branch). */
export function limitsFor(planId: Exclude<PlanId, "free">, branches: number): PlanLimits {
  const plan = getPlans()[planId];
  return {
    ...plan.limits,
    maxBranches: plan.perBranch && plan.limits.maxBranches > 1 ? Math.min(Math.max(branches, plan.limits.minBranches), plan.limits.maxBranches) : plan.limits.maxBranches,
  };
}

export interface PendingChange {
  planId: PlanId | null;
  quantity: number;
  from: string;
}

/**
 * The live Stripe subscription: its item (needed to switch price) and any
 * change already scheduled for the end of the period. Null if Stripe is
 * unreachable; the pages still work without it.
 */
export async function loadStripeSubscription(subscriptionId: string): Promise<{ itemId: string; pending: PendingChange | null } | null> {
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["schedule"] });
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return null;
    let pending: PendingChange | null = null;
    const schedule = typeof sub.schedule === "object" ? sub.schedule : null;
    const now = Date.now() / 1000;
    const next = schedule?.phases.find((p) => p.start_date > now);
    const item = next?.items[0];
    if (next && item) {
      const priceId = typeof item.price === "string" ? item.price : item.price.id;
      const planId = (Object.values(getPlans()).find((p) => p.stripePriceId === priceId)?.id ?? null) as PlanId | null;
      pending = { planId, quantity: item.quantity ?? 1, from: new Date(next.start_date * 1000).toISOString() };
    }
    return { itemId, pending };
  } catch (err) {
    console.error("couldn't load the Stripe subscription", err);
    return null;
  }
}

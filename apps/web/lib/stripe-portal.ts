import "server-only";
import type Stripe from "stripe";
import { getPlans } from "@privett/core";
import { getStripe } from "@/lib/stripe";

// Privett's own Stripe customer-portal configuration, defined in code rather
// than clicked together in the dashboard: plan switching between Starter, Pro
// and Agency, branch count on Agency only (minimum 2), downgrades at the end of
// the billing period, upgrades prorated, plus card, invoices and cancel at
// period end. It's created once per set of prices and found again by its
// metadata key, so changing a Stripe price id creates a fresh configuration.
const VERSION = "v1";
let cached: { key: string; id: string } | null = null;

export async function getPortalConfigurationId(): Promise<string | undefined> {
  const plans = getPlans();
  const paid = [plans.starter, plans.pro, plans.agency].filter((p) => p.stripePriceId);
  if (!paid.length) return undefined;
  const key = `privett-${VERSION}-${paid.map((p) => p.stripePriceId).join("-")}`.slice(0, 480);
  if (cached?.key === key) return cached.id;

  const stripe = getStripe();
  for await (const c of stripe.billingPortal.configurations.list({ active: true, limit: 100 })) {
    if (c.metadata?.privett_key === key) {
      cached = { key, id: c.id };
      return c.id;
    }
  }

  const products: Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.Product[] = [];
  for (const p of paid) {
    const price = await stripe.prices.retrieve(p.stripePriceId!);
    const product = typeof price.product === "string" ? price.product : price.product.id;
    products.push({
      product,
      prices: [price.id],
      adjustable_quantity:
        p.limits.maxBranches > 1
          ? { enabled: true, minimum: p.limits.minBranches, maximum: p.limits.maxBranches }
          : { enabled: false },
    });
  }

  const config = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Privett: manage your plan, branches and billing" },
    metadata: { privett_key: key },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "tax_id"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price", "quantity"],
        products,
        proration_behavior: "create_prorations",
        // Downgrades (a lower bill) wait until renewal; upgrades apply now.
        schedule_at_period_end: { conditions: [{ type: "decreasing_item_amount" }] },
      },
    },
  });
  cached = { key, id: config.id };
  return config.id;
}

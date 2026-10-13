import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getPlans } from "@privett/core";
import { loadStripeSubscription } from "@/lib/plan-change";
import { getPortalConfigurationId } from "@/lib/stripe-portal";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Opens the Stripe customer portal, optionally straight at one screen:
 * `flow=confirm` with `plan_id` and `quantity` (a plan chosen on our
 * change-plan page, so Stripe only asks to confirm), `flow=update` (Stripe's
 * own plan picker), `flow=payment` (card) or `flow=cancel`. If Stripe can't open that screen, the normal portal opens
 * (it also lists invoices).
 */
export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (ctx.role !== "owner" || !ctx.org.stripe_customer_id) {
    return NextResponse.redirect(appUrl("/settings/billing?error=portal"), 303);
  }
  const form = await request.formData().catch(() => null);
  const flow = form?.get("flow");
  const returnTo = String(form?.get("return_to") ?? "/settings/billing");
  const return_url = appUrl(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/settings/billing");
  const stripe = getStripe();
  // Our own portal setup (plans, branch counts, downgrade timing). If Stripe
  // rejects it, fall back to the account's default portal.
  const configuration = await getPortalConfigurationId().catch((err) => {
    console.error("portal configuration unavailable", err);
    return undefined;
  });

  if (flow === "payment") {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: ctx.org.stripe_customer_id,
        configuration,
        return_url,
        flow_data: { type: "payment_method_update" },
      });
      return NextResponse.redirect(session.url, 303);
    } catch (err) {
      console.error("portal payment flow unavailable, opening the portal instead", err);
    }
  }

  if (flow === "update" || flow === "cancel" || flow === "confirm") {
    const { data: sub } = await getSupabaseAdminClient()
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("org_id", ctx.org.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub?.stripe_subscription_id && flow === "confirm") {
      const plan = getPlans()[String(form?.get("plan_id")) as "starter" | "pro" | "agency"];
      const stripeSub = await loadStripeSubscription(sub.stripe_subscription_id);
      if (plan?.stripePriceId && plan.id !== "free" && stripeSub) {
        const multi = plan.limits.maxBranches > 1;
        const quantity = multi
          ? Math.min(Math.max(Number(form?.get("quantity")) || plan.limits.minBranches, plan.limits.minBranches), plan.limits.maxBranches)
          : 1;
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: ctx.org.stripe_customer_id,
            configuration,
            return_url,
            flow_data: {
              type: "subscription_update_confirm",
              subscription_update_confirm: {
                subscription: sub.stripe_subscription_id,
                items: [{ id: stripeSub.itemId, price: plan.stripePriceId, quantity }],
              },
              after_completion: { type: "redirect", redirect: { return_url: appUrl("/settings/billing?checkout=changed") } },
            },
          });
          return NextResponse.redirect(session.url, 303);
        } catch (err) {
          console.error("portal confirm flow unavailable, opening the plan picker instead", err);
        }
      }
    }
    if (sub?.stripe_subscription_id) {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: ctx.org.stripe_customer_id,
          configuration,
          return_url,
          flow_data:
            flow === "cancel"
              ? { type: "subscription_cancel", subscription_cancel: { subscription: sub.stripe_subscription_id } }
              : { type: "subscription_update", subscription_update: { subscription: sub.stripe_subscription_id } },
        });
        return NextResponse.redirect(session.url, 303);
      } catch (err) {
        console.error("portal update flow unavailable, opening the portal instead", err);
      }
    }
  }

  const session = await stripe.billingPortal.sessions.create({ customer: ctx.org.stripe_customer_id, configuration, return_url });
  return NextResponse.redirect(session.url, 303);
}

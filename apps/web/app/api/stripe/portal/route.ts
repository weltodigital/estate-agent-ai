import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Opens the Stripe customer portal. With `flow=update` it goes straight to
 * the plan / branch-count screen for the current subscription (used by "Add
 * a branch"); if Stripe can't open that screen, the normal portal opens.
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

  if (flow === "update") {
    const { data: sub } = await getSupabaseAdminClient()
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("org_id", ctx.org.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub?.stripe_subscription_id) {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: ctx.org.stripe_customer_id,
          return_url,
          flow_data: { type: "subscription_update", subscription_update: { subscription: sub.stripe_subscription_id } },
        });
        return NextResponse.redirect(session.url, 303);
      } catch (err) {
        console.error("portal update flow unavailable, opening the portal instead", err);
      }
    }
  }

  const session = await stripe.billingPortal.sessions.create({ customer: ctx.org.stripe_customer_id, return_url });
  return NextResponse.redirect(session.url, 303);
}

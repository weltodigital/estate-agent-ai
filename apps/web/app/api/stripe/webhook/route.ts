import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { planForPriceId } from "@privett/core";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Mirrors Stripe subscriptions into public.subscriptions. Idempotent. */
async function syncSubscription(sub: Stripe.Subscription) {
  const admin = getSupabaseAdminClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  let orgId = sub.metadata?.org_id ?? null;
  if (!orgId) {
    const { data } = await admin.from("organisations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    orgId = data?.id ?? null;
  }
  if (!orgId) {
    console.error(`stripe webhook: no organisation for subscription ${sub.id}`);
    return;
  }

  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const planId = planForPriceId(priceId) ?? sub.metadata?.plan_id ?? null;
  if (!planId) {
    console.error(`stripe webhook: unknown price ${priceId} on ${sub.id}`);
    return;
  }
  // Newer API versions moved current_period_end onto subscription items;
  // older ones have it on the subscription. Accept either.
  const periodEnd =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null;

  const { error } = await admin.from("subscriptions").upsert(
    {
      org_id: orgId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      plan_id: planId,
      status: sub.status,
      branch_quantity: item?.quantity ?? 1,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const stripe = getStripe();
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("stripe webhook: bad signature", err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncSubscription(await stripe.subscriptions.retrieve(subId));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`stripe webhook: failed handling ${event.type}`, err);
    // 500 so Stripe retries.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

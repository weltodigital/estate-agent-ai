import type { FastifyRequest } from "fastify";
import type Stripe from "stripe";
import type { SubscriptionTier, UsageEventType } from "@app/shared/constants";
import { TIER_LIMITS, USAGE_EVENT_TYPES } from "@app/shared/constants";
import type {
  BillingStatusResponse,
  BillingUsage,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PortalSessionRequest,
  PortalSessionResponse,
} from "@app/shared/schemas";
import { AppError, notFound, unauthorised } from "../errors.js";
import { loadEnv } from "../env.js";
import {
  StripeNotConfiguredError,
  getStripe,
  priceIdForTier,
  tierForPriceId,
} from "../integrations/stripe.js";
import { getServiceClient, getUserClient } from "../integrations/supabase.js";

type AgencyBillingRow = {
  id: string;
  name: string;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
};

/**
 * Called from the agency bootstrap flow (services/auth.ts). Creates the
 * Stripe customer + starter-tier subscription with the configured trial
 * period and persists the ids on the agency row. Skips cleanly if Stripe
 * isn't configured — the agency still exists, just without billing wired.
 */
export async function startTrialSubscription(args: {
  agencyId: string;
  agencyName: string;
  adminEmail: string;
  adminFullName: string;
}): Promise<void> {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      console.warn(
        "startTrialSubscription: STRIPE_SECRET_KEY not set; agency created without Stripe.",
      );
      return;
    }
    throw err;
  }

  const env = loadEnv();
  const starterPrice = priceIdForTier("starter");
  if (!starterPrice) {
    console.warn("startTrialSubscription: STRIPE_PRICE_STARTER not set; skipping subscription.");
    return;
  }

  const customer = await stripe.customers.create({
    name: args.agencyName,
    email: args.adminEmail,
    metadata: { agency_id: args.agencyId, admin_full_name: args.adminFullName },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: starterPrice }],
    trial_period_days: env.STRIPE_TRIAL_DAYS,
    metadata: { agency_id: args.agencyId },
  });

  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const supabase = getServiceClient();
  await supabase
    .from("agencies")
    .update({
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", args.agencyId);
}

export async function createCheckoutSession(
  request: FastifyRequest,
  payload: CheckoutSessionRequest,
): Promise<CheckoutSessionResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const stripe = getStripe();

  const agency = await loadAgencyBilling(request);
  const price = priceIdForTier(payload.tier);
  if (!price) {
    throw new AppError({
      status: 400,
      code: "tier_not_configured",
      message: "That tier isn't available on this environment.",
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: agency.stripe_customer_id ?? undefined,
    customer_email: agency.stripe_customer_id ? undefined : request.user.email,
    line_items: [{ price, quantity: 1 }],
    success_url: payload.success_url,
    cancel_url: payload.cancel_url,
    client_reference_id: agency.id,
    metadata: { agency_id: agency.id, tier: payload.tier },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new AppError({
      status: 502,
      code: "checkout_no_url",
      message: "Stripe did not return a checkout URL.",
    });
  }
  return { url: session.url };
}

export async function createPortalSession(
  request: FastifyRequest,
  payload: PortalSessionRequest,
): Promise<PortalSessionResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const stripe = getStripe();

  const agency = await loadAgencyBilling(request);
  if (!agency.stripe_customer_id) {
    throw new AppError({
      status: 400,
      code: "no_stripe_customer",
      message: "This agency does not have a Stripe customer yet.",
    });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: agency.stripe_customer_id,
    return_url: payload.return_url,
  });
  return { url: session.url };
}

export async function getBillingStatus(request: FastifyRequest): Promise<BillingStatusResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const agency = await loadAgencyBilling(request);
  const supabase = getUserClient(request.user.accessToken);

  const periodStart = startOfMonth();
  const { data: events, error } = await supabase
    .from("usage_events")
    .select("event_type, units_consumed")
    .gte("created_at", periodStart.toISOString());
  if (error) {
    throw new AppError({
      status: 500,
      code: "usage_lookup_failed",
      message: "Could not load usage.",
    });
  }

  const usage = aggregateUsage(
    (events ?? []) as { event_type: UsageEventType; units_consumed: number }[],
    agency.subscription_tier,
  );

  return {
    subscription_tier: agency.subscription_tier,
    trial_ends_at: agency.trial_ends_at,
    stripe_customer_id: agency.stripe_customer_id,
    stripe_subscription_id: agency.stripe_subscription_id,
    period_start: periodStart.toISOString(),
    usage,
  };
}

/**
 * Idempotent webhook event application. The caller has already recorded the
 * event_id in stripe_processed_events (or detected a duplicate); this just
 * mutates the agency row from the event payload.
 */
export async function applyStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscriptionRow(sub);
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const supabase = getServiceClient();
      await supabase
        .from("agencies")
        .update({
          // Cancellation drops back to the entry tier; the next checkout
          // promotes them again.
          subscription_tier: "starter",
          stripe_subscription_id: null,
          trial_ends_at: null,
        })
        .eq("stripe_subscription_id", sub.id);
      return;
    }
    case "checkout.session.completed": {
      // The subsequent customer.subscription.updated event carries the
      // canonical tier; nothing to do here for v1.
      return;
    }
    default:
      // Unknown event types are recorded as processed but otherwise ignored.
      return;
  }
}

async function syncSubscriptionRow(sub: Stripe.Subscription): Promise<void> {
  const supabase = getServiceClient();
  const priceId = sub.items.data[0]?.price.id;
  const tier = tierForPriceId(priceId);
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
  const update: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    trial_ends_at: trialEnd,
  };
  if (tier) update.subscription_tier = tier;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await supabase.from("agencies").update(update).eq("stripe_customer_id", customerId);
}

async function loadAgencyBilling(request: FastifyRequest): Promise<AgencyBillingRow> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("agencies")
    .select(
      "id, name, subscription_tier, stripe_customer_id, stripe_subscription_id, trial_ends_at",
    )
    .eq("id", request.agencyId)
    .maybeSingle<AgencyBillingRow>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "agency_lookup_failed",
      message: "Could not load agency billing info.",
    });
  }
  if (!data) throw notFound("Agency");
  return data;
}

function startOfMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function aggregateUsage(
  events: { event_type: UsageEventType; units_consumed: number }[],
  tier: SubscriptionTier,
): BillingUsage[] {
  const counts = new Map<UsageEventType, number>();
  for (const e of events) {
    counts.set(e.event_type, (counts.get(e.event_type) ?? 0) + e.units_consumed);
  }
  return USAGE_EVENT_TYPES.map((event_type) => ({
    event_type,
    used: counts.get(event_type) ?? 0,
    limit: TIER_LIMITS[tier][event_type],
  }));
}

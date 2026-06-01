import Stripe from "stripe";
import type { SubscriptionTier } from "@app/shared/constants";
import { loadEnv } from "../env.js";

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured on this environment.");
    this.name = "StripeNotConfiguredError";
  }
}

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    const env = loadEnv();
    if (!env.STRIPE_SECRET_KEY) throw new StripeNotConfiguredError();
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      // Pin the API version explicitly so library bumps don't shift behaviour.
      apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
    });
  }
  return client;
}

/**
 * Maps a tier to the configured Stripe price id. Returns null if unset — the
 * caller decides whether to fall back to a stub or surface a config error.
 */
export function priceIdForTier(tier: SubscriptionTier): string | null {
  const env = loadEnv();
  switch (tier) {
    case "starter":
      return env.STRIPE_PRICE_STARTER ?? null;
    case "pro":
      return env.STRIPE_PRICE_PRO ?? null;
    case "business":
      return env.STRIPE_PRICE_BUSINESS ?? null;
    case "agency":
      return env.STRIPE_PRICE_AGENCY ?? null;
  }
}

export function tierForPriceId(priceId: string | null | undefined): SubscriptionTier | null {
  if (!priceId) return null;
  const env = loadEnv();
  if (priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_BUSINESS) return "business";
  if (priceId === env.STRIPE_PRICE_AGENCY) return "agency";
  return null;
}

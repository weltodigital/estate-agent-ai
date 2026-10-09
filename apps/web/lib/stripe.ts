import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily constructed so builds without Stripe env vars still succeed. */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    // No apiVersion pin: the SDK uses the version it was generated against.
    client = new Stripe(key);
  }
  return client;
}

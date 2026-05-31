import type { FastifyInstance } from "fastify";
import { notImplemented } from "../errors.js";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Stripe webhooks need the raw body for signature verification. The route is
  // a stub — when implemented, register a content-type parser for
  // 'application/json' that preserves the raw body for `stripe.webhooks.constructEvent`.
  app.post("/stripe", async () => {
    throw notImplemented("POST /v1/webhooks/stripe");
  });
}

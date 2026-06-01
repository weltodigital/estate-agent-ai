import type { FastifyInstance } from "fastify";
import {
  floorPlanParsedCallbackSchema,
  photoEnhancedCallbackSchema,
  photoStagedCallbackSchema,
} from "@app/shared/schemas";
import { AppError, unauthorised } from "../errors.js";
import { loadEnv } from "../env.js";
import { verifySignature } from "../integrations/hmac.js";
import { StripeNotConfiguredError, getStripe } from "../integrations/stripe.js";
import { getServiceClient } from "../integrations/supabase.js";
import { applyStripeEvent } from "../services/billing.js";
import { applyEnhanceCallback } from "../services/photo-enhancements.js";
import { applyStagingCallback } from "../services/staging.js";
import { applyParseCallback } from "../services/floor-plans.js";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Plugin-scoped JSON parser. Hands us the raw Buffer so signature
  // verification doesn't depend on serialiser output matching byte-for-byte.
  // Encapsulated to this plugin instance — non-webhook routes keep Fastify's
  // default parser.
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  const verifyOrchestrator = (request: {
    body?: unknown;
    headers: Record<string, unknown>;
  }): string => {
    const buffer = request.body as Buffer | undefined;
    if (!buffer || !Buffer.isBuffer(buffer)) throw unauthorised();
    const raw = buffer.toString("utf-8");
    const sig = request.headers["x-orchestrator-signature"];
    const sigStr = Array.isArray(sig) ? sig[0] : (sig as string | undefined);
    if (!verifySignature(raw, sigStr)) throw unauthorised();
    return raw;
  };

  app.post("/orchestrator/photo-enhanced", async (request, reply) => {
    const raw = verifyOrchestrator(request);
    const payload = photoEnhancedCallbackSchema.parse(JSON.parse(raw));
    await applyEnhanceCallback(payload);
    reply.code(204);
    return null;
  });

  app.post("/orchestrator/photo-staged", async (request, reply) => {
    const raw = verifyOrchestrator(request);
    const payload = photoStagedCallbackSchema.parse(JSON.parse(raw));
    await applyStagingCallback(payload);
    reply.code(204);
    return null;
  });

  app.post("/orchestrator/floor-plan-parsed", async (request, reply) => {
    const raw = verifyOrchestrator(request);
    const payload = floorPlanParsedCallbackSchema.parse(JSON.parse(raw));
    await applyParseCallback(payload);
    reply.code(204);
    return null;
  });

  // Stripe webhook: verifies signature via the SDK (which needs raw bytes),
  // de-duplicates by event.id, and dispatches into billing.applyStripeEvent.
  app.post("/stripe", async (request, reply) => {
    const env = loadEnv();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError({
        status: 503,
        code: "stripe_webhook_not_configured",
        message: "Stripe webhook secret is not set.",
      });
    }
    const buffer = request.body as Buffer | undefined;
    if (!buffer || !Buffer.isBuffer(buffer)) throw unauthorised();

    const sigHeader = request.headers["stripe-signature"];
    const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    if (!sig) throw unauthorised();

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      if (err instanceof StripeNotConfiguredError) {
        throw new AppError({
          status: 503,
          code: "stripe_not_configured",
          message: "Stripe is not configured.",
        });
      }
      throw err;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(buffer, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      request.log.warn({ err }, "stripe webhook signature verification failed");
      throw unauthorised();
    }

    // Replay protection: insert the event id first; if it already exists,
    // skip the handler. Stripe will see the 200 either way.
    const supabase = getServiceClient();
    const { error: insertError } = await supabase
      .from("stripe_processed_events")
      .insert({ event_id: event.id, type: event.type });
    if (insertError) {
      // 23505 = unique_violation → already processed. Anything else is an
      // unexpected DB error; we still 200 so Stripe doesn't retry on a bug
      // that's ours, but log loudly.
      if (insertError.code !== "23505") {
        request.log.error({ err: insertError, eventId: event.id }, "stripe event dedupe failed");
      }
      reply.code(200);
      return { received: true, duplicate: true };
    }

    try {
      await applyStripeEvent(event);
    } catch (err) {
      // Roll back the dedupe row so Stripe's retry actually re-runs the handler.
      await supabase.from("stripe_processed_events").delete().eq("event_id", event.id);
      throw err;
    }

    reply.code(200);
    return { received: true };
  });
}

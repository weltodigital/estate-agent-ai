import type { FastifyInstance } from "fastify";
import { photoEnhancedCallbackSchema } from "@app/shared/schemas";
import { notImplemented, unauthorised } from "../errors.js";
import { verifySignature } from "../integrations/hmac.js";
import { applyEnhanceCallback } from "../services/photo-enhancements.js";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Plugin-scoped JSON parser. Hands us the raw Buffer so HMAC verification
  // doesn't depend on serialiser output matching the sender byte-for-byte.
  // Encapsulated to this plugin instance — non-webhook routes keep Fastify's
  // default parser.
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  // Stripe webhooks (still a stub — phase-1/8).
  app.post("/stripe", async () => {
    throw notImplemented("POST /v1/webhooks/stripe");
  });

  // Orchestrator callback for completed photo-enhance jobs.
  app.post("/orchestrator/photo-enhanced", async (request, reply) => {
    const buffer = request.body as Buffer | undefined;
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw unauthorised();
    }
    const raw = buffer.toString("utf-8");
    const sig = request.headers["x-orchestrator-signature"];
    const sigStr = Array.isArray(sig) ? sig[0] : sig;
    if (!verifySignature(raw, sigStr)) {
      throw unauthorised();
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw unauthorised();
    }
    const payload = photoEnhancedCallbackSchema.parse(json);
    await applyEnhanceCallback(payload);
    reply.code(204);
    return null;
  });
}

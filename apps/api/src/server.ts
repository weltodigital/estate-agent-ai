import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { loadEnv } from "./env.js";
import { AppError } from "./errors.js";
import { authHook } from "./hooks/auth.js";
import { registerRoutes } from "./routes/index.js";
import { captureException, initSentry } from "./integrations/sentry.js";

const env = loadEnv();

// Initialise Sentry before Fastify so the SDK can wrap http internals.
initSentry();

const app = Fastify({
  // Tag every log line with the request id (set in our onRequest hook) so
  // tracing across logs is straightforward in Logflare / Datadog.
  genReqId: () => randomUUID(),
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(helmet);
await app.register(cors, { origin: true, credentials: true });
await app.register(sensible);
await app.register(multipart, {
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB photo upload ceiling
});

// Rate limit per agency (falls back to IP for unauthenticated routes).
// Webhook endpoints opt out — Stripe / orchestrator should never be throttled.
await app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_WINDOW_MS,
  keyGenerator: (req) => req.agencyId ?? req.ip,
  allowList: (req) => req.url.startsWith("/v1/webhooks/") || req.url === "/healthz",
});

// Auth + per-request log context (agencyId / userId attached after authHook).
app.addHook("onRequest", authHook);
app.addHook("preHandler", async (request) => {
  const child = request.log.child({
    requestId: request.id,
    agencyId: request.agencyId,
    userId: request.user?.id,
  });
  // Fastify's request.log is read-only; replace via assignment for downstream
  // logs to inherit the context.
  (request as unknown as { log: typeof child }).log = child;
});

app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    request.log.warn({ err: error, code: error.code }, "app error");
    return reply
      .status(error.status)
      .send({ error: { code: error.code, message: error.message, details: error.details } });
  }
  request.log.error({ err: error }, "unhandled error");
  captureException(error, {
    requestId: request.id,
    agencyId: request.agencyId,
    userId: request.user?.id,
    route: request.routeOptions.url,
  });
  return reply.status(500).send({
    error: { code: "internal_error", message: "Unexpected error" },
  });
});

app.get("/healthz", () => ({ status: "ok" }));

await registerRoutes(app);

const port = env.PORT;
app
  .listen({ host: "0.0.0.0", port })
  .then(() => {
    app.log.info(`api listening on http://localhost:${port}`);
  })
  .catch((err) => {
    app.log.error(err, "failed to start api");
    process.exit(1);
  });

export type App = typeof app;

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { loadEnv } from "./env.js";
import { AppError } from "./errors.js";
import { authHook } from "./hooks/auth.js";
import { registerRoutes } from "./routes/index.js";

const env = loadEnv();

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development" ? { target: "pino-pretty", options: { colorize: true } } : undefined,
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

app.addHook("onRequest", authHook);

app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    request.log.warn({ err: error, code: error.code }, "app error");
    return reply
      .status(error.status)
      .send({ error: { code: error.code, message: error.message, details: error.details } });
  }
  request.log.error({ err: error }, "unhandled error");
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

import * as Sentry from "@sentry/node";
import { loadEnv } from "../env.js";

let initialised = false;

/**
 * Lazy Sentry init. No-ops if SENTRY_DSN isn't set so dev / preview envs
 * don't need to scrub a stack of warnings. Call once at server start.
 */
export function initSentry(): void {
  if (initialised) return;
  const env = loadEnv();
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });
  initialised = true;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialised) return;
  Sentry.captureException(err, { extra: context });
}

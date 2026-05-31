# @app/api — Fastify REST API
Supplements root CLAUDE.md.

## Conventions
- Every route has: a Zod request schema, a Zod response schema (both imported from `@app/shared/schemas`), Fastify hook auth, and a thin handler that calls into `src/services/`.
- Services are pure functions where possible. Side effects (DB, queue, external API) live in `src/integrations/`.
- Use `pino` for logging. One log line per request via Fastify hook. No `console.log`.
- Errors: throw `AppError` from `src/errors.ts` with a status and a code. Global error handler converts to JSON responses.
- Stripe webhooks: verify signature on every request. Replay-safe: store event IDs in `stripe_processed_events` table.

## Database access
- Use the service-role Supabase client only for: webhooks, queue workers, and admin tools. Document why.
- All other code uses a request-scoped client created from the user's JWT — RLS does the rest.

## Queue jobs
- Producers in route handlers; consumers in `src/worker.ts`.
- Every job has a Zod schema in `src/queues/<queue>.ts`. Validate on enqueue and dequeue.
- Idempotency: pass `jobId` derived from the resource (e.g. `floor-plan-parse:<floor_plan_id>`) so retries don't duplicate.

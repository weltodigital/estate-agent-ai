# UK Estate Agent Marketing SaaS

## WHAT
PropertyBox.io competitor for UK estate agents. Differentiators: AI virtual staging and AI floor plans generated from hand-drawn sketches. Phase 1 scope only — no portal integrations, no social scheduling, no native mobile app.

## ARCHITECTURE
Turborepo + pnpm monorepo. Three runtimes:
- `apps/web` — Next.js 14 (App Router), agent-facing UI
- `apps/api` — Fastify REST API, queue producer
- `services/ai-orchestrator` — Python FastAPI, calls Claude Vision / Replicate / ClipDrop
Workers run from `apps/api/src/worker.ts` consuming BullMQ queues.

## CORE CONVENTIONS
- TypeScript strict everywhere. No `any` without a `// TODO:` comment and reason.
- Zod schemas in `packages/shared/src/schemas/` are the source of truth for all API contracts. Frontend forms and backend handlers both import from there.
- Multi-tenancy is enforced at the database level via RLS. Never bypass it in the API. If a query needs cross-agency access (admin tools), use the service role and explicitly document why.
- Every billable action writes a `usage_events` row inside the same DB transaction as the action it represents.
- UK English throughout the UI ("colour", "centre", "lift" not "elevator", "garden" not "yard"). British copy in all user-facing strings.
- Money is stored in pence (`bigint`), rendered with `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`.
- Dates: ISO 8601 in DB, `Intl.DateTimeFormat('en-GB')` in UI.

## MODELS
- Default Claude model: `claude-sonnet-4-6` (env: `CLAUDE_DEFAULT_MODEL`).
- Vision (floor plan sketch parsing, room-type detection): `claude-sonnet-4-6` (env: `CLAUDE_VISION_MODEL`).
- Always read model strings from env. Never hardcode.

## OUT OF SCOPE (do not add, even if asked, without confirming with the user)
- Rightmove or Zoopla portal feeds
- Meta Graph API, LinkedIn API, social scheduling
- Native iOS/Android apps
- EPC ordering (lookup is in scope; ordering is not)

## COMMANDS
- `pnpm dev` — runs web, api, and ai-orchestrator concurrently
- `pnpm db:types` — regenerates Supabase TS types into `packages/db/src/types.ts`
- `pnpm db:migrate` — runs Supabase CLI migrations
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` — all via Turbo

## WORKFLOW
- One feature per session. Use `/clear` between unrelated tasks.
- For multi-package changes, prefer launching one subagent per package rather than one agent walking the whole tree.
- Run typecheck and lint before committing. Conventional commits required (`feat:`, `fix:`, `chore:`, etc.).

## DO NOT
- Do not add new external services without updating `.env.example` and root CLAUDE.md
- Do not write business logic in route handlers — keep handlers thin, push logic into `apps/api/src/services/`
- Do not duplicate Zod schemas between web and api — import from `packages/shared`

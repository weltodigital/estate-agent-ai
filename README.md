# estate-agent-ai

UK estate agent marketing SaaS — AI-enhanced photos, AI-generated descriptions, AI virtual staging, and AI floor plans from hand-drawn sketches. Competes with PropertyBox.io.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 14 (App Router), TypeScript strict, Tailwind, shadcn/ui
- **API:** Fastify (Node.js, TypeScript)
- **AI orchestrator:** Python 3.12 + FastAPI
- **DB / Auth / Storage:** Supabase (Postgres, RLS, Auth, Storage)
- **Object storage:** Cloudflare R2
- **Image CDN:** Cloudinary
- **Queue:** BullMQ + Upstash Redis
- **Billing:** Stripe Subscriptions

See [CLAUDE.md](./CLAUDE.md) for full conventions.

## Quickstart

```bash
# 1. Clone
git clone <repo-url>
cd estate-agent-ai

# 2. Install
pnpm install

# 3. Copy env
cp .env.example .env.local
#   then fill in the values you need locally
#   (Supabase, Anthropic, R2, etc.)

# 4. Start Supabase locally (requires the Supabase CLI)
supabase start
pnpm db:migrate

# 5. Run everything in dev
pnpm dev
#   - web on http://localhost:3000
#   - api on http://localhost:3001
#   - ai-orchestrator on http://localhost:8000
```

## Repository layout

```
apps/
  web/                  Next.js 14 frontend
  api/                  Fastify REST API + BullMQ worker
services/
  ai-orchestrator/      Python FastAPI service
packages/
  db/                   Supabase schema + generated types + client factory
  shared/               Zod schemas, shared types, constants
  ui/                   shadcn/ui primitives (brand-themable)
infra/                  Deployment notes
.github/workflows/      CI
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs web, api, and ai-orchestrator concurrently |
| `pnpm build` | Builds every package via Turbo |
| `pnpm lint` | Lints every package via Turbo |
| `pnpm typecheck` | Typechecks every package via Turbo |
| `pnpm test` | Runs tests across every package |
| `pnpm db:types` | Regenerates Supabase TS types into `packages/db/src/types.ts` |
| `pnpm db:migrate` | Runs Supabase CLI migrations |
| `pnpm format` | Formats everything via Prettier |

## Conventions

See [CLAUDE.md](./CLAUDE.md) and the per-package `CLAUDE.md` files.

## Phase 1 status

This repository is in the **scaffold** state. Routes return `501 Not Implemented`; UI shows placeholders; AI orchestrator stubs return `{ job_id: "stub" }`. Features land one at a time from the Phase 1 feature prompt list.

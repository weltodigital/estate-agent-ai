# Claude Code — Phase 1 Scaffold Prompt

> **How to use this:** Open a fresh terminal in an empty directory, run `claude`, then paste everything in the **Prompt** section below as a single message. After Claude Code finishes the scaffold, commit the result, then use the follow-up prompts in the **Phase 1 Feature Prompts** section one feature at a time. **Do not** try to build all of Phase 1 in one Claude Code session — context will overflow and quality will collapse. The scaffold is one session; each feature is its own session, started fresh after `/clear`.
>
> **Models:** Set Claude Code to default to `claude-sonnet-4-6` for routine work and only switch to `claude-opus-4-7` when you hit a hard reasoning problem (the floor plan parser, the staging prompt, complex Supabase RLS policies).

---

## Prompt — Full Phase 1 Scaffold (paste this verbatim)

You are scaffolding the foundation of a UK estate agent marketing SaaS. The product helps estate agents bring properties to market faster with AI-enhanced photos, AI-generated property descriptions, AI virtual staging, and AI-generated floor plans from hand-drawn sketches. It competes with PropertyBox.io.

Your job in this session is **architecture and scaffolding only** — directory structure, configs, schemas, services skeleton, conventions, and `CLAUDE.md` files. Do not implement features yet. Subsequent sessions will build features one at a time against this foundation.

### Tech stack (use exactly these — do not substitute)

- **Monorepo manager:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui
- **State:** TanStack Query for server state, Zustand for client state
- **Forms/validation:** React Hook Form + Zod
- **Auth + DB:** Supabase (Postgres, Auth, RLS, Storage for sketches)
- **Object storage:** Cloudflare R2 (final photo/floor-plan/video assets)
- **Image CDN:** Cloudinary (transformations + delivery)
- **Backend API:** Node.js + Fastify (TypeScript)
- **AI orchestration service:** Python + FastAPI (separate service, called by the Fastify API)
- **Job queue:** BullMQ + Upstash Redis
- **Billing:** Stripe Subscriptions + Customer Portal
- **Email:** Resend
- **Rich text:** TipTap
- **Canvas editor (floor plans):** Konva.js
- **Drag and drop:** dnd-kit
- **AI SDK:** `@anthropic-ai/sdk` — default model `claude-sonnet-4-6`; vision tasks also use Sonnet 4.6; pin model strings in env vars, never hardcoded
- **External AI APIs (clients only — no calls yet):** Replicate, ClipDrop, AWS Rekognition

### Repository layout (create exactly this)

```
/
├── apps/
│   ├── web/                    # Next.js 14 app — the agent-facing UI
│   └── api/                    # Fastify API — REST endpoints, queue producers
├── services/
│   └── ai-orchestrator/        # Python FastAPI — staging, floor-plan parsing, Replicate orchestration
├── packages/
│   ├── db/                     # Supabase schema, migrations, generated types
│   ├── shared/                 # Shared TS types, Zod schemas, constants
│   └── ui/                     # Shared shadcn/ui components
├── infra/
│   └── README.md               # Deployment notes (Vercel, Railway, R2, Upstash)
├── .github/workflows/          # CI: lint, typecheck, test on PRs
├── CLAUDE.md                   # Root conventions (see below)
├── package.json                # pnpm workspaces root
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example                # Every var listed, with placeholder values
├── .gitignore
├── README.md
└── .editorconfig
```

Each of `apps/web`, `apps/api`, `services/ai-orchestrator`, `packages/db`, `packages/shared`, and `packages/ui` gets its own `CLAUDE.md` (see content below) and a stub `README.md`.

### Multi-tenancy model (set in stone now)

- **agency** is the top-level tenant. Every business is one agency.
- **branch** belongs to an agency. Even a single-office agent has exactly one branch.
- **user** belongs to one agency and (optionally) one branch. Roles: `admin`, `agent`, `viewer`.
- **property** belongs to one agency and one branch.
- All RLS policies key on `agency_id` derived from the authenticated user's profile row. Cross-agency reads are impossible at the DB level — not just at the API level.

### Database schema (Supabase migration `0001_initial.sql`)

Create these tables with UUID primary keys (`gen_random_uuid()`), `created_at timestamptz default now()`, `updated_at timestamptz default now()` with triggers, and RLS enabled on all tenant-scoped tables.

- `agencies`: id, name, slug (unique), logo_url, brand_colour_primary, brand_colour_secondary, default_tone enum(professional|friendly|luxury|lettings), default_watermark_position enum(top-left|top-right|bottom-left|bottom-right), floor_plan_template enum(minimal|classic|bold), subscription_tier enum(starter|pro|business|agency), stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at, updated_at
- `branches`: id, agency_id (FK), name, address, postcode, phone, listings_this_month int default 0, monthly_listing_limit int, created_at, updated_at
- `users`: id (matches Supabase auth.users.id), agency_id (FK), branch_id (FK nullable), email, full_name, role enum(admin|agent|viewer), avatar_url, invited_by (FK users), created_at, updated_at
- `properties`: id, agency_id, branch_id, created_by (FK users), address_line_1, address_line_2, town, postcode, property_type enum(detached|semi-detached|terraced|flat|bungalow|other), listing_type enum(sale|rent), bedrooms int, bathrooms int, price_pence bigint, status enum(draft|active|under_offer|sold|let|withdrawn), description text, description_tone enum, epc_current_rating char(1), epc_potential_rating char(1), epc_expiry_date date, notes text, created_at, updated_at
- `property_photos`: id, property_id (FK cascade), original_url, enhanced_url, staged_url, dusk_url, room_type enum(living_room|bedroom|kitchen|bathroom|exterior|garden|other), sort_order int, enhancements_applied jsonb default '[]', staging_style enum nullable, is_primary boolean default false, created_at
- `floor_plans`: id, property_id (FK cascade), floor_label text, sketch_url, parsed_json jsonb, editor_state jsonb, status enum(uploaded|parsing|parsed|editing|finalised|failed), parse_error text, output_svg_url, output_pdf_url, output_png_url, total_area_sqm numeric, include_furniture boolean default false, finalised_at timestamptz, created_at, updated_at
- `video_campaigns`: id, property_id (FK cascade), template enum(modern|bold|classic), photo_ids uuid[], format enum('16:9'|'1:1'|'9:16'), video_url, status enum(queued|processing|complete|failed), created_at
- `usage_events`: id, agency_id, branch_id, user_id, property_id nullable, event_type enum(listing_created|photo_enhanced|staging_generated|floor_plan_created|video_generated|description_generated|epc_lookup), units_consumed int default 1, billable boolean default true, created_at — this is the ledger for billing and quotas; every action that costs money writes one row

RLS policies for every tenant table: `agency_id = (select agency_id from public.users where id = auth.uid())`. Write a single migration `0002_rls_policies.sql` containing all `ENABLE ROW LEVEL SECURITY` statements and policies.

Add a Postgres function `current_agency_id()` returning the caller's agency_id; use it inside policies.

Generate TypeScript types into `packages/db/src/types.ts` via `supabase gen types typescript`. Wire this into a pnpm script `db:types`.

### Authentication and onboarding flow

Use Supabase Auth with email/password + magic link. On first signup, the user is created in `auth.users` but NOT yet in `public.users`. The signup flow must:

1. Capture: full_name, email, password, agency_name, branch_postcode.
2. Create the agency row, create one branch row, create the public.users row with `role='admin'`, link them. All inside a Postgres function `bootstrap_new_agency(...)` callable via Supabase RPC, transactional.
3. Start a 7-day Stripe trial subscription on the starter tier — but defer actually calling Stripe in scaffold; just add a TODO and the function signature in `apps/api/src/services/billing.ts`.

Subsequent invited users land via a `/accept-invite?token=...` page, which calls `bootstrap_invited_user(...)`.

### API surface (Fastify — stubs only, no business logic yet)

Create the route files with handler stubs that return `501 Not Implemented`. Use Zod schemas in `packages/shared/src/schemas/` for every request/response. Verify Supabase JWT on every route via a Fastify hook; attach `request.user` and `request.agencyId`.

Routes to scaffold:

- `POST /v1/auth/bootstrap-agency` — completes signup
- `POST /v1/auth/accept-invite`
- `GET/POST/PATCH/DELETE /v1/properties` and `/v1/properties/:id`
- `POST /v1/properties/:id/photos` (multipart upload)
- `PATCH /v1/photos/:id` (reorder, set primary)
- `POST /v1/photos/:id/enhance` (queues a job)
- `POST /v1/photos/:id/stage` (queues a staging job)
- `POST /v1/properties/:id/description` (calls AI orchestrator synchronously, streams response)
- `POST /v1/properties/:id/floor-plans` (sketch upload → queue parse job)
- `GET /v1/floor-plans/:id`
- `PATCH /v1/floor-plans/:id` (save editor state)
- `POST /v1/floor-plans/:id/finalise` (renders branded SVG → PDF/PNG)
- `GET /v1/epc/lookup?postcode=...`
- `POST /v1/billing/checkout-session` (Stripe)
- `POST /v1/billing/portal-session`
- `POST /v1/webhooks/stripe`

Every mutating route writes a row to `usage_events` for the agency, even if the work is queued.

### AI orchestrator service (FastAPI — stubs only)

- `POST /jobs/floor-plan/parse` — accepts `{ sketch_url, callback_url }`, returns `{ job_id }`. Will call Claude Vision (Sonnet 4.6) with a strict-JSON system prompt and POST the result to the callback. Stub returns `{ job_id: "stub" }`.
- `POST /jobs/staging/generate` — accepts `{ photo_url, style, variations }`, returns `{ job_id }`. Will call Replicate inpainting. Stub.
- `POST /jobs/photo/enhance` — orchestrates ClipDrop + Sharp + Rekognition for a single photo. Stub.
- `POST /jobs/video/render` — FFmpeg-based slideshow renderer. Stub.
- `GET /jobs/:id` — status polling.
- `GET /healthz`.

Set up the project with `uv` (modern Python tooling), `ruff` for linting, `mypy --strict`, `pytest`. Include a `pyproject.toml` and a `Dockerfile` (multi-stage, slim).

### Job queue (BullMQ in apps/api)

Define queue names and TypeScript job types in `apps/api/src/queues/`:

- `photo-enhance` → calls AI orchestrator `/jobs/photo/enhance`
- `staging-generate` → calls `/jobs/staging/generate`
- `floor-plan-parse` → calls `/jobs/floor-plan/parse`
- `video-render` → calls `/jobs/video/render`

Set up a separate worker entry point `apps/api/src/worker.ts` so the API process and the worker process can be deployed separately on Railway.

### Frontend scaffolding (apps/web)

Use Next.js 14 App Router. Set up:

- `app/(marketing)/` — public landing page (placeholder), `/pricing` (placeholder)
- `app/(auth)/login`, `/signup`, `/accept-invite`
- `app/(app)/dashboard` — authenticated shell with sidebar nav
- `app/(app)/properties` — list view
- `app/(app)/properties/[id]` — detail view with tabs: Photos | Description | Floor Plan | EPC | Activity
- `app/(app)/properties/[id]/floor-plan/[floorPlanId]/edit` — Konva-based editor (placeholder canvas only)
- `app/(app)/settings` — Agency, Branding, Team, Billing tabs
- A `<Protected>` layout in `(app)` that redirects unauthenticated users to `/login`.
- `lib/supabase/{client,server}.ts` — typed Supabase clients
- `lib/api.ts` — typed fetch wrapper for the Fastify API
- `components/ui/` — shadcn primitives, brand colours wired into Tailwind config from agency settings (use CSS custom properties so they're swappable per agency)

### Environment variables

Create `.env.example` listing every variable, grouped by service, with comments. Include exactly these and no more (we are NOT integrating Meta, LinkedIn, Rightmove, Zoopla, or any portal feeds — those are deliberately out of scope):

```
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- Anthropic ---
ANTHROPIC_API_KEY=
CLAUDE_DEFAULT_MODEL=claude-sonnet-4-6
CLAUDE_VISION_MODEL=claude-sonnet-4-6

# --- External AI ---
CLIPDROP_API_KEY=
REPLICATE_API_TOKEN=

# --- AWS (Rekognition only) ---
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-west-2

# --- Cloudflare R2 ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=

# --- Cloudinary ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# --- Stripe ---
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# --- UK property data ---
EPC_API_KEY=
OS_PLACES_API_KEY=

# --- Email + Queue ---
RESEND_API_KEY=
REDIS_URL=

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
AI_ORCHESTRATOR_URL=http://localhost:8000
NODE_ENV=development
```

### Tooling and CI

- ESLint flat config + Prettier at the root; per-package overrides only where needed
- TypeScript strict everywhere; no `any` without `// TODO:` and a justification comment
- Husky pre-commit: lint-staged on changed files
- GitHub Actions workflow `ci.yml`: install, lint, typecheck, test, build — all packages in parallel via Turbo
- Conventional commits enforced via commitlint

### CLAUDE.md files — write these exactly

#### Root `CLAUDE.md`

````markdown
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
````

#### `apps/web/CLAUDE.md`

````markdown
# @app/web — Next.js 14 frontend
Supplements root CLAUDE.md.

## Conventions
- App Router only. No `pages/` directory.
- Server Components by default. `"use client"` only when truly needed (interactivity, browser APIs, hooks).
- Data fetching: server-side via Supabase server client OR TanStack Query for client components calling the Fastify API. Never fetch from `apps/api` server-to-server using `fetch` without going through `lib/api.ts`.
- Forms: React Hook Form + Zod resolver. Import schemas from `@app/shared/schemas`.
- Styling: Tailwind utility classes + shadcn/ui primitives in `components/ui/`. No CSS modules. No inline styles except for dynamic agency brand colours via CSS custom properties.
- Loading + error: every route segment has `loading.tsx` and `error.tsx`.

## Folder conventions
- `app/` — routes
- `components/ui/` — shadcn primitives
- `components/` (root of components) — app-specific composite components
- `lib/` — clients, utilities, hooks
- `hooks/` — React hooks

## Image handling
- Upload directly to R2 from the browser via signed URLs from the API. Do not proxy through Next.js.
- Display images via Cloudinary URLs for transformation (resize, format, quality).
````

#### `apps/api/CLAUDE.md`

````markdown
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
````

#### `services/ai-orchestrator/CLAUDE.md`

````markdown
# ai-orchestrator — Python FastAPI service
Supplements root CLAUDE.md.

## Conventions
- Python 3.12, `uv` for env and dependency management, `ruff` for lint and format, `mypy --strict`.
- Pydantic v2 for all request/response models.
- Async everywhere (`httpx.AsyncClient`, async route handlers).
- All Claude calls go through `app/llm/claude.py`. Model string from env. No hardcoded strings.
- Floor plan parsing: strict JSON output. The schema is in `app/llm/schemas.py`. Validate the model's response with Pydantic before returning to the callback. If validation fails, retry once with a corrective system message; on second failure, return `status: failed` with the parse error.
- Long-running jobs (>5s expected): accept the request, return a job_id immediately, do the work in a background task (`fastapi.BackgroundTasks` for v1; later move to a proper task runner).

## Calling the API back
- When a job finishes, POST to the callback URL provided by the caller. Sign the callback with HMAC-SHA256 using `AI_CALLBACK_SECRET`.
- The Fastify API verifies the signature before trusting the payload.

## Out of scope here
- No DB access. The orchestrator is stateless w.r.t. the product DB. It receives URLs, returns results.
````

#### `packages/db/CLAUDE.md`

````markdown
# @app/db — Supabase schema and types
Supplements root CLAUDE.md.

- `migrations/` — numbered SQL files, applied in order via `supabase db push`
- `src/types.ts` — generated, do not edit by hand. Run `pnpm db:types`.
- `src/client.ts` — typed Supabase client factory (`createServerClient`, `createBrowserClient`, `createServiceClient`)
- Every migration must include rollback notes in a comment header.
- RLS policy changes require a new migration; never edit an existing migration after it's been applied to a deployed environment.
````

#### `packages/shared/CLAUDE.md`

````markdown
# @app/shared — Shared types, schemas, constants
Supplements root CLAUDE.md.

- `src/schemas/` — Zod schemas. One file per resource (`property.ts`, `photo.ts`, `floor-plan.ts`, etc.). Export both the Zod schema and the inferred TS type.
- `src/types/` — derived types and enums that don't have a Zod schema.
- `src/constants.ts` — shared constants (tone options, room types, staging styles, UK property type list).
- No runtime dependencies on Node-only or browser-only APIs. This package must be isomorphic.
````

#### `packages/ui/CLAUDE.md`

````markdown
# @app/ui — Shared shadcn/ui components
Supplements root CLAUDE.md.

- shadcn/ui primitives only. No app-specific composite components.
- Components are unstyled w.r.t. agency branding — use CSS custom properties (`--brand-primary`, `--brand-secondary`) so the host app can theme per-agency.
- Re-export everything from `src/index.ts`.
````

### Deliverables checklist for this session

When you're done, the repo should:

1. Install cleanly via `pnpm install` from a fresh clone
2. Pass `pnpm typecheck` across every package (with stubs returning `501` and unused-import suppressions where genuinely necessary)
3. Pass `pnpm lint`
4. Have `pnpm dev` start all three services (they will return 501 / show placeholder pages, that's fine)
5. Have `supabase db push` run the two migrations cleanly against a local Supabase project
6. Have a `README.md` at root with a 5-step Quickstart (clone → install → copy `.env.example` to `.env.local` → start Supabase → `pnpm dev`)
7. Have the `.github/workflows/ci.yml` green on a placeholder PR

**Do not** implement any AI feature, any photo enhancement, any Stripe call, or any business logic beyond what's needed for routes to return 501 cleanly. Those come next.

Begin by creating the root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, and `CLAUDE.md`. Then scaffold each package. Then write the database migrations. Then run typecheck across the whole repo and fix anything that fails. Commit at the end with `chore: phase 1 scaffold`.

---

## Phase 1 Feature Prompts (use one at a time, fresh session, after `/clear`)

Run these in order after the scaffold lands. Each is a focused session — do not chain them in one go.

### 1. Auth + agency bootstrap
> Implement the signup, login, and `bootstrap_new_agency` flow end to end. Stripe trial creation is a TODO; everything else is real. Include the `/accept-invite` flow. Add Playwright tests for signup and login.

### 2. Property CRUD + photo upload
> Implement properties list, detail, create/edit forms, archive, and photo upload to R2 via signed URLs. Photo reorder with dnd-kit. No enhancement yet — just raw photo handling, primary photo selection, and the asset library UI on the property detail page.

### 3. EPC lookup
> Implement the GOV.UK EPC Register integration: address/postcode lookup, results display on the property page, auto-lookup on property creation, and storage of `epc_*` fields. Cache results in DB to avoid hammering the API.

### 4. AI property descriptions
> Implement the Claude-powered description generator. Streaming response to UI. Tone selector. UK-specific system prompt (use the prompt in the spec doc). Inline TipTap editor with save. Write usage_events on each generation.

### 5. Photo enhancement pipeline
> Implement the BullMQ queue, the orchestrator endpoints, and the agent-facing UI: sky replacement, object removal, GDPR blur, exposure correction, dusk shot, before/after slider, batch processing. Each enhancement writes a usage_event.

### 6. AI virtual staging
> Implement the staging flow against Replicate inpainting: style selector, 3 variations per generation, save-and-compare UI, room-type detection via Claude Vision to auto-suggest a style. Heavy testing against real photos — keep a fixture set in `apps/api/test/fixtures/`.

### 7. AI floor plans from sketch — the flagship
> Two-session feature. First session: sketch upload, Claude Vision parsing, SVG render, status states, the parse error UI. Second session: the Konva.js editor (drag, resize, rename rooms; add/remove doors and windows; correct dimensions), finalise + PDF/PNG export, agency branding overlay.

### 8. Billing
> Stripe subscriptions for the four tiers. Trial countdown UI. Usage-limit enforcement at the API layer (read from `usage_events` aggregates). Stripe Customer Portal for self-service. Webhook handler with replay protection. Add-on credit purchases for floor plans and staging.

### 9. Settings (agency, team, branding)
> Agency profile, logo upload, brand colour pickers, team invite UI, role management, default tone/template preferences.

### 10. Production hardening
> Sentry wiring, structured logging, rate limiting (per agency), Cloudflare in front of everything, R2 lifecycle rules, Supabase backups verified, runbook in `infra/README.md` covering on-call basics.

---

## Notes on running these

- **Always start a feature prompt by saying:** *"Read root CLAUDE.md and the CLAUDE.md files in the packages you'll touch before doing anything else."* This costs nothing and prevents most convention drift.
- **Use `/context` mid-session** to check what's loaded. If skills or files you need aren't loaded, prompt Claude to view them explicitly.
- **Pair Claude Code with a real test loop.** Have it write the test first, watch it fail, then implement until green. Saves more time than it costs.
- **Stripe and AI calls cost money.** When iterating, mock them via the orchestrator stub responses until the happy path works, then turn on the real calls.
- **If the floor plan parser misbehaves**, that's the one place to switch to `claude-opus-4-7` for the prompt-engineering session — better reasoning on a hard structured-output task. Switch back to Sonnet for routine work.

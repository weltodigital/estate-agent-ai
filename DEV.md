# Running locally

The web app + API are runnable on your machine against a hosted Supabase
project (or a fully-local Supabase via the CLI). The AI orchestrator and the
BullMQ worker stay off unless you specifically want AI features — the rest
of the app boots fine without them.

## TL;DR

1. Install Node 20+ and pnpm.
2. Apply migrations to Supabase (paste `scripts/all-migrations.sql` into the
   SQL editor, or run via `psql`).
3. Copy `.env.example` to `apps/web/.env.local` AND `apps/api/.env.local`,
   fill in the three Supabase keys in each.
4. `pnpm install`
5. `pnpm --filter @app/web --filter @app/api dev`
6. Open http://localhost:3000/signup

---

## 1. Prerequisites

```bash
# macOS
brew install node               # Node 20+
npm install -g pnpm@9           # or run everything via `npx pnpm` (slower)
```

Optional, only if you want AI features end-to-end:

```bash
brew install --cask docker      # Redis container
brew install astral-sh/uv/uv    # Python orchestrator
```

## 2. Supabase

Two paths — pick one.

### Path A — Hosted Supabase project (no Docker)

1. Create a free project at https://supabase.com.
2. From the dashboard → **Settings → API**, copy:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **`anon` key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — safe to share, public.
   - **`service_role` key** (`SUPABASE_SERVICE_ROLE_KEY`) — **secret, never share.**
3. Apply the schema. The simplest way:
   - Open **SQL Editor → New query**.
   - Paste the contents of [`scripts/all-migrations.sql`](./scripts/all-migrations.sql)
     (concatenates migrations 0001 → 0006 in order).
   - Hit **Run**. Should report success and create the tables + RLS policies.

### Path B — Fully local Supabase (Docker required)

```bash
brew install supabase/tap/supabase
supabase start                                          # boots in Docker (~2 min first time)
supabase status -o env                                  # prints URL + keys
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f scripts/all-migrations.sql
```

The URLs and keys for Path B are the ones from `supabase status`.

## 3. Environment files

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env.local
```

Edit each file and fill in **only** the three Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Leave the rest at their defaults. Photo upload, AI features, Stripe, EPC,
etc. will return 503/clean errors at the moment you try them — the app
itself boots cleanly.

## 4. Install + run

```bash
pnpm install

# Web on http://localhost:3000, API on http://localhost:3001.
# Skip the orchestrator + worker for the "basics" path.
pnpm --filter @app/web --filter @app/api dev
```

If you don't have `pnpm` installed globally, prefix everything with `npx`:
`npx pnpm install`, `npx pnpm --filter @app/web --filter @app/api dev`.

## 5. First-run flow

- Open http://localhost:3000.
- Click **Get started**.
- Sign up with any email — if your Supabase project has email confirmation
  enabled (the default), you'll see "check your inbox" and need to click
  the confirmation link. To bypass for dev, in the Supabase dashboard go to
  **Authentication → Providers → Email** and disable "Confirm email".
- After confirming, the agency + branch + admin user rows are created via
  the `bootstrap_new_agency` RPC and you land on `/dashboard`.
- Try: create a property, look up EPC, edit the agency settings.

## What won't work without more config

| Feature                  | Needs                                               |
| ------------------------ | --------------------------------------------------- |
| Photo upload             | Real R2 credentials in `.env.local`                 |
| Photo enhancement        | Redis + orchestrator + R2                           |
| Virtual staging          | Same as enhancement                                 |
| Floor-plan parse         | `ANTHROPIC_API_KEY` + orchestrator + R2             |
| AI description streaming | `ANTHROPIC_API_KEY` (orchestrator not needed)       |
| EPC lookup               | `EPC_API_EMAIL` + `EPC_API_KEY` (free, GOV.UK)      |
| Stripe billing           | `STRIPE_SECRET_KEY` + price IDs + webhook secret    |
| Invite emails            | `RESEND_API_KEY` (until then the URL appears in UI) |
| Floor-plan editor        | Photo upload + Anthropic to get a parsed plan first |

For each: setting the env var(s) in `apps/api/.env.local` and restarting
`pnpm dev` is all that's needed.

## Common issues

- **`Invalid environment configuration` on API start** — a required env var
  is missing. The keys listed above without `optional()` in
  `apps/api/src/env.ts` must all be set, even to placeholders.
- **CORS errors in the browser** — check `NEXT_PUBLIC_API_BASE_URL` in
  `apps/web/.env.local` matches where the API is actually listening.
- **`Not signed in` from the API** — your Supabase session cookie expired,
  or the API is hitting a different Supabase project than the web. Confirm
  the same `NEXT_PUBLIC_SUPABASE_URL` in both `.env.local` files.
- **Floor-plan SVG fails to render in the UI** — the SVG might be on R2
  with placeholder credentials; check the network tab for a 4xx on the
  `output_svg_url`.

## Running the full stack (AI features)

When you're ready:

```bash
# Redis (Docker)
docker run -d --name eaai-redis -p 6379:6379 redis:7-alpine

# Orchestrator (in another terminal)
cd services/ai-orchestrator
uv sync
uv run uvicorn app.main:app --reload --port 8000

# API worker (third terminal)
pnpm --filter @app/api dev:worker
```

Add `ANTHROPIC_API_KEY=...` and the real `R2_*` values to
`apps/api/.env.local`, restart `pnpm dev`. AI descriptions + floor-plan
parse start working; staging + photo enhance need ClipDrop / Replicate to
move beyond the PIL placeholder.

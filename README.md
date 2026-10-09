# Privett

AI search visibility for UK estate and letting agents. Privett asks ChatGPT, Perplexity, Gemini and Claude the questions sellers and landlords ask ("best estate agent in Portsmouth", "reliable letting agent in Southsea"), records who gets named, and turns the gap to the agents AI recommends into a prioritised list of fixes with ready-to-paste assets.

> When a seller in your town asks AI who to list with, are you named? If not, why not?

Spec: [`docs/build-prompt-v1.md`](./docs/build-prompt-v1.md). Conventions: [`CLAUDE.md`](./CLAUDE.md). Brand: [`BRANDING.md`](./BRANDING.md).

## Layout

```
apps/web          Next.js 15 app (Vercel): marketing, auth, billing, dashboard, tracking endpoint, free scan, admin
apps/worker       Scan worker (Railway): engines, parsing, matching, signals, fixes, rollups, scheduler
packages/core     Shared config, metric formulas, entity matching, prompt rendering, rule engine
supabase/         Migrations: schema, RLS, queue functions, seed prompt library
docs/             Product spec
```

## How a scan works

1. A `scan_runs` row is queued: weekly by the worker's scheduler for paid branches, on demand ("Scan now", first scan after adding a branch), by the public free scan, or by an admin league table.
2. The worker claims it (`claim_scan_run`, `SKIP LOCKED`), then runs every active prompt on every engine in the plan, N times each (default 3). AI answers vary, so the core metric is a mention *rate*.
3. Each answer is stored verbatim, then parsed by the Anthropic API into structured JSON: every agent named, in order, with sentiment and descriptors, plus cited URLs.
4. Names are matched to the branch (name, aliases, domain) and its competitors. Unknown agents become discovered competitors. Partial matches are flagged for review, never counted.
5. Signals are snapshotted (website crawl, Google Business Profile via Places API), the rule engine writes evidence-backed fixes, and weekly rollups are updated.

Every API call is costed and logged. Each run has a USD budget and stops when it's spent.

## The four metrics

One *response* = one prompt × one engine × one run. Formulas live only in `packages/core/src/metrics.ts`.

| Metric | Definition |
|---|---|
| Visibility | Responses naming the branch ÷ all parsed responses, % |
| Position | Mean rank among agents named, over responses naming the branch (lower is better) |
| Sentiment | Mean 0–100 score over responses naming the branch |
| Share of Voice | Branch mentions ÷ all agent mentions in the same responses, % |

## Setup

Requirements: Node 22+, pnpm 11, a Supabase project, a Stripe account, and API keys for whichever engines you want to scan.

```bash
pnpm install
cp .env.example apps/web/.env.local     # fill in Supabase, Stripe, app URL
cp .env.example apps/worker/.env        # fill in Supabase service role + AI keys
```

### Supabase

```bash
supabase link --project-ref <ref>
supabase db push                         # applies supabase/migrations
```

- Auth → URL configuration: add `<APP_URL>/auth/callback` to redirect URLs.
- Auth → Providers: enable Email (magic link) and Google.
- Make yourself an admin (for league tables): `update profiles set is_admin = true where email = 'you@example.com';`

### Stripe

1. Create three monthly recurring, per-unit prices: Starter £39, Pro £99 and Agency £79 (quantity = branches, minimum 2). Put their ids in `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO` / `STRIPE_PRICE_AGENCY`. Plan limits live in `packages/core/src/config/plans.ts`.
2. Add a webhook endpoint at `<APP_URL>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.created|updated|deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the customer portal.

### Run locally

```bash
pnpm dev:web       # http://localhost:3000
pnpm dev:worker    # needs the worker env vars
```

### Deploy

- **Web**: Vercel, root directory `apps/web`, env vars from `.env.example`.
- **Worker**: Railway, see [`apps/worker/README.md`](./apps/worker/README.md).

## Checks

```bash
pnpm typecheck
pnpm test
pnpm test:db      # migrations + RLS against in-memory Postgres
```

# Privett: AI search visibility for UK estate agents

## WHAT

Privett tracks how UK estate and letting agents show up in AI search (ChatGPT, Perplexity, Gemini, Claude) and tells them what to fix. The spec is [`docs/build-prompt-v1.md`](./docs/build-prompt-v1.md). Brand and voice: [`BRANDING.md`](./BRANDING.md). Read both before changing product behaviour or copy.

## ARCHITECTURE

pnpm workspace, no build step for shared code.

- `apps/web`: Next.js 15 (App Router) on Vercel. Marketing site, auth, billing, dashboard, tracking endpoint, free scan, admin.
- `apps/worker`: Node worker on Railway. Claims `scan_runs` from Postgres (`claim_scan_run`, `FOR UPDATE SKIP LOCKED`), runs engines, parses answers, crawls signals, writes recommendations and weekly rollups. Also the weekly scheduler.
- `packages/core`: shared TypeScript source. Config (engines, models, prices, plans, referrers, thresholds), domain types, metric formulas, entity matching, prompt rendering, the rule engine. Imported by both apps.
- `supabase/migrations`: schema, RLS, functions, seed prompt library.

## INVARIANTS (do not break)

- **Never fabricate a metric.** Every number traces to stored raw answers or stored signals. Missing values render as "—". Unparsed responses are excluded from denominators, never counted as "not named".
- **Raw AI answers are always stored and viewable** (`scan_results.answer_text`, `raw_json`).
- **Every recommendation shows its evidence** (`evidence_json`). A rule without data stays silent.
- **No promises of rankings or guaranteed visibility**, in UI or marketing copy.
- Generated assets are labelled as drafts (`DRAFT_NOTE`).
- Model names, referrer lists, prompt templates and plan limits live in `packages/core/src/config` (env-overridable) or the DB. Never hardcode them elsewhere.
- Metric formulas live only in `packages/core/src/metrics.ts`, and rows map to metric inputs only via `toMetricResponses` in `responses.ts`. Web and worker must not reimplement them.

## CONVENTIONS

- TypeScript strict. UK English in all user-facing strings.
- RLS on every table, scoped by `org_id`. The service-role client (`apps/web/lib/supabase/admin.ts`) is only for writes that need a plan-limit check first, Stripe webhooks, the public tracking endpoint, the free scan, and admin tools. Always scope by org explicitly when using it.
- Plan limits are enforced server-side (`effectiveLimits` in core, `getOrgPlan` in web, `enqueueScan` in `apps/web/lib/scans.ts`).
- API costs are USD (`numeric`), logged per call in `api_cost_log`. Every scan run has a budget; the worker stops when it's spent.
- Dates: ISO in DB, `Intl.DateTimeFormat('en-GB')` in UI.
- Conventional commits (`feat:`, `fix:`, `chore:`).

## COMMANDS

- `pnpm dev:web`, `pnpm dev:worker`
- `pnpm typecheck`, `pnpm test`
- `supabase db push` applies migrations (after `supabase link`).

## OUT OF SCOPE FOR V1

Done-for-you services, Google AI Overviews, AI crawler log tracking, CRM integrations, white-label/reseller, public league table pages.

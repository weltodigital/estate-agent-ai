# Privett scan worker

Long-running Node process (deployed on Railway) that runs scans:

1. Claims due `scan_runs` from Postgres (`claim_scan_run`, `FOR UPDATE SKIP LOCKED`). Runs left `running` by a dead worker are reclaimed after 30 minutes; a heartbeat keeps live ones locked.
2. For each prompt x engine x run, asks the engine (`src/engines/`, one `runPrompt(engine, prompt)` interface), stores the raw answer in `scan_results`, parses it with the Anthropic API (`src/parse.ts`), matches agents to the branch and competitors, and writes `agent_mentions` and `citations`. Unmatched agents become discovered competitors. Low-confidence matches are flagged `needs_review` and not counted.
3. Branch runs then snapshot signals (`src/signals/`: website crawl, Google Business Profile), refresh fix items (`src/recommendations.ts`, rules from `packages/core`) and roll up `metrics_weekly`.
4. League runs (admin) do the same over the town's prompt library, matching against `league_agents`.
5. Every ~10 minutes the scheduler enqueues scans for paid branches whose last scan is older than their plan's interval.

Every paid call is costed (`packages/core` pricing config), logged to `api_cost_log` and added to `scan_runs.cost_usd`. A run stops starting new calls at its `budget_usd` and finishes as `budget_exceeded`, keeping what it has. Failed runs retry with backoff up to `max_attempts` and resume where they stopped.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | The worker writes for every organisation. |
| `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY` | per engine | An engine without a key is skipped and logged. |
| `ANTHROPIC_API_KEY` | yes | Claude engine, answer parsing and fix asset drafts. |
| `GOOGLE_PLACES_API_KEY` | recommended | Google Business Profile signals; skipped without it. |
| `OPENAI_MODEL`, `PERPLEXITY_MODEL`, `GEMINI_MODEL`, `ANTHROPIC_ENGINE_MODEL`, `ANTHROPIC_PARSER_MODEL`, `ANTHROPIC_ASSET_MODEL` | no | Model ids; defaults in `packages/core/src/config/engines.ts`. |
| `MODEL_PRICING_JSON` | no | Per-model price overrides for cost logging. |
| `WORKER_ID` | no | Defaults to `worker-<pid>`. |
| `WORKER_CONCURRENCY` | no | Runs processed at once (default 4). |
| `WORKER_TASK_CONCURRENCY` | no | Engine calls in flight per run (default 6). Provider rate limits apply on top. |
| `WORKER_POLL_MS`, `WORKER_SCHEDULER_MS`, `WORKER_HEARTBEAT_MS` | no | Loop timings. |
| `OPENAI_WEB_SEARCH_TOOL` | no | Responses API tool type (default `web_search`). |
| `PLACES_COST_PER_CALL_USD` | no | Default 0.035. |
| `CRAWL_MAX_PAGES` | no | Internal pages fetched per site (default 15). |

## Run locally

```bash
pnpm install
cp .env.example .env   # at the repo root, fill in Supabase + at least one engine key
pnpm --filter @privett/worker dev     # watches src/
```

Queue a scan from the web app ("Scan now"), or insert a `scan_runs` row directly.

## Test

```bash
pnpm --filter @privett/worker test       # offline: fetch is mocked, no paid calls
pnpm --filter @privett/worker typecheck
```

## Deploy on Railway

Create a service from this repository with the repository root as its root directory. Railway reads `railway.json` at the root, which builds `apps/worker/Dockerfile`; leave any custom build or start command empty. Add the environment variables above. One replica is enough to start; add replicas or raise `WORKER_CONCURRENCY` as branches grow, since runs are claimed with `SKIP LOCKED`.

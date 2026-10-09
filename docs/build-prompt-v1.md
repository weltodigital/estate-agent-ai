# Privett — Build Prompt v1: AI Search Visibility for Estate Agents

## What we're building

Privett tracks how UK estate and letting agents show up in AI search (ChatGPT, Perplexity, Gemini, Claude) and tells them exactly what to fix. Two jobs:

1. **Analytics.** How often each agent is named when sellers and landlords ask AI for an agent in their area, how they're described, who is recommended instead, which sources the AI cites, and how much traffic AI actually sends to their website. Tracked over time.
2. **DIY fixes.** A prioritised to-do list generated from the agent's own data and the gap to the agents AI recommends, with ready-to-paste assets (structured data, FAQ copy, area page drafts, review-request templates, robots.txt fixes).

No done-for-you services in this version. No rank promises anywhere in the product or copy.

The question we answer for an agent: **"When a seller in my town asks AI who to list with, am I named — and if not, why not?"**

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase: Postgres, Auth, Row Level Security
- Stripe: subscriptions
- Railway: background worker for scan jobs (long-running, rate-limited, retryable)
- Anthropic API: answer parsing, entity extraction, fix asset generation
- Reuse existing Privett scaffold and branding: Hedge Green, Bone, Newsreader headings, Inter body

## Build order (money path first)

### Phase 0 — Money path
- Supabase auth (email magic link + Google)
- Organisations → users (multi-branch agencies need several users)
- Stripe checkout + customer portal + webhook → `subscriptions` table
- Plans (prices TBD, keep in config):
  - **Free scan** — one-off, email-gated
  - **Pro** — per branch, monthly
  - **Multi-branch** — tiered per-branch price
- Plan limits enforced server-side (branches, prompts per branch, scan frequency, engines)

### Phase 1 — Scan engine (worker)
- **Engine adapters** behind one interface: `runPrompt(engine, prompt) → { answerText, citedUrls[], raw }`. Start with OpenAI (web search enabled), Perplexity, Gemini (search grounding), Anthropic (web search tool). Google AI Overviews via a SERP API is phase 2. Check each provider's current API docs; do not hardcode model names outside config.
- **Prompt library**, templated and stored in DB, grouped by intent:
  - Selling: "best estate agent in {town}", "who should I sell my house with in {town}", "most recommended estate agent {area}"
  - Valuation: "who gives accurate house valuations in {town}"
  - Letting / landlords: "best letting agent in {town} for landlords", "reliable letting agent {town}"
  - Comparison / trust: "highest rated estate agents {town}", "estate agents with best reviews {town}"
  - Neighbourhood variants using {area} (e.g. Southsea, Drayton)
  - ~15–25 prompts per branch, editable by the user within plan limits
- **Repeat runs**: each prompt × engine runs N times (default 3, configurable). AI answers vary; the core metric is mention *rate*, never a single result.
- **Parsing** (Anthropic API, structured JSON output): from each answer extract ordered list of agents named, whether the tracked branch is named, its position in that list, sentiment for the branch (label positive/neutral/negative + score 0–100) with up to 5 descriptors, cited URLs and their domains. Also store the full ordered list of every agent named, so Share of Voice can be calculated for any competitor.
- **Entity matching**: branch name variants + domain match on citations. Store aliases per branch; flag low-confidence matches for review rather than guessing.
- **Competitor discovery**: any agent named in answers for a branch's prompts is added as a discovered competitor; users can pin or hide.
- **Scheduling**: paid branches weekly by default; free scan once. Queue with retries, per-provider rate limits, and a per-scan cost budget. Log token/API cost per run.

### Phase 2 — Analytics dashboard

**Four headline metrics**, shown as cards across the top of the dashboard, each with a trend line, change vs previous period, and the same figure for the top 3 competitors. The unit of measurement is one *response* = one prompt × one engine × one run.

| Card | Definition | Agent-facing copy |
|---|---|---|
| **Visibility** | Responses that name the branch ÷ all responses for the branch's tracked prompts, as a %. Unweighted. | "How often AI names you when people ask for an agent in your area." |
| **Position** | Average rank of the branch among the agents named, counted only in responses that name it. 1 = named first. Lower is better; show as "#2.4". | "Where you appear in the list when AI does name you." |
| **Sentiment** | Average 0–100 score across responses that name the branch (from the parsing step: positive / neutral / negative plus a score). Card also shows the top 3 descriptors AI uses. | "How AI describes your agency." |
| **Share of Voice** | Branch mentions ÷ total mentions of all agents across the same responses, as a %. | "Your share of all agent mentions in your area, compared to competitors." |

Rules for the cards:
- Each card is filterable by engine, intent group (selling, letting, valuation, landlord) and date range
- Each card has an info tooltip stating the exact formula and sample size ("based on 225 responses")
- Clicking a card opens the evidence: the responses behind the number, raw text viewable
- If the sample is too small to be meaningful (configurable threshold), show the value greyed out with "low sample"

Below the cards:
- **Per-engine breakdown** of all four metrics
- **Per-prompt table**: visibility and position for each tracked prompt, so agents see exactly which questions they lose
- **Competitor table**: all four metrics for every pinned/discovered competitor, plus reviews (from signals)
- **How AI describes you**: descriptor list with short snippets, each linked to its raw answer
- **Citation sources**: which domains the AI cites in answers about the town, which cite you, which cite competitors but not you (feeds fixes)
- **Prompt explorer**: every prompt, every answer, raw text viewable — users must be able to see the evidence behind every number
- **Trend charts** over time, with fix-completion events marked on the timeline
- **Competitor table**: mention rate, position, reviews (from signals)

### Phase 3 — Website AI analytics (tracking snippet)
- One-line JS snippet the agent adds to their site (plus WordPress / GTM instructions)
- Records sessions arriving from AI sources: referrers chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai, and `utm_source=chatgpt.com` style tags. Keep the source list in config.
- Captures landing page, timestamp, source; no personal data, no cookies required
- Dashboard: AI referral sessions over time, by source, by landing page
- Later (not v1): AI crawler visits (GPTBot, ClaudeBot, PerplexityBot etc.) via server log drains — JS cannot see bots

### Phase 4 — Signals + DIY fixes
**Signals collected per branch and for top competitors** (snapshot each scan, stored with timestamps):
- Website crawl: structured data present and valid (RealEstateAgent / LocalBusiness, address, reviews), area/neighbourhood pages, FAQ content, team page, fees page, valuation page, robots.txt blocking AI crawlers, llms.txt, title/meta for town terms, page speed basics
- Google Business Profile via Places API: rating, review count, recent review velocity, categories, completeness
- Third-party presence: inferred from citation domains (e.g. review and comparison sites competitors are cited from)

**Recommendation engine (rule-based for v1):**
- Each rule = condition on the branch's signals and/or the gap to recommended competitors → a fix item
- Every fix item stores: title, why (with the evidence — the actual numbers and cited sources), priority, effort (S/M/L), and a generated asset where possible
- Example rules:
  - Recommended competitors average far more Google reviews → review gap fix + review-request SMS/email templates
  - No valid RealEstateAgent schema → generated JSON-LD, ready to paste
  - Competitors cited from a domain where the branch is absent → "get listed on X" with steps
  - No pages for neighbourhoods named in prompts → area page drafts (generated, marked as drafts to edit)
  - robots.txt blocks AI crawlers → exact corrected lines
  - No FAQ answering seller questions → FAQ copy generated from the prompts they're losing
- Fix status: to do / done / dismissed. Marking done triggers re-check of the relevant signal on next scan; dashboard timeline shows the fix date so impact is visible.
- Design rule storage so rules can later be weighted by observed correlation across all scanned agents — this cross-agent dataset is the long-term moat.

### Phase 5 — Free scan funnel + league tables
- Public free scan: agent enters website + town → email gate → reduced scan (1–2 engines, ~5 prompts, 1 run) → visibility score, top 3 competitors named instead, first fix shown, rest locked → upgrade CTA
- Hard cost cap per free scan; rate-limit by email, domain and IP
- Internal admin tool: generate a **town league table** (all agents in a town, mention rate + share of voice) exported as CSV/image for the Subject to Contract newsletter. Agents list for a town can be imported via CSV.

## Data model (starting point)

`organisations`, `users`, `subscriptions`, `branches` (name, aliases, website, town, areas[], postcode, place_id), `competitors` (branch_id, name, domain, discovered/pinned/hidden), `prompts` (template, intent_group, active), `branch_prompts`, `scan_runs` (branch_id, started_at, cost, status), `scan_results` (scan_run_id, engine, prompt_id, run_index, answer_text, raw_json, mentioned, position, sentiment, descriptors[]), `citations` (scan_result_id, url, domain, is_own_domain), `agent_mentions` (scan_result_id, agent_name, position, matched_competitor_id), `signals` (branch_or_competitor_id, type, value_json, captured_at), `recommendations` (branch_id, rule_id, priority, effort, evidence_json, asset_text, status, completed_at), `referral_events` (branch_id, source, landing_path, ts), `metrics_weekly` (materialised rollups).

RLS on everything by organisation. Admin role for league tables.

## Invariants

- **Never fabricate a metric.** Every number traces to stored raw answers or stored signals. Missing values render as "—".
- **Raw AI answers are always stored and viewable.**
- **Every recommendation shows its evidence.** No generic advice without the data behind it.
- **No promises of rankings or guaranteed visibility** in UI or marketing copy. We report trends and fixes.
- Generated assets (copy, schema) are labelled as drafts for the agent to review.
- Model names, referrer lists, prompt templates and plan limits live in config/DB, not hardcoded.

## Out of scope for v1

Done-for-you services, Google AI Overviews, AI crawler log tracking, CRM integrations, white-label/reseller, public league table pages.

## Acceptance for v1

- An agent can sign up, pay, add a branch, and receive a first scan within minutes
- Dashboard shows visibility score, mention rate by engine, competitors and citations, all backed by viewable raw answers
- Tracking snippet records AI referral visits
- At least 6 fix rules live, each producing an evidence-backed item, most with a pasteable asset
- Free scan works end-to-end with cost caps
- Admin can produce a town league table export

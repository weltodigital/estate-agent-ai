-- Privett v1 schema: AI search visibility for UK estate and letting agents.
--
-- Conventions
--   * Every tenant-owned row carries org_id so RLS is one indexed check.
--   * Raw AI answers are stored verbatim (scan_results.answer_text / raw_json)
--     and are never deleted by application code. Every metric traces to them.
--   * API costs are USD (providers bill in USD), stored as numeric(12,6).
--   * Plan prices live in Stripe + packages/core config, not here.


-- ---------------------------------------------------------------------------
-- Identity and tenancy
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stripe_customer_id text unique,
  -- false for orgs created by the public free scan before anyone signs up.
  claimed boolean not null default true,
  created_at timestamptz not null default now()
);

create type public.org_role as enum ('owner', 'member');

create table public.organisation_members (
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on public.organisation_members (user_id);

create table public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references public.profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  plan_id text not null,                 -- key into PLANS in packages/core
  status text not null,                  -- Stripe status verbatim
  branch_quantity int not null default 1,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.subscriptions (org_id);

-- ---------------------------------------------------------------------------
-- Branches, competitors, prompts
-- ---------------------------------------------------------------------------

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}',
  website text,
  domain text,                           -- normalised host, no www.
  town text not null,
  areas text[] not null default '{}',    -- neighbourhoods, e.g. {Southsea, Drayton}
  postcode text,
  place_id text,                         -- Google Places id
  -- Public key embedded in the tracking snippet. Not a secret: it only allows
  -- inserting referral events for this branch.
  tracking_key uuid not null unique default gen_random_uuid(),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.branches (org_id);

create type public.competitor_status as enum ('discovered', 'pinned', 'hidden');

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  name text not null,
  normalised_name text not null,
  aliases text[] not null default '{}',
  domain text,
  place_id text,
  status public.competitor_status not null default 'discovered',
  first_seen_at timestamptz not null default now(),
  unique (branch_id, normalised_name)
);
create index on public.competitors (org_id);

create type public.intent_group as enum ('selling', 'valuation', 'letting', 'landlord', 'comparison');

-- Prompt library. org_id null = the global Privett library (seeded).
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations (id) on delete cascade,
  template text not null,                -- uses {town} and {area}
  intent_group public.intent_group not null,
  uses_area boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- The concrete, rendered prompts tracked for a branch. Users may edit text.
create table public.branch_prompts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  prompt_id uuid references public.prompts (id) on delete set null,
  text text not null,
  intent_group public.intent_group not null,
  area text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.branch_prompts (branch_id) where active;

-- ---------------------------------------------------------------------------
-- League tables (admin only)
-- ---------------------------------------------------------------------------

create table public.league_tables (
  id uuid primary key default gen_random_uuid(),
  town text not null,
  areas text[] not null default '{}',
  status text not null default 'draft',  -- draft | queued | running | completed | failed
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.league_agents (
  id uuid primary key default gen_random_uuid(),
  league_table_id uuid not null references public.league_tables (id) on delete cascade,
  name text not null,
  normalised_name text not null,
  domain text,
  aliases text[] not null default '{}',
  unique (league_table_id, normalised_name)
);

-- ---------------------------------------------------------------------------
-- Scans
-- ---------------------------------------------------------------------------

create type public.scan_kind as enum ('scheduled', 'manual', 'free', 'league');
create type public.scan_status as enum ('queued', 'running', 'completed', 'failed', 'budget_exceeded');

-- scan_runs doubles as the job queue (claimed with FOR UPDATE SKIP LOCKED).
create table public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  league_table_id uuid references public.league_tables (id) on delete cascade,
  kind public.scan_kind not null,
  status public.scan_status not null default 'queued',
  engines text[] not null,
  runs_per_prompt int not null default 3,
  budget_usd numeric(12, 6) not null,
  cost_usd numeric(12, 6) not null default 0,
  scheduled_for timestamptz not null default now(),
  attempts int not null default 0,
  max_attempts int not null default 3,
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  finished_at timestamptz,
  progress jsonb not null default '{}',  -- {done, total}
  error text,
  created_at timestamptz not null default now(),
  check ((branch_id is not null) <> (league_table_id is not null))
);
create index on public.scan_runs (status, scheduled_for);
create index on public.scan_runs (branch_id, created_at desc);

-- One response = one prompt x one engine x one run.
create table public.scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid not null references public.scan_runs (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  branch_prompt_id uuid references public.branch_prompts (id) on delete set null,
  engine text not null,
  model text not null,
  prompt_text text not null,
  intent_group public.intent_group not null,
  run_index int not null,
  answer_text text,
  raw_json jsonb,
  -- Parse outputs. null when parse_status <> 'ok'; such rows are excluded
  -- from every metric denominator rather than counted as "not mentioned".
  parse_status text not null default 'pending',   -- pending | ok | failed | engine_error
  mentioned boolean,
  position int,
  sentiment_label text,                  -- positive | neutral | negative
  sentiment_score int check (sentiment_score between 0 and 100),
  descriptors text[] not null default '{}',
  match_confidence text,                 -- high | low | none
  needs_review boolean not null default false,
  error text,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index on public.scan_results (branch_id, created_at desc);
create index on public.scan_results (scan_run_id);

create table public.citations (
  id uuid primary key default gen_random_uuid(),
  scan_result_id uuid not null references public.scan_results (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  url text not null,
  domain text not null,
  is_own_domain boolean not null default false,
  competitor_id uuid references public.competitors (id) on delete set null
);
create index on public.citations (scan_result_id);
create index on public.citations (branch_id, domain);

create table public.agent_mentions (
  id uuid primary key default gen_random_uuid(),
  scan_result_id uuid not null references public.scan_results (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  agent_name text not null,
  normalised_name text not null,
  position int not null,
  is_branch boolean not null default false,
  matched_competitor_id uuid references public.competitors (id) on delete set null,
  matched_league_agent_id uuid references public.league_agents (id) on delete set null,
  match_confidence text not null default 'high',
  sentiment_score int,
  descriptors text[] not null default '{}'
);
create index on public.agent_mentions (scan_result_id);
create index on public.agent_mentions (matched_competitor_id);

-- Every paid API call, for cost control and per-scan budgets.
create table public.api_cost_log (
  id bigint generated always as identity primary key,
  scan_run_id uuid references public.scan_runs (id) on delete set null,
  provider text not null,
  model text not null,
  purpose text not null,                 -- answer | parse | asset | places | crawl
  input_tokens int,
  output_tokens int,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Signals and recommendations
-- ---------------------------------------------------------------------------

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  competitor_id uuid references public.competitors (id) on delete cascade,
  scan_run_id uuid references public.scan_runs (id) on delete set null,
  type text not null,                    -- website_crawl | google_business | third_party
  value_json jsonb not null,
  captured_at timestamptz not null default now(),
  check ((branch_id is not null) <> (competitor_id is not null))
);
create index on public.signals (branch_id, type, captured_at desc);
create index on public.signals (competitor_id, type, captured_at desc);

create type public.recommendation_status as enum ('todo', 'done', 'dismissed');

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  rule_id text not null,
  rule_version int not null default 1,
  -- Stable identity of "this fix for this branch" (e.g. rule + cited domain),
  -- so re-scans update the evidence instead of creating duplicates.
  fingerprint text not null,
  title text not null,
  why text not null,
  priority int not null,                 -- 1 (highest) .. 5
  effort text not null check (effort in ('S', 'M', 'L')),
  evidence_json jsonb not null,
  asset_kind text,                       -- json-ld | robots | faq | area-page | review-templates | llms-txt | steps
  asset_text text,
  asset_status text not null default 'none', -- none | pending | ready | failed
  status public.recommendation_status not null default 'todo',
  completed_at timestamptz,
  -- Set when a later scan re-checks the signal after the fix was marked done.
  verified_at timestamptz,
  verified_result text,                  -- resolved | still_present
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, fingerprint)
);

-- Per-rule weights. v1 is uniform; later fitted from the cross-agent dataset.
create table public.rule_weights (
  rule_id text primary key,
  weight numeric not null default 1,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Website AI referrals (tracking snippet). No personal data, no cookies.
-- ---------------------------------------------------------------------------

create table public.referral_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  source text not null,                  -- chatgpt | perplexity | gemini | copilot | claude | ...
  landing_path text not null,
  ts timestamptz not null default now()
);
create index on public.referral_events (branch_id, ts desc);

-- ---------------------------------------------------------------------------
-- Weekly rollups, written by the worker after each scan completes.
-- ---------------------------------------------------------------------------

create table public.metrics_weekly (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  week_start date not null,
  engine text not null default 'all',
  intent_group text not null default 'all',
  subject_kind text not null,            -- branch | competitor
  subject_id uuid not null,
  responses int not null,
  mentions int not null,
  visibility numeric,
  avg_position numeric,
  avg_sentiment numeric,
  share_of_voice numeric,
  updated_at timestamptz not null default now(),
  unique (branch_id, week_start, engine, intent_group, subject_kind, subject_id)
);

-- ---------------------------------------------------------------------------
-- Public free scan funnel
-- ---------------------------------------------------------------------------

create table public.free_scans (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  website text not null,
  domain text not null,
  town text not null,
  agency_name text not null,
  ip_hash text not null,
  access_token uuid not null unique default gen_random_uuid(),
  org_id uuid references public.organisations (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  scan_run_id uuid references public.scan_runs (id) on delete set null,
  claimed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.free_scans (email, created_at desc);
create index on public.free_scans (domain, created_at desc);
create index on public.free_scans (ip_hash, created_at desc);

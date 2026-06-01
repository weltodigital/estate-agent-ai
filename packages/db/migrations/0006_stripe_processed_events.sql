-- Migration: 0006_stripe_processed_events
-- Purpose: Replay protection for Stripe webhook deliveries. Stripe retries
--          deliveries on non-2xx and may resend after timeouts, so each
--          event_id is recorded the first time we process it; subsequent
--          deliveries are a no-op.
--
-- Rollback notes:
--   drop table public.stripe_processed_events;

create table public.stripe_processed_events (
  event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

create index stripe_processed_events_processed_at_idx
  on public.stripe_processed_events(processed_at desc);

-- Service-role-only. No RLS policies for authenticated users.
alter table public.stripe_processed_events enable row level security;

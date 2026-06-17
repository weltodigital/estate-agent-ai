-- Extends usage_events so it can back a property's Activity tab, not just billing.
--   1. Adds a 'status_changed' usage_event_type for listing status transitions
--      (draft -> active -> under_offer -> sold, etc.). This is an audit-only
--      event: it is NOT a billing meter, so TIER_LIMITS, quota enforcement, and
--      the Billing tab (which only iterate the original metered events) ignore it.
--   2. Adds a metadata jsonb column to carry per-event detail. For a status
--      change it holds {"from": "<status>", "to": "<status>"}. Existing rows
--      backfill to '{}' via the default.
--
-- Rollback notes:
--   - Postgres cannot DROP a value from an enum. To revert the enum, relabel or
--     delete any rows using 'status_changed', then recreate the type without it
--     (rename old -> create new -> ALTER COLUMN ... USING cast -> drop old).
--   - Drop the column: alter table public.usage_events drop column metadata;

alter type public.usage_event_type add value if not exists 'status_changed';

alter table public.usage_events
  add column metadata jsonb not null default '{}'::jsonb;

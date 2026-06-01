-- Migration: 0004_epc_cache
-- Purpose: Cache GOV.UK EPC Register responses, keyed on normalised postcode.
--          Records are stored agency-agnostic (EPC data is public). The API
--          mediates all access via the service-role client; the table has no
--          policies for authenticated users.
--
-- Rollback notes:
--   drop table public.epc_cache;
--   drop function public.normalise_postcode(text);

create or replace function public.normalise_postcode(p text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p, ''), '\s+', '', 'g'))
$$;

create table public.epc_cache (
  postcode_normalised text primary key,
  results jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index epc_cache_expires_at_idx on public.epc_cache(expires_at);

alter table public.epc_cache enable row level security;
-- Intentionally no policies: only the service-role client may read or write.

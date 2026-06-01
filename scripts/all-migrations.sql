-- =========================================================
-- 0001_initial.sql
-- =========================================================

-- Migration: 0001_initial
-- Purpose: Initial schema — agencies, branches, users, properties, photos,
--          floor plans, video campaigns, usage events. UUID PKs, updated_at
--          triggers, enums.
--
-- Rollback notes:
--   drop table public.usage_events;
--   drop table public.video_campaigns;
--   drop table public.floor_plans;
--   drop table public.property_photos;
--   drop table public.properties;
--   drop table public.users;
--   drop table public.branches;
--   drop table public.agencies;
--   drop function public.set_updated_at();
--   drop function public.current_agency_id();
--   drop type public.tone, public.watermark_position, public.floor_plan_template,
--             public.subscription_tier, public.user_role, public.uk_property_type,
--             public.listing_type, public.property_status, public.room_type,
--             public.staging_style, public.floor_plan_status, public.video_template,
--             public.video_format, public.video_status, public.usage_event_type;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.tone as enum ('professional', 'friendly', 'luxury', 'lettings');
create type public.watermark_position as enum ('top-left', 'top-right', 'bottom-left', 'bottom-right');
create type public.floor_plan_template as enum ('minimal', 'classic', 'bold');
create type public.subscription_tier as enum ('starter', 'pro', 'business', 'agency');
create type public.user_role as enum ('admin', 'agent', 'viewer');
create type public.uk_property_type as enum ('detached', 'semi-detached', 'terraced', 'flat', 'bungalow', 'other');
create type public.listing_type as enum ('sale', 'rent');
create type public.property_status as enum ('draft', 'active', 'under_offer', 'sold', 'let', 'withdrawn');
create type public.room_type as enum ('living_room', 'bedroom', 'kitchen', 'bathroom', 'exterior', 'garden', 'other');
create type public.staging_style as enum ('modern', 'scandi', 'classic', 'minimal', 'luxury', 'family');
create type public.floor_plan_status as enum ('uploaded', 'parsing', 'parsed', 'editing', 'finalised', 'failed');
create type public.video_template as enum ('modern', 'bold', 'classic');
create type public.video_format as enum ('16:9', '1:1', '9:16');
create type public.video_status as enum ('queued', 'processing', 'complete', 'failed');
create type public.usage_event_type as enum (
  'listing_created',
  'photo_enhanced',
  'staging_generated',
  'floor_plan_created',
  'video_generated',
  'description_generated',
  'epc_lookup'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- agencies
-- ---------------------------------------------------------------------------
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  brand_colour_primary text,
  brand_colour_secondary text,
  default_tone public.tone not null default 'professional',
  default_watermark_position public.watermark_position not null default 'bottom-right',
  floor_plan_template public.floor_plan_template not null default 'minimal',
  subscription_tier public.subscription_tier not null default 'starter',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger agencies_set_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  address text,
  postcode text,
  phone text,
  listings_this_month integer not null default 0,
  monthly_listing_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index branches_agency_id_idx on public.branches(agency_id);
create trigger branches_set_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- users (1:1 with auth.users, FK on id)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'agent',
  avatar_url text,
  invited_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_agency_id_idx on public.users(agency_id);
create index users_branch_id_idx on public.users(branch_id);
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- current_agency_id() helper. Used in RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_by uuid not null references public.users(id) on delete restrict,
  address_line_1 text not null,
  address_line_2 text,
  town text not null,
  postcode text not null,
  property_type public.uk_property_type not null,
  listing_type public.listing_type not null,
  bedrooms integer not null default 0,
  bathrooms integer not null default 0,
  price_pence bigint not null default 0,
  status public.property_status not null default 'draft',
  description text,
  description_tone public.tone,
  epc_current_rating char(1),
  epc_potential_rating char(1),
  epc_expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_agency_id_idx on public.properties(agency_id);
create index properties_branch_id_idx on public.properties(branch_id);
create index properties_status_idx on public.properties(status);
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- property_photos
-- ---------------------------------------------------------------------------
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  original_url text not null,
  enhanced_url text,
  staged_url text,
  dusk_url text,
  room_type public.room_type not null default 'other',
  sort_order integer not null default 0,
  enhancements_applied jsonb not null default '[]'::jsonb,
  staging_style public.staging_style,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index property_photos_property_id_idx on public.property_photos(property_id);
create unique index property_photos_one_primary_per_property_idx
  on public.property_photos(property_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- floor_plans
-- ---------------------------------------------------------------------------
create table public.floor_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  floor_label text not null,
  sketch_url text not null,
  parsed_json jsonb,
  editor_state jsonb,
  status public.floor_plan_status not null default 'uploaded',
  parse_error text,
  output_svg_url text,
  output_pdf_url text,
  output_png_url text,
  total_area_sqm numeric,
  include_furniture boolean not null default false,
  finalised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index floor_plans_property_id_idx on public.floor_plans(property_id);
create index floor_plans_status_idx on public.floor_plans(status);
create trigger floor_plans_set_updated_at
  before update on public.floor_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- video_campaigns
-- ---------------------------------------------------------------------------
create table public.video_campaigns (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  template public.video_template not null,
  photo_ids uuid[] not null default '{}',
  format public.video_format not null default '16:9',
  video_url text,
  status public.video_status not null default 'queued',
  created_at timestamptz not null default now()
);
create index video_campaigns_property_id_idx on public.video_campaigns(property_id);

-- ---------------------------------------------------------------------------
-- usage_events  (the billing/quota ledger)
-- ---------------------------------------------------------------------------
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  event_type public.usage_event_type not null,
  units_consumed integer not null default 1,
  billable boolean not null default true,
  created_at timestamptz not null default now()
);
create index usage_events_agency_id_created_at_idx
  on public.usage_events(agency_id, created_at desc);
create index usage_events_event_type_idx on public.usage_events(event_type);

-- ---------------------------------------------------------------------------
-- Bootstrap helper functions (called from API via Supabase RPC).
-- ---------------------------------------------------------------------------

-- Creates an agency, an initial branch, and the public.users row for the
-- caller. Runs atomically; raises if any step fails.
create or replace function public.bootstrap_new_agency(
  p_full_name text,
  p_agency_name text,
  p_agency_slug text,
  p_branch_postcode text
)
returns table (agency_id uuid, branch_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_branch_id uuid;
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'bootstrap_new_agency requires an authenticated caller';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.agencies (name, slug)
  values (p_agency_name, p_agency_slug)
  returning id into v_agency_id;

  insert into public.branches (agency_id, name, postcode)
  values (v_agency_id, p_agency_name || ' — Head Office', p_branch_postcode)
  returning id into v_branch_id;

  insert into public.users (id, agency_id, branch_id, email, full_name, role)
  values (v_user_id, v_agency_id, v_branch_id, v_email, p_full_name, 'admin');

  return query select v_agency_id, v_branch_id, v_user_id;
end;
$$;

-- Completes an invited user's signup. The invite token mapping is enforced in
-- the API layer for v1; this function just creates the public.users row.
create or replace function public.bootstrap_invited_user(
  p_full_name text,
  p_agency_id uuid,
  p_branch_id uuid,
  p_role public.user_role,
  p_invited_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'bootstrap_invited_user requires an authenticated caller';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.users (id, agency_id, branch_id, email, full_name, role, invited_by)
  values (v_user_id, p_agency_id, p_branch_id, v_email, p_full_name, p_role, p_invited_by);

  return v_user_id;
end;
$$;

-- =========================================================
-- 0002_rls_policies.sql
-- =========================================================

-- Migration: 0002_rls_policies
-- Purpose: Enable RLS on every tenant-scoped table and define agency-scoped
--          policies. All policies key on current_agency_id() (defined in 0001).
--
-- Rollback notes:
--   alter table ... disable row level security;
--   drop policy ... on ...;

-- ---------------------------------------------------------------------------
-- agencies
--   Read: the caller's own agency only.
--   Write: admins can update their own agency.
-- ---------------------------------------------------------------------------
alter table public.agencies enable row level security;

create policy agencies_select_own
  on public.agencies for select
  using (id = public.current_agency_id());

create policy agencies_update_own_admins
  on public.agencies for update
  using (
    id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- No insert/delete from authenticated users — that goes through the
-- bootstrap_new_agency function (security definer).

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
alter table public.branches enable row level security;

create policy branches_select_own_agency
  on public.branches for select
  using (agency_id = public.current_agency_id());

create policy branches_insert_own_agency_admin
  on public.branches for insert
  with check (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy branches_update_own_agency_admin
  on public.branches for update
  using (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy branches_delete_own_agency_admin
  on public.branches for delete
  using (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- users
--   Read: members of the same agency.
--   Update self always; admins can update anyone in their agency.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

create policy users_select_own_agency
  on public.users for select
  using (agency_id = public.current_agency_id());

create policy users_update_self
  on public.users for update
  using (id = auth.uid());

create policy users_update_by_admin
  on public.users for update
  using (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy users_delete_by_admin
  on public.users for delete
  using (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users u2
      where u2.id = auth.uid() and u2.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
alter table public.properties enable row level security;

create policy properties_select_own_agency
  on public.properties for select
  using (agency_id = public.current_agency_id());

create policy properties_insert_own_agency
  on public.properties for insert
  with check (agency_id = public.current_agency_id());

create policy properties_update_own_agency
  on public.properties for update
  using (agency_id = public.current_agency_id());

create policy properties_delete_own_agency
  on public.properties for delete
  using (agency_id = public.current_agency_id());

-- ---------------------------------------------------------------------------
-- property_photos  (scoped via the parent property)
-- ---------------------------------------------------------------------------
alter table public.property_photos enable row level security;

create policy property_photos_select_own_agency
  on public.property_photos for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy property_photos_insert_own_agency
  on public.property_photos for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy property_photos_update_own_agency
  on public.property_photos for update
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy property_photos_delete_own_agency
  on public.property_photos for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

-- ---------------------------------------------------------------------------
-- floor_plans
-- ---------------------------------------------------------------------------
alter table public.floor_plans enable row level security;

create policy floor_plans_select_own_agency
  on public.floor_plans for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy floor_plans_insert_own_agency
  on public.floor_plans for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy floor_plans_update_own_agency
  on public.floor_plans for update
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy floor_plans_delete_own_agency
  on public.floor_plans for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

-- ---------------------------------------------------------------------------
-- video_campaigns
-- ---------------------------------------------------------------------------
alter table public.video_campaigns enable row level security;

create policy video_campaigns_select_own_agency
  on public.video_campaigns for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy video_campaigns_insert_own_agency
  on public.video_campaigns for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy video_campaigns_update_own_agency
  on public.video_campaigns for update
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

create policy video_campaigns_delete_own_agency
  on public.video_campaigns for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.agency_id = public.current_agency_id()
    )
  );

-- ---------------------------------------------------------------------------
-- usage_events  (read-only for clients; writes happen via service role)
-- ---------------------------------------------------------------------------
alter table public.usage_events enable row level security;

create policy usage_events_select_own_agency
  on public.usage_events for select
  using (agency_id = public.current_agency_id());

-- Inserts are performed by the API using the service-role client. No insert
-- policy is exposed to authenticated users.

-- =========================================================
-- 0003_agency_invites.sql
-- =========================================================

-- Migration: 0003_agency_invites
-- Purpose: Invite tokens for adding team members to an agency. An admin
--          creates an invite; the invitee follows /accept-invite?token=...
--          to claim it, which calls bootstrap_invited_user.
--          Also: slug-generation helper used by bootstrap_new_agency.
--
-- Rollback notes:
--   drop function public.bootstrap_invited_user(text, text);
--   drop function public.bootstrap_new_agency(text, text, text);
--   drop function public.consume_agency_invite(text);
--   drop function public.unique_agency_slug(text);
--   drop table public.agency_invites;

-- ---------------------------------------------------------------------------
-- agency_invites
-- ---------------------------------------------------------------------------
create table public.agency_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  email text not null,
  full_name text,
  role public.user_role not null default 'agent',
  token text not null unique,
  invited_by uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index agency_invites_agency_id_idx on public.agency_invites(agency_id);
create index agency_invites_token_idx on public.agency_invites(token);
create unique index agency_invites_pending_email_per_agency_idx
  on public.agency_invites(agency_id, lower(email))
  where accepted_at is null;

alter table public.agency_invites enable row level security;

-- Admins of the agency can read and write invites for their own agency.
create policy agency_invites_select_admins
  on public.agency_invites for select
  using (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy agency_invites_insert_admins
  on public.agency_invites for insert
  with check (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy agency_invites_delete_admins
  on public.agency_invites for delete
  using (
    agency_id = public.current_agency_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Slug helper: deterministic + unique.
-- ---------------------------------------------------------------------------
create or replace function public.unique_agency_slug(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 1;
begin
  v_base := lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if length(v_base) = 0 then
    v_base := 'agency';
  end if;
  v_candidate := v_base;
  while exists (select 1 from public.agencies where slug = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
  end loop;
  return v_candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- bootstrap_new_agency (replaces 0001 signature: now derives the slug itself).
-- ---------------------------------------------------------------------------
drop function if exists public.bootstrap_new_agency(text, text, text, text);

create or replace function public.bootstrap_new_agency(
  p_full_name text,
  p_agency_name text,
  p_branch_postcode text
)
returns table (agency_id uuid, branch_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_branch_id uuid;
  v_user_id uuid := auth.uid();
  v_email text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'bootstrap_new_agency requires an authenticated caller';
  end if;

  if exists (select 1 from public.users where id = v_user_id) then
    raise exception 'user already belongs to an agency';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  v_slug := public.unique_agency_slug(p_agency_name);

  insert into public.agencies (name, slug)
  values (p_agency_name, v_slug)
  returning id into v_agency_id;

  insert into public.branches (agency_id, name, postcode)
  values (v_agency_id, p_agency_name || ' — Head Office', p_branch_postcode)
  returning id into v_branch_id;

  insert into public.users (id, agency_id, branch_id, email, full_name, role)
  values (v_user_id, v_agency_id, v_branch_id, v_email, p_full_name, 'admin');

  return query select v_agency_id, v_branch_id, v_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- consume_agency_invite: validates a token and inserts public.users.
-- Replaces the simpler bootstrap_invited_user from 0001.
-- ---------------------------------------------------------------------------
drop function if exists public.bootstrap_invited_user(text, uuid, uuid, public.user_role, uuid);

create or replace function public.consume_agency_invite(
  p_token text,
  p_full_name text
)
returns table (user_id uuid, agency_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'consume_agency_invite requires an authenticated caller';
  end if;

  if exists (select 1 from public.users where id = v_user_id) then
    raise exception 'user already belongs to an agency';
  end if;

  select * into v_invite
  from public.agency_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite_already_used';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if lower(v_email) <> lower(v_invite.email) then
    raise exception 'invite_email_mismatch';
  end if;

  insert into public.users (
    id, agency_id, branch_id, email, full_name, role, invited_by
  ) values (
    v_user_id,
    v_invite.agency_id,
    v_invite.branch_id,
    v_email,
    coalesce(p_full_name, v_invite.full_name, v_email),
    v_invite.role,
    v_invite.invited_by
  );

  update public.agency_invites
  set accepted_at = now(), accepted_by = v_user_id
  where id = v_invite.id;

  return query select v_user_id, v_invite.agency_id;
end;
$$;

-- =========================================================
-- 0004_epc_cache.sql
-- =========================================================

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

-- =========================================================
-- 0005_staging_variations.sql
-- =========================================================

-- Migration: 0005_staging_variations
-- Purpose: Persist AI staging variations alongside the photo so "save and
--          compare" survives a page reload. The chosen variation becomes
--          property_photos.staged_url + property_photos.staging_style.
--
-- Rollback notes:
--   alter table public.property_photos drop column suggested_style;
--   alter table public.property_photos drop column staging_variations;

alter table public.property_photos
  add column staging_variations jsonb not null default '[]'::jsonb;

alter table public.property_photos
  add column suggested_style public.staging_style;

-- staging_variations shape (JSON):
--   [{ id: uuid, style: staging_style, url: text, sort_order: int, selected: bool }]

-- =========================================================
-- 0006_stripe_processed_events.sql
-- =========================================================

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


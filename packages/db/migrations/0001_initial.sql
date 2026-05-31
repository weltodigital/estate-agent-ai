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

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

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

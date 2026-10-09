-- Row Level Security, helper functions, and triggers.
--
-- Model: users see rows for organisations they belong to. Writes that must
-- respect plan limits or cost (scan_runs, branches, subscriptions,
-- referral_events, free_scans) go through the server with the service role
-- after a limit check, so authenticated users get no direct insert on them.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner(target_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members m
    where m.org_id = target_org and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Profile row for every auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Called from onboarding. Creates an org and makes the caller its owner.
create or replace function public.create_organisation(org_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.organisations (name) values (org_name) returning id into new_org;
  insert into public.organisation_members (org_id, user_id, role) values (new_org, auth.uid(), 'owner');
  return new_org;
end;
$$;

-- Worker queue: atomically claim the next due scan run.
create or replace function public.claim_scan_run(worker_id text, stale_after interval default interval '30 minutes')
returns setof public.scan_runs
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.scan_runs r
  set status = 'running',
      locked_at = now(),
      locked_by = worker_id,
      attempts = r.attempts + 1,
      started_at = coalesce(r.started_at, now())
  where r.id = (
    select id from public.scan_runs
    where (
      (status = 'queued' and scheduled_for <= now())
      -- Reclaim runs whose worker died mid-scan.
      or (status = 'running' and locked_at < now() - stale_after)
    )
    and attempts < max_attempts
    order by scheduled_for
    limit 1
    for update skip locked
  )
  returning r.*;
end;
$$;
revoke all on function public.claim_scan_run(text, interval) from public, anon, authenticated;

-- Atomically add cost to a run; returns the new total.
create or replace function public.add_scan_cost(run_id uuid, amount numeric)
returns numeric
language sql security definer set search_path = public as $$
  update public.scan_runs set cost_usd = cost_usd + amount where id = run_id returning cost_usd;
$$;
revoke all on function public.add_scan_cost(uuid, numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.organisation_invites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.branches enable row level security;
alter table public.competitors enable row level security;
alter table public.prompts enable row level security;
alter table public.branch_prompts enable row level security;
alter table public.league_tables enable row level security;
alter table public.league_agents enable row level security;
alter table public.scan_runs enable row level security;
alter table public.scan_results enable row level security;
alter table public.citations enable row level security;
alter table public.agent_mentions enable row level security;
alter table public.api_cost_log enable row level security;
alter table public.signals enable row level security;
alter table public.recommendations enable row level security;
alter table public.rule_weights enable row level security;
alter table public.referral_events enable row level security;
alter table public.metrics_weekly enable row level security;
alter table public.free_scans enable row level security;

-- profiles: yourself, and colleagues in your organisations.
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.organisation_members a
    join public.organisation_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
  or public.is_admin()
);
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Users may edit their own profile but never grant themselves admin. (A
-- policy can't compare against the old row without recursing into profiles.)
create or replace function public.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' and new.is_admin is distinct from old.is_admin then
    raise exception 'is_admin can only be changed by an administrator';
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create policy organisations_select on public.organisations for select using (public.is_org_member(id) or public.is_admin());
create policy organisations_update on public.organisations for update using (public.is_org_owner(id));

create policy members_select on public.organisation_members for select using (public.is_org_member(org_id));
create policy members_delete on public.organisation_members for delete using (public.is_org_owner(org_id) and user_id <> auth.uid());

create policy invites_select on public.organisation_invites for select using (public.is_org_member(org_id));
create policy invites_insert on public.organisation_invites for insert with check (public.is_org_owner(org_id));
create policy invites_delete on public.organisation_invites for delete using (public.is_org_owner(org_id));

create policy subscriptions_select on public.subscriptions for select using (public.is_org_member(org_id));

-- Branch inserts go through the server (plan limit on branch count).
create policy branches_select on public.branches for select using (public.is_org_member(org_id) or public.is_admin());
create policy branches_update on public.branches for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy competitors_select on public.competitors for select using (public.is_org_member(org_id));
create policy competitors_insert on public.competitors for insert with check (public.is_org_member(org_id));
create policy competitors_update on public.competitors for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy prompts_select on public.prompts for select using (org_id is null or public.is_org_member(org_id));

-- Branch prompt inserts go through the server (plan limit on prompt count);
-- edits and deactivation are direct.
create policy branch_prompts_select on public.branch_prompts for select using (public.is_org_member(org_id));
create policy branch_prompts_update on public.branch_prompts for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy league_tables_admin on public.league_tables for all using (public.is_admin()) with check (public.is_admin());
create policy league_agents_admin on public.league_agents for all using (public.is_admin()) with check (public.is_admin());

create policy scan_runs_select on public.scan_runs for select using (
  (org_id is not null and public.is_org_member(org_id)) or public.is_admin()
);
create policy scan_results_select on public.scan_results for select using (
  (org_id is not null and public.is_org_member(org_id)) or public.is_admin()
);
create policy citations_select on public.citations for select using (
  (org_id is not null and public.is_org_member(org_id)) or public.is_admin()
);
create policy agent_mentions_select on public.agent_mentions for select using (
  (org_id is not null and public.is_org_member(org_id)) or public.is_admin()
);
create policy api_cost_log_admin on public.api_cost_log for select using (public.is_admin());

create policy signals_select on public.signals for select using (public.is_org_member(org_id));

create policy recommendations_select on public.recommendations for select using (public.is_org_member(org_id));
create policy recommendations_update on public.recommendations for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy rule_weights_admin on public.rule_weights for all using (public.is_admin()) with check (public.is_admin());

create policy referral_events_select on public.referral_events for select using (public.is_org_member(org_id));

create policy metrics_weekly_select on public.metrics_weekly for select using (public.is_org_member(org_id));

create policy free_scans_admin on public.free_scans for select using (public.is_admin());

-- Members may only change status-type fields on recommendations and
-- competitors; evidence is written by the worker (service role).
create or replace function public.guard_recommendation_update()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    if new.rule_id <> old.rule_id or new.evidence_json <> old.evidence_json or new.why <> old.why
       or new.title <> old.title or coalesce(new.asset_text, '') <> coalesce(old.asset_text, '') then
      raise exception 'only status may be changed';
    end if;
    if new.status = 'done' and old.status <> 'done' then
      new.completed_at := now();
      new.verified_at := null;
      new.verified_result := null;
    elsif new.status <> 'done' then
      new.completed_at := null;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger recommendations_guard before update on public.recommendations
  for each row execute function public.guard_recommendation_update();

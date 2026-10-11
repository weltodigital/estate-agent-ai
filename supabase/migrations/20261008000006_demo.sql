-- Public read-only demo: an invented agency anyone can browse at
-- /sample-report. Rows belonging to a demo organisation are readable by
-- everyone (anon and signed-in); nothing about them is writable through the
-- API. Real organisations are unaffected: these policies only OR in rows
-- whose org is flagged is_demo.

alter table public.organisations add column if not exists is_demo boolean not null default false;

create or replace function public.is_demo_org(target_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from public.organisations where id = target_org), false);
$$;
grant execute on function public.is_demo_org(uuid) to anon, authenticated;

grant usage on schema public to anon;
grant select on
  public.organisations, public.branches, public.competitors, public.branch_prompts,
  public.scan_runs, public.scan_results, public.citations, public.agent_mentions,
  public.signals, public.recommendations, public.metrics_weekly, public.referral_events
to anon;

create policy organisations_demo_read on public.organisations for select to anon, authenticated using (is_demo);
create policy branches_demo_read on public.branches for select to anon, authenticated using (public.is_demo_org(org_id));
create policy competitors_demo_read on public.competitors for select to anon, authenticated using (public.is_demo_org(org_id));
create policy branch_prompts_demo_read on public.branch_prompts for select to anon, authenticated using (public.is_demo_org(org_id));
create policy scan_runs_demo_read on public.scan_runs for select to anon, authenticated using (org_id is not null and public.is_demo_org(org_id));
create policy scan_results_demo_read on public.scan_results for select to anon, authenticated using (org_id is not null and public.is_demo_org(org_id));
create policy citations_demo_read on public.citations for select to anon, authenticated using (org_id is not null and public.is_demo_org(org_id));
create policy agent_mentions_demo_read on public.agent_mentions for select to anon, authenticated using (org_id is not null and public.is_demo_org(org_id));
create policy signals_demo_read on public.signals for select to anon, authenticated using (public.is_demo_org(org_id));
create policy recommendations_demo_read on public.recommendations for select to anon, authenticated using (public.is_demo_org(org_id));
create policy metrics_weekly_demo_read on public.metrics_weekly for select to anon, authenticated using (public.is_demo_org(org_id));
create policy referral_events_demo_read on public.referral_events for select to anon, authenticated using (public.is_demo_org(org_id));

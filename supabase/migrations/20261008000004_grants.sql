-- Explicit table privileges. Supabase's defaults normally grant these, but a
-- project whose public schema was recreated by hand may only grant SELECT,
-- which would make every RLS-permitted write fail. RLS still decides which
-- rows each user can touch; these grants only make the tables reachable.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on function public.create_organisation(text) to authenticated;
grant execute on function public.is_org_member(uuid), public.is_org_owner(uuid), public.is_admin() to authenticated;
-- Worker-only functions stay revoked from users (see the RLS migration).
grant execute on function public.claim_scan_run(text, interval), public.add_scan_cost(uuid, numeric) to service_role;

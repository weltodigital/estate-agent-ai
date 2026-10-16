-- Account deletion: removing a user must never be blocked by a record they
-- once created. These references are history, not ownership, so they clear.

alter table public.organisation_invites drop constraint organisation_invites_invited_by_fkey;
alter table public.organisation_invites
  add constraint organisation_invites_invited_by_fkey
  foreign key (invited_by) references public.profiles (id) on delete set null;

alter table public.league_tables drop constraint league_tables_created_by_fkey;
alter table public.league_tables
  add constraint league_tables_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.free_scans drop constraint free_scans_claimed_by_fkey;
alter table public.free_scans
  add constraint free_scans_claimed_by_fkey
  foreign key (claimed_by) references public.profiles (id) on delete set null;

-- Owners can make another member an owner, so the last owner can hand over
-- before deleting their account. A function rather than an update policy, so
-- only the role can change, never which organisation a member belongs to.
create or replace function public.make_org_owner(target_org uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_owner(target_org) then
    raise exception 'Only an owner can do that.';
  end if;
  update public.organisation_members
    set role = 'owner'
    where org_id = target_org and user_id = target_user;
end;
$$;
revoke execute on function public.make_org_owner(uuid, uuid) from public, anon;
grant execute on function public.make_org_owner(uuid, uuid) to authenticated;

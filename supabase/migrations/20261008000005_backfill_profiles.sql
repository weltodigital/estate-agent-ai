-- Profiles for auth users created before the on_auth_user_created trigger
-- existed (e.g. a reused project). Safe to re-run.
insert into public.profiles (id, email, full_name)
select u.id, coalesce(u.email, ''), coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
from auth.users u
on conflict (id) do nothing;

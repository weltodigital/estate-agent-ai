-- DESTRUCTIVE — drops everything in the `public` schema and recreates it
-- empty with the standard Supabase grants. Run this ONLY if you want a
-- clean slate.
--
-- What it touches:
--   * Every table, view, function, type, sequence, and trigger in `public`.
--
-- What it doesn't touch:
--   * `auth.*` — your Supabase Authentication users + sessions are kept.
--   * `storage.*` — your Storage buckets + objects are kept.
--   * `realtime.*`, `extensions.*`, `graphql.*`, and other Supabase schemas.
--
-- If you also want a clean slate of auth users, delete them from the
-- Supabase dashboard → Authentication → Users.

drop schema if exists public cascade;
create schema public;

-- Standard Supabase grants. Without these the API + dashboard can't see
-- the new schema's contents.
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant select, usage on sequences to anon, authenticated;

comment on schema public is 'standard public schema';

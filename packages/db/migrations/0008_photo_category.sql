-- Photos belong to one of two workflows so the Enhancements and Virtual staging
-- tabs each have their own separate set of uploads. Existing photos default to
-- 'enhancement'.
create type public.photo_category as enum ('enhancement', 'staging');

alter table public.property_photos
  add column category public.photo_category not null default 'enhancement';

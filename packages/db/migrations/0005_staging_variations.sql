-- Migration: 0005_staging_variations
-- Purpose: Persist AI staging variations alongside the photo so "save and
--          compare" survives a page reload. The chosen variation becomes
--          property_photos.staged_url + property_photos.staging_style.
--
-- Rollback notes:
--   alter table public.property_photos drop column suggested_style;
--   alter table public.property_photos drop column staging_variations;

alter table public.property_photos
  add column staging_variations jsonb not null default '[]'::jsonb;

alter table public.property_photos
  add column suggested_style public.staging_style;

-- staging_variations shape (JSON):
--   [{ id: uuid, style: staging_style, url: text, sort_order: int, selected: bool }]

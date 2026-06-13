-- Structured inputs the agent provides to steer AI description generation:
-- condition, furnishing, council tax band, feature chips per category, and a
-- free-text "any other details". Stored as JSONB; the shape is validated by
-- descriptionInputsSchema in packages/shared. Nullable — properties created
-- before this column existed simply have no saved inputs.
alter table public.properties
  add column if not exists description_inputs jsonb;

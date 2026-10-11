-- When the free-scan results email was sent (null = not yet). The worker
-- claims a row by setting this before sending, so it's never sent twice.
alter table public.free_scans add column if not exists emailed_at timestamptz;

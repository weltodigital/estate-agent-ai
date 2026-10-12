-- Operational alerts sent to the team (worker only). The key makes each alert
-- send at most once, even across worker restarts.
create table public.ops_alerts (
  key text primary key,
  subject text not null,
  sent_at timestamptz not null default now()
);
alter table public.ops_alerts enable row level security;
-- No policies: only the service role (worker) reads or writes it.

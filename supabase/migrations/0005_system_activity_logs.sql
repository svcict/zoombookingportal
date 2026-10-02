-- General system activity audit trail - admin config changes, booking
-- lifecycle events, meeting type changes, and push subscription changes.
-- Distinct from zoom_api_logs (real Zoom REST API call ledger) and
-- failed_login_logs/successful_logins (authentication events only); this
-- table is everything else an admin would want to audit. Same shape
-- convention as 0001_app_data_tables.sql.

create table if not exists system_activity_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table system_activity_logs enable row level security;

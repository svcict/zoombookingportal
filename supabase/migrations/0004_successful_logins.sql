-- Tracks successful sign-ins (M365 SSO and the local/demo password login),
-- distinct from failed_login_logs. Added to back the "# of Logins" audit
-- metric, which previously had no tracking at all - only failures were
-- recorded. Same shape convention as 0001_app_data_tables.sql.

create table if not exists successful_logins (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table successful_logins enable row level security;

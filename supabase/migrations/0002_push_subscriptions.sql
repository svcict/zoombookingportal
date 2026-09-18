-- Stores real Web Push subscriptions so reminders/notifications can still
-- be sent after a server restart (a subscription is only useful once - if
-- it's lost, that browser silently stops getting notified until it
-- re-subscribes). Same shape convention as 0001_app_data_tables.sql.

create table if not exists push_subscriptions (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;

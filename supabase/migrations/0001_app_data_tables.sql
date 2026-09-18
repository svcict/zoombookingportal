-- Persists the app data that previously lived only in server.ts's in-memory
-- arrays (hosts, meeting types, bookings, Zoom API logs, failed login logs).
-- All state was lost on every server restart before this; these tables let
-- the Node process reload it on boot instead of starting from scratch.
--
-- Each table stores its record as a single `data` jsonb blob keyed by the
-- app's own `id` string, rather than a fully normalized relational schema.
-- This matches the loosely-typed shapes already used in server.ts (nested
-- zoomDetails/zoomConfig/customQuestions objects) without a separate
-- migration effort to normalize them first. `id`/`created_at`/`updated_at`
-- are pulled out as real columns since the server queries/sorts by them.
--
-- RLS is enabled with no policies, so only the service-role key (which
-- bypasses RLS) can read or write these tables - anon/authenticated clients
-- are locked out entirely. The server is the only intended reader/writer.

create table if not exists host_accounts (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table host_accounts enable row level security;

create table if not exists meeting_types (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table meeting_types enable row level security;

create table if not exists bookings (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table bookings enable row level security;

create table if not exists zoom_api_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table zoom_api_logs enable row level security;

create table if not exists failed_login_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table failed_login_logs enable row level security;

-- Stores real admin grants by email, managed from the in-app Admin Users
-- page. This is deliberately its own table rather than a `profiles.is_admin`
-- column: `profiles.id` is bound to a Supabase Auth user, and Microsoft 365
-- SSO sign-ins (a fully supported login path in this app) never create one,
-- so a profiles-only design could never grant them admin. Combined at
-- runtime with the ADMIN_BOOTSTRAP_EMAILS env allowlist, which seeds the
-- very first admin(s) before anyone can grant admin from the UI itself.
--
-- RLS is enabled with no policies, so only the service-role key (which
-- bypasses RLS) can read or write this table - matching every other table
-- in this app.

create table if not exists admin_emails (
  email text primary key,
  granted_by text,
  created_at timestamptz not null default now()
);
alter table admin_emails enable row level security;

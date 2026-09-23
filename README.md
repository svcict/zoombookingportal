<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a9af5e83-f90d-401a-a09f-0f01d1bc778b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## CI/CD

**CI** (`.github/workflows/ci.yml`) runs on every push and pull request targeting `staging` or
`main`: installs dependencies with `npm ci`, typechecks (`npm run lint`), and builds
(`npm run build`). This is active now — it doesn't deploy anywhere, it just catches broken
builds before they merge.

**CD (deployment) isn't wired up yet.** When you're ready to deploy `staging` (or `main`) to a
real AWS server, the straightforward path for a self-managed EC2/VPS instance (as opposed to a
managed service like ECS or Elastic Beanstalk) is:

1. Add a second workflow (e.g. `.github/workflows/deploy.yml`) triggered on `push: branches:
   [staging]`, that runs after CI passes.
2. Add these as GitHub Secrets (Settings → Secrets and variables → Actions):
   - `STAGING_SSH_HOST` — the server's IP or hostname
   - `STAGING_SSH_USER` — the SSH login user (e.g. `ec2-user`, `ubuntu`)
   - `STAGING_SSH_PRIVATE_KEY` — a private key matching a public key already on the server
   - `STAGING_DEPLOY_PATH` — where the app lives on the server
3. Use an action like [`appleboy/ssh-action`](https://github.com/appleboy/ssh-action) to SSH in
   and run something like:
   ```
   cd $STAGING_DEPLOY_PATH
   git fetch origin staging && git reset --hard origin/staging
   npm ci && npm run build
   pm2 restart zoom-booking-portal || pm2 start dist/server.cjs --name zoom-booking-portal
   ```
   (swap `pm2` for whatever process manager — systemd, Docker, etc. — you end up using).
4. On AWS specifically, make sure the security group allows inbound SSH (port 22) from GitHub
   Actions' IP ranges (or just from anywhere if you're relying on the private key alone), and
   that the app's port (3000) is reachable however you intend to expose it (directly, behind
   nginx, behind an ALB, etc.).

None of this is committed yet since the server doesn't exist — come back to this once it does,
or ask me to scaffold the actual `deploy.yml` when you're ready.

> **Note:** the repo has a `bun.lock` file, but it isn't actually usable — `bun install` on the
> current committed lockfile fails with "Unknown lockfile version". CI uses plain `npm`
> (with a committed `package-lock.json`) instead, which works reliably.

## Identity & Session Auth

The API server resolves "who is making this request" one of two ways, depending on whether
Supabase is configured (`SUPABASE_URL` + `SUPABASE_ANON_KEY` in `.env`):

- **Supabase configured (production mode):** every protected endpoint requires an
  `Authorization: Bearer <token>` header carrying the Supabase session token issued at login.
  The server verifies it directly against Supabase (`auth.getUser`) and resolves admin status
  from the verified user's metadata / `profiles.is_admin` — never from anything the client
  claims about itself. An `X-User-Email` header alone is ignored entirely in this mode.
- **Supabase not configured (local/demo mode):** since there's no real identity provider to
  verify against, the server falls back to trusting a self-asserted `X-User-Email` header sent
  by the logged-in frontend, and derives admin status from an email-substring heuristic. This
  keeps the app usable for local development without a Supabase project, but provides **no
  real security guarantee** — anyone can set that header to anything. Don't run this mode
  against real user data.

The frontend always sends both headers (see `src/utils/auth.ts`); which one the server actually
honors depends entirely on its own Supabase configuration, not anything the client requests.

### Admin Access

Admin status used to be decided by an `email.includes('admin')` heuristic almost everywhere (Microsoft 365
SSO callback, Supabase sign-up, Supabase password login) - meaning **anyone could grant themselves real
admin access just by choosing an email address containing "admin"** (e.g. `administrator@gmail.com`), while
a genuine admin without that substring in their email got none. This has been replaced with a real,
explicit grant system:

1. **`ADMIN_BOOTSTRAP_EMAILS`** (env var, comma-separated) - always-admin emails set by whoever controls the
   server config. This is how you create the very first admin, since every other path requires an existing
   admin to be signed in already.
2. **The `admin_emails` table** (run `supabase/migrations/0003_admin_emails.sql` once) - managed from the
   in-app **Admin Users** page (admin-only nav item), where an existing admin grants or revokes admin access
   for any exact email. This is deliberately a separate table from `profiles`, since `profiles.id` is bound
   to a Supabase Auth user and Microsoft 365 SSO sign-ins never create one.

An email is treated as admin if it's in either list. Once your first admin (via `ADMIN_BOOTSTRAP_EMAILS`)
can sign in, use the Admin Users page for everyone after that rather than growing the env var.

## Data Persistence

Booking data, host accounts, meeting types, Zoom API logs, and failed-login logs used to live
**only** in plain in-memory arrays in `server.ts` — a server restart or redeploy wiped every
booking, account, and audit log. This is now backed by Supabase Postgres when it's configured
(same `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` used for auth):

1. Run `supabase/migrations/0001_app_data_tables.sql` once against your Supabase project (SQL
   Editor → paste → Run) to create the `host_accounts`, `meeting_types`, `bookings`,
   `zoom_api_logs`, and `failed_login_logs` tables. Also run `0002_push_subscriptions.sql` (Push
   Notifications, below) and `0003_admin_emails.sql` (Admin Access, above) the same way.
2. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env` — the server writes through this
   service-role key (bypassing RLS), since these tables aren't meant to be queried directly by
   end users, only through the API.
3. Restart the server. On boot it logs either:
   - `[persistence] Supabase not configured - running in-memory only (data resets on restart).`
     — same behavior as before, useful for quick local demos, or
   - `[persistence] Loaded from Supabase: N host accounts, N meeting types, ...` — everything is
     now durable across restarts.

Each table stores one row per record as an `{ id, data: jsonb }` pair rather than a fully
normalized schema — a pragmatic match for the app's existing loosely-typed shapes (nested
`zoomDetails`/`zoomConfig`/`customQuestions` objects) without a separate normalization effort.
`host_accounts` and `meeting_types` are seeded once from the app's built-in defaults the first
time the tables are empty (so there's something to edit from); `bookings` and the log tables
start empty on a fresh project — no fake demo data is seeded into a real deployment.

The in-memory arrays are still the source of truth for the running process (routes read/write
them exactly as before); Supabase is a write-through durability layer underneath, kept in sync
on every create/update. `rateLimitStore` (login rate limiting) and the mock Microsoft 365 sync
state remain in-memory-only by design — they're either meant to reset on restart or are simulated
data with no real backing integration.

### Demo accounts (signing in without a real password)

Logging in normally requires a real Supabase Auth password (`auth.signInWithPassword`). For
demoing the app with seeded `profiles` rows that were never given one, set `DEMO_LOGIN_EMAILS`
in `.env` to a comma-separated allowlist of specific emails — only those exact accounts can sign
in with any/no password; every other email still requires a real one. This replaced an earlier
version that let *any* row in the `profiles` table sign in passwordless (including
self-registered accounts, since sign-up also creates a profile) — that's gone now.

A demo login gets its own short-lived, signed token (12 hours), verified independently of
Supabase — not a real Supabase session. Removing an email from `DEMO_LOGIN_EMAILS` immediately
invalidates any outstanding token for it, even before it would otherwise expire.

The login screen itself is SSO-only now (no email/password form) - `DEMO_LOGIN_EMAILS` and
`authenticateLocalUser` remain reachable only by calling `/api/auth/m365/login` directly, not
through any UI. There's no client-side validation to speak of here anymore; the real gate is
entirely server-side, and always was.

## Before Going to Production

Last run against this codebase on 2026-09-23 - status of each item below. Items marked "confirm on your
server" can't be checked from a dev/CI checkout since they depend on that deployment's real `.env`.

- [x] **Remove the `admin@local.test`/`user@local.test` handling** in `authenticateLocalUser`
  (`src/lib/supabase.ts`) and the two quick-login cards in `M365AuthGate.tsx`. **Done** - confirmed
  first that a real `ADMIN_BOOTSTRAP_EMAILS` admin and a regular staff account can both sign in via
  Microsoft 365 SSO end-to-end, so removing these can't lock anyone out.
- [ ] **Set `ADMIN_BOOTSTRAP_EMAILS` to your real admin(s), then run
  `supabase/migrations/0003_admin_emails.sql`.** See "Admin Access" above. *(Confirm on your server -
  can't be checked from here.)*
- [ ] **Set `DEMO_LOGIN_EMAILS` to empty/unset.** Closes the Supabase-backed passwordless login path
  (unreachable from the UI already, but still live at the API level until unset). *(Confirm on your
  server.)*
- [ ] Confirm `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` point at your real
  production project, not a test one. *(Confirm on your server.)*

## Push Notifications

Real browser push (RFC 8030 Web Push) — a booking's confirmation page has a "Get a browser
notification before this meeting" button, and the server sends a real notification (not just a
same-tab alert) on booking confirmation, cancellation, when the Zoom meeting actually starts
(via the webhook), and automatically before the meeting starts (checked every minute against
each booking's `reminders.reminderMinutes`, default 1 day / 1 hour / 15 minutes out — each
threshold only ever fires once per booking).

Unlike email, this needs **no third-party account or service** — just a self-generated key pair
(VAPID) that identifies your server to the browser's own push service (Chrome's, Firefox's,
etc.):

1. Generate a key pair once:
   ```
   node -e "const w=require('web-push'); const k=w.generateVAPIDKeys(); console.log('PUBLIC:',k.publicKey); console.log('PRIVATE:',k.privateKey);"
   ```
2. Add to `.env`:
   ```
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:you@yourcompany.com
   ```
3. Restart the server. Without these three set, the feature is silently disabled — the "Get a
   browser notification" button will report "Push notifications are not configured on this
   server" and no reminder-check loop runs.

Subscriptions are stored per-email in the `push_subscriptions` table (see
`supabase/migrations/0002_push_subscriptions.sql` — run this the same way as the other
migrations) so they survive restarts; a subscription the browser's push service reports as
gone (revoked permission, cleared site data, etc.) is dropped automatically on next send
attempt.

Real email notifications are a separate, not-yet-built feature — either Microsoft Graph
`sendMail` (reuses the existing Azure app, but needs the `Mail.Send` **application permission**
granted by a tenant admin, not just the delegated login permission already in place) or a
transactional email API like Resend/SendGrid/Postmark (faster to set up, just needs an API key).

## Zoom API Setup (Two Rotating Server-to-Server OAuth Accounts)

This portal creates real Zoom meetings via the [Zoom REST API](https://developers.zoom.us/docs/api/)
and rotates bookings across **two** Zoom accounts, so two overlapping meetings never hit a
single license's concurrent-meeting limit. Without any credentials configured, the app falls
back to local mock meeting data so it still runs for local development.

For each of the two Zoom accounts/licenses you want to rotate between, repeat these steps:

1. Sign in to the [Zoom App Marketplace](https://marketplace.zoom.us/) as an account owner or
   admin of that Zoom account.
2. Go to **Develop > Build App**, choose **Server-to-Server OAuth**, and name it (e.g.
   "Booking Portal - Account A").
3. On the **Scopes** tab, add the granular scopes:
   - `meeting:write:meeting`
   - `meeting:read:meeting`
   - `meeting:update:meeting`
   - `meeting:delete:meeting`
   - `user:read:user`
   - Host Key does NOT need a scope here at all - see below, it's configured
     directly in `.env` rather than read from the API.
4. Activate the app. Zoom shows you an **Account ID**, **Client ID**, and **Client Secret** —
   copy all three.
5. Note the Zoom user (email or user ID) under that account that should host the meetings —
   this is the `USER_ID` value below.
6. Add the values to your `.env` file:
   ```
   ZOOM_ACCOUNT_A_ID=...
   ZOOM_ACCOUNT_A_CLIENT_ID=...
   ZOOM_ACCOUNT_A_CLIENT_SECRET=...
   ZOOM_ACCOUNT_A_USER_ID=host-a@yourcompany.com
   ZOOM_ACCOUNT_A_LABEL=Sales Team Zoom
   ```
7. Repeat for the second account using the `ZOOM_ACCOUNT_B_*` variables.

You can configure just one account (rotation is skipped and every meeting uses it) or both
(the server picks whichever account is free at the requested time slot, alternating when both
are free). Restart the server after editing `.env`, then use the **Zoom API Integration**
page's "Test API Ping" button to confirm both accounts authenticate successfully.

Admins can also add, edit, or swap either account's credentials directly from the **Zoom API
Integration** page (click the pencil icon on an account card) instead of hand-editing `.env` —
changes are written to `.env` and take effect immediately, no restart needed.

### Host Key / Claim Host (for bookers who can't use Alternative Host)

Every booking sets the booker as **Alternative Host** by default (see "Alternative host" in Key
Features), but that Zoom feature only works if the booker is a **Licensed** user on the *same*
Zoom account - it silently does nothing for external guests or for internal staff on a Basic/
Workplace Basic seat. There's no error in that case; the booker just joins as a regular
participant with no host controls, which looks identical to a bug.

Zoom's real fix for this is the account's **Host Key** - a personal PIN (Zoom web portal:
**Profile > Host Key**) that *any* participant can enter via **Participants > Claim Host** during
the meeting to become host, regardless of license tier or which Zoom account they're signed into.
This app includes it, when configured, in both the confirmation email and the booking confirmation
screen, right next to the Meeting ID and Passcode.

**Setup**: copy each rotating account's Host Key from its Zoom Profile page into `.env` -
`ZOOM_ACCOUNT_A_HOST_KEY` / `ZOOM_ACCOUNT_B_HOST_KEY` - or set it from the **Zoom API Integration**
admin page (pencil icon on an account card). It's read directly from config, not fetched from
Zoom's API: four separate live attempts (`GET /users/{id}/settings` both unfiltered and via
`custom_query_fields`, and `GET /users/{id}` both with and without the `user:read:user:admin`
scope) all came back successful but with `host_key` absent from the response, even against an
account confirmed to have one set - Zoom's REST API appears not to return this field at all under
a Server-to-Server app, likely because it's treated the same as a password rather than a readable
profile field. Since it's a static PIN the account owner sets once and rarely changes, configuring
it directly is no less "real" than a live lookup would have been. Leave it blank and the app
doesn't error or show a placeholder - it just omits the Host Key section entirely, same as the
Meeting ID/Passcode section already behaves when a meeting falls back to mock data.

## Zoom Event Webhook Listener

The portal also listens for real-time Zoom events - `meeting.started`, `meeting.ended`,
`meeting.participant_joined`, and `recording.completed` - and matches them to the corresponding
booking by Zoom meeting ID. To wire this up against a real Zoom app:

1. In the same Zoom Server-to-Server OAuth app (or a separate one), go to **Feature > Event
   Subscriptions** and add a subscription.
2. Set the **Event notification endpoint URL** to `{APP_URL}/api/zoom/webhooks` (e.g.
   `https://your-deployment.example.com/api/zoom/webhooks`).
3. Subscribe to the **Meeting** events (`Meeting Started`, `Meeting Ended`,
   `Meeting Participant/Host has joined`) and, if you want recording links to show up
   automatically (see below), the **Recording** event `All Recordings have completed`.
4. Copy the **Secret Token** shown on that page and set it in `.env`:
   ```
   ZOOM_WEBHOOK_SECRET_TOKEN=...
   ```
5. Save — Zoom will immediately send a validation request to your endpoint, which this app
   answers automatically as long as `ZOOM_WEBHOOK_SECRET_TOKEN` is set.

Without that secret configured, the endpoint still accepts events (useful for local testing)
but can't verify they actually came from Zoom, and can't complete Zoom's URL validation
handshake — the **Zoom API Integration** page shows whether a secret is currently set.

### Cloud Recording Links

Since bookings now default to "Automatically record meeting to the cloud," this app surfaces
the resulting recording automatically once Zoom finishes processing it - no manual step needed
per meeting. When Zoom's `recording.completed` webhook fires (see above; the account must have
Cloud Recording entitlement), the app takes `payload.object.share_url` - Zoom's own "Copy
Shareable Link" for that recording - and stores it on the booking. It then shows up as a "View
Cloud Recording" link on both the booking confirmation screen and the admin/host bookings list,
and the booker gets a browser push notification ("Zoom Recording Ready") if push notifications
are configured. If the webhook isn't set up, or a meeting wasn't recorded, that section simply
doesn't appear - no placeholder, no fabricated link.

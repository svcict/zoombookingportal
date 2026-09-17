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

## Zoom Event Webhook Listener

The portal also listens for real-time Zoom meeting events (`meeting.started`, `meeting.ended`,
`meeting.participant_joined`) and matches them to the corresponding booking by Zoom meeting ID.
To wire this up against a real Zoom app:

1. In the same Zoom Server-to-Server OAuth app (or a separate one), go to **Feature > Event
   Subscriptions** and add a subscription.
2. Set the **Event notification endpoint URL** to `{APP_URL}/api/zoom/webhooks` (e.g.
   `https://your-deployment.example.com/api/zoom/webhooks`).
3. Subscribe to the **Meeting** events: `Meeting Started`, `Meeting Ended`, and
   `Meeting Participant/Host has joined`.
4. Copy the **Secret Token** shown on that page and set it in `.env`:
   ```
   ZOOM_WEBHOOK_SECRET_TOKEN=...
   ```
5. Save — Zoom will immediately send a validation request to your endpoint, which this app
   answers automatically as long as `ZOOM_WEBHOOK_SECRET_TOKEN` is set.

Without that secret configured, the endpoint still accepts events (useful for local testing)
but can't verify they actually came from Zoom, and can't complete Zoom's URL validation
handshake — the **Zoom API Integration** page shows whether a secret is currently set.

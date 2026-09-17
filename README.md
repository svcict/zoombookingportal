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

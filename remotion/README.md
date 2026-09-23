# Zoom Booking Walkthrough (Remotion)

Standalone Remotion project (separate from the main app's build) that renders
a technical walkthrough video of the real booking flow: dark-mode Slate/Indigo
UI, a top-right HUD naming the real backend function/route in play, and
bottom lower-third captions. No external audio/TTS — visual only.

Composition: `ZoomBookingWalkthrough` — 1920x1080, 30fps, 4560 frames (~2:32).

## Scenes
1. `Scene1Auth` (0-540) — M365 sign-in, OAuth consent, SSO callback handling.
2. `Scene2Availability` (540-2040) — bookings load, dual-account free/busy scan.
3. `Scene3Intake` (2040-3120) — intake form fill + submit.
4. `Scene4Execution` (3120-4560) — account pick, meeting creation, host key,
   email/calendar dispatch, confirmation card, Add to Calendar, push opt-in.

HUD/caption timing lives in `src/hudTimeline.ts` / `src/captions.ts`.

## Commands
```
npm install
npm start      # Remotion Studio (live preview)
npm run render # renders out/zoom_booking_walkthrough.mp4
```

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: Ayala Foundation staff without their own Zoom license.** They sign in with their Microsoft 365 work account and book one of the Foundation's two shared Zoom accounts for a meeting, then get the join link, meeting ID and passcode, and, when they need host controls, the Host Key. They book mostly from a desktop or laptop browser at work in Manila, and often from a phone too.
- **Booking on someone else's behalf.** A booker can nominate another person as the meeting's host (the "Meeting Host" field). That person receives the Host Key and is set as Zoom Alternative Host where Zoom allows it.
- **Invitees, including external partners and guests.** They receive the confirmation email and the Outlook invite, but never use the portal itself. Everything they need must work from the email alone.
- **ICT administrators.** They use the separate `/admin` portal to manage the two Zoom accounts, Microsoft 365 / Entra ID settings, calendar sync, admin access, and the security and activity audit.

## Product Purpose

Let staff without a Zoom license self-serve Zoom meetings on the Foundation's two shared accounts, with no double-booking and no request to ICT.

Success means:
- **No double-booking.** Neither shared account ever has two overlapping meetings. Conflicts are caught before the booker submits, and checked again on the server at submit.
- **Less ICT workload.** Staff create, edit and cancel meetings, and get Host Keys, themselves instead of emailing ICT.
- **Fast booking.** A meeting is booked, with the invite and Outlook event sent, in about a minute and without training.
- **Audit and control.** ICT can see who booked what, failed and successful sign-ins, and system activity, and can manage who is an admin.

## Positioning

The portal is the single front door to a pool of two shared, licensed Zoom accounts. Each booking goes automatically to whichever account is free. "Free" is checked against both this app's own bookings and each account's real Microsoft 365 calendar, so a meeting created outside the portal still blocks the slot. The Host Key is how host privileges reach whoever needs them, whatever their own Zoom license. Every booking also creates a native Outlook event on the hosting account's mailbox, and Exchange sends the invites from there.

## Operating Context

- Sign-in is Microsoft 365 / Entra ID SSO with work accounts, and can be restricted to the organization's domain.
- **Booking flow:** meeting topic, then a free-form start and end time (in the user's selected timezone, default Asia/Manila), then the intake form (invitees from an Azure AD directory search or typed in, an optional Meeting Host, the Send Host Key option), then confirmation.
- **After booking:**
  - a confirmation email sent from the hosting Zoom account's own mailbox (only the booker and nominated host get the Host Key)
  - an Outlook calendar event
  - optional browser push notifications and reminders
  - "add to calendar" links for Outlook, Google and Apple
- **My Meetings and the calendar dashboard** (day, week and month views; office hours 8:00 AM to 5:00 PM) show upcoming, past and cancelled meetings, with Join, Copy Link, edit settings and cancel.
- **Cancelling** deletes the Zoom meeting and the Outlook event.
- **Live status:** a Zoom webhook marks meetings as LIVE while they're in progress.

## Capabilities and Constraints

- Exactly two rotating shared Zoom accounts (A and B), using Zoom Server-to-Server OAuth. The portal is a meeting scheduler, not a Zoom license manager.
- Microsoft Graph, with app-only permissions, handles calendar free/busy, Outlook events, sendMail from each account's mailbox, and directory search (User.Read.All). Directory search fails silently, falling back to typed email entry when it's not configured.
- Supabase is the persistence layer. Without Supabase, the server runs in-memory only and data resets on restart.
- **Identity:** every protected request needs a session token the server verifies itself (M365 SSO, Supabase, or allowlisted demo session). Staff can only book under their own account, and only see or change meetings they booked or are invited to. Admins see all of them.
- Secrets (Zoom and Microsoft client secrets) are write-only in the admin UI and never sent back to the browser.
- Stack: React 19 + Vite + Tailwind CSS v4 single-page app; Express API in `server.ts`. Staff app and `/admin` are separate pages and separate bundles.
- **Terminology:**
  - "Invitees" are guests on a meeting.
  - The "Meeting Host" is the nominated host.
  - The "Host Key" is Zoom's host-claim code.
  - "Rotating Zoom Account A/B" are the shared accounts.
  - Meetings are "booked", "edited" and "cancelled", not "deleted".
- **Undecided:** deployment target (CD isn't wired up; see README), and any formal accessibility standard.

## Brand Commitments

- Product name: **Zoom Booking Portal**, for the **Ayala Foundation**.
- Ayala Foundation logo: `public/ayala-foundation-logo.svg` and the `AyalaFoundationLogo` component.
- Zoom is the meeting platform being booked, not this product's brand owner. Zoom names and marks appear only to identify the service.

## Evidence on Hand

- No testimonials, usage statistics, case studies or metrics exist. Future work must not invent them.
- Real product facts in the code: the booking and cancellation flows, email templates in `server.ts` (`buildBookingConfirmationEmail`), and the admin audit views.

## Product Principles

1. **Never double-book a shared account.** Availability must reflect reality: this app's bookings and each account's real Outlook calendar. When the real state is unknown, say so rather than guessing.
2. **Self-serve without ICT.** Every common job, including book, edit, cancel, resend Host Key and add invitees, is completable by the booker alone, with clear recovery when Zoom or Microsoft 365 fails.
3. **A minute, not a manual.** The booking flow should be obvious to someone using it for the first time, on a desktop or a phone.
4. **The email has to stand alone.** External guests only ever see the email and calendar invite, so everything they need (join link, time in context, dial-in) must be there and correct.
5. **Privileges stay narrow.** The Host Key, host start links, secrets and admin tools reach only the people meant to have them.

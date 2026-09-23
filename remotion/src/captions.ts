export interface CaptionEntry {
  from: number;
  to: number;
  text: string;
}

// Precise, descriptive lower-third captions, synced to the same absolute
// timeline as HUD_TIMELINE (see hudTimeline.ts) but chunked at the beat of
// the on-screen action rather than the function boundaries.
export const CAPTION_TIMELINE: CaptionEntry[] = [
  // Scene 1 — Authentication
  { from: 0, to: 180, text: 'Signing in with single sign-on — no separate password to manage.' },
  { from: 180, to: 360, text: 'Microsoft Entra ID authenticates the user and issues a secure token.' },
  { from: 360, to: 540, text: "The server exchanges the OAuth code for a verified session." },

  // Scene 2 — Availability & slot selection
  { from: 540, to: 780, text: 'The dashboard loads every existing booking straight from the database.' },
  { from: 780, to: 1080, text: 'Choosing a date and duration kicks off a live availability scan.' },
  { from: 1080, to: 1500, text: "Both rotating Zoom accounts are checked independently for a free slot." },
  { from: 1500, to: 2040, text: "Each account's Microsoft 365 calendar is cross-checked to prevent double-booking." },

  // Scene 3 — Intake form & submission
  { from: 2040, to: 2320, text: 'The intake form locks in the signed-in user’s identity automatically.' },
  { from: 2320, to: 2680, text: 'Attendees — and an optional meeting host — can be added by email.' },
  { from: 2680, to: 3120, text: 'One click submits the booking request to the server.' },

  // Scene 4 — Execution, success states & dropdowns
  { from: 3120, to: 3300, text: "The server resolves whichever Zoom account is actually free for this slot." },
  { from: 3300, to: 3500, text: 'A real Zoom meeting is created through the Zoom REST API.' },
  { from: 3500, to: 3800, text: "The account's Host Key is attached — visible only to the booker and the meeting host." },
  { from: 3800, to: 4200, text: 'Confirmation emails and an Outlook calendar invite go out through Microsoft Graph.' },
  { from: 4200, to: 4560, text: 'Booking confirmed — add it to any calendar and opt in to push notifications.' },
];

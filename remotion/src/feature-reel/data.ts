export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Absolute frame boundaries for each beat of the montage. Restructured to
// match the REAL app's actual page structure (verified via live screenshots):
// duration + calendar + slots are one continuous "Schedule" page, not three
// separate screens; the confirmation view is one long detail card, not split.
export const BEATS = {
  intro: { from: 0, to: 90 },
  signIn: { from: 90, to: 180 },
  schedulePage: { from: 180, to: 480 },
  intake: { from: 480, to: 630 },
  confirmationIntro: { from: 630, to: 750 },
  confirmationDetails: { from: 750, to: 1020 },
  manageCancel: { from: 1020, to: 1200 },
  outro: { from: 1200, to: 1290 },
};

export const TOTAL_FRAMES = BEATS.outro.to;

export interface CalloutEntry {
  from: number;
  to: number;
  text: string;
}

// Short benefit callouts only — minimal on-screen text, meant to leave room
// for a live narrator rather than reading like a script.
export const CALLOUTS: CalloutEntry[] = [
  { from: BEATS.signIn.from + 15, to: BEATS.signIn.to, text: 'One-click Microsoft 365 sign-in' },
  { from: BEATS.schedulePage.from + 15, to: BEATS.schedulePage.from + 130, text: 'Flexible meeting lengths, your way' },
  { from: BEATS.schedulePage.from + 140, to: BEATS.schedulePage.to, text: 'Real-time availability — zero double-bookings' },
  { from: BEATS.intake.from + 15, to: BEATS.intake.to, text: 'Book on someone else’s behalf' },
  { from: BEATS.confirmationIntro.from + 15, to: BEATS.confirmationIntro.to, text: 'A real Zoom meeting, generated instantly' },
  { from: BEATS.confirmationDetails.from + 10, to: BEATS.confirmationDetails.from + 130, text: 'Host access, secured — visible only to who needs it' },
  { from: BEATS.confirmationDetails.from + 140, to: BEATS.confirmationDetails.to, text: 'Synced to any calendar in one click' },
  { from: BEATS.manageCancel.from + 15, to: BEATS.manageCancel.to, text: 'Reschedule or cancel anytime, fully tracked' },
];

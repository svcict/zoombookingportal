export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Absolute frame boundaries for each beat of the montage.
export const BEATS = {
  intro: { from: 0, to: 90 },
  signIn: { from: 90, to: 180 },
  availability: { from: 180, to: 390 },
  duration: { from: 390, to: 480 },
  intake: { from: 480, to: 630 },
  confirmation: { from: 630, to: 780 },
  hostKey: { from: 780, to: 900 },
  addToCalendar: { from: 900, to: 1020 },
  push: { from: 1020, to: 1110 },
  manageCancel: { from: 1110, to: 1290 },
  outro: { from: 1290, to: 1380 },
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
  { from: BEATS.availability.from + 20, to: BEATS.availability.to, text: 'Real-time availability — zero double-bookings' },
  { from: BEATS.duration.from + 10, to: BEATS.duration.to, text: 'Flexible meeting lengths, your way' },
  { from: BEATS.intake.from + 15, to: BEATS.intake.to, text: 'Book on someone else’s behalf' },
  { from: BEATS.confirmation.from + 15, to: BEATS.confirmation.to, text: 'A real Zoom meeting, generated instantly' },
  { from: BEATS.hostKey.from + 10, to: BEATS.hostKey.to, text: 'Host access, secured — visible only to who needs it' },
  { from: BEATS.addToCalendar.from + 10, to: BEATS.addToCalendar.to, text: 'Synced to any calendar in one click' },
  { from: BEATS.push.from + 10, to: BEATS.push.to, text: 'Browser reminders — never miss a meeting' },
  { from: BEATS.manageCancel.from + 15, to: BEATS.manageCancel.to, text: 'Reschedule or cancel anytime, fully tracked' },
];

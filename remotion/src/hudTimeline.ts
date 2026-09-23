export type HudKind = 'component' | 'flow' | 'server' | 'api';

export interface HudEntry {
  from: number;
  to: number;
  label: string;
  kind: HudKind;
}

// Absolute frame ranges across the full 4560-frame timeline. Each entry names
// the real function/route/component being exercised on screen at that moment.
export const HUD_TIMELINE: HudEntry[] = [
  // Scene 1 — Authentication (0-540)
  { from: 0, to: 150, label: 'M365AuthGate.tsx', kind: 'component' },
  { from: 150, to: 300, label: 'Microsoft Entra OAuth Flow', kind: 'flow' },
  { from: 300, to: 540, label: 'server.ts → SSO Callback Handler', kind: 'server' },

  // Scene 2 — Availability & slot selection (540-2040)
  { from: 540, to: 720, label: 'GET /api/bookings', kind: 'api' },
  { from: 720, to: 1260, label: 'isZoomAccountFreeAt()', kind: 'server' },
  { from: 1260, to: 2040, label: 'getZoomAccountM365BusyBlocks()', kind: 'server' },

  // Scene 3 — Intake form & submission (2040-3120)
  { from: 2040, to: 2500, label: 'ZoomIntakeForm.tsx', kind: 'component' },
  { from: 2500, to: 3120, label: 'POST /api/bookings', kind: 'api' },

  // Scene 4 — Execution, success states & dropdowns (3120-4560)
  { from: 3120, to: 3300, label: 'pickZoomAccount()', kind: 'server' },
  { from: 3300, to: 3500, label: 'provisionZoomMeeting() / createZoomMeeting()', kind: 'server' },
  { from: 3500, to: 3800, label: 'getAccountHostKey()', kind: 'server' },
  { from: 3800, to: 4200, label: 'sendGraphMail() / createGraphCalendarEvent()', kind: 'server' },
  { from: 4200, to: 4560, label: 'BookingConfirmation.tsx / enablePushNotifications()', kind: 'component' },
];

export const HUD_KIND_LABEL: Record<HudKind, string> = {
  component: 'REACT COMPONENT',
  flow: 'OAUTH FLOW',
  server: 'SERVER FUNCTION',
  api: 'API ROUTE',
};

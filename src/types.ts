export type ZoomMeetingStyle = 'video' | 'audio' | 'webinar' | 'screenshare';

export interface M365User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  tenantName: string;
  tenantId: string;
  accessToken: string;
  scopes: string[];
  isAdmin?: boolean;
  jobTitle?: string;
  signedInAt: string;
}

export interface HostAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  status: 'available' | 'busy' | 'in_meeting' | 'away';
  currentActivity?: string;
  m365Connected: boolean;
  zoomPmi: string;
  zoomAccountType: 'Enterprise' | 'Licensed' | 'Pro';
  timezone: string;
  dailyOpenSlotsCount?: number;
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'phone';
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface MeetingType {
  id: string;
  title: string;
  slug: string;
  duration: number; // in minutes
  description: string;
  color: string;
  hostName: string;
  hostEmail: string;
  hostAvatar: string;
  hostRole: string;
  hostAccountId?: string;
  zoomMeetingType: ZoomMeetingStyle;
  requiresApproval: boolean;
  customQuestions: CustomQuestion[];
  isActive: boolean;
  bufferMinutes: number;
}

export interface TimeSlot {
  id: string;
  time: string; // "09:00", "09:30", etc.
  formattedTime: string; // "9:00 AM"
  isoString: string;
  isAvailable: boolean; // true = Green, false = Red
  reason?: 'booked' | 'm365_busy' | 'past' | 'host_unavailable' | 'buffer' | string;
  bookedBy?: {
    name: string;
    company?: string;
  };
  availableAccounts?: HostAccount[];
  unavailableAccounts?: Array<{ account: HostAccount; reason: string }>;
  assignedHost?: HostAccount;
}

export interface ZoomDetails {
  meetingId: string;
  formattedMeetingId: string;
  passcode: string;
  joinUrl: string;
  startUrl: string;
  dialInNumbers: {
    country: string;
    city: string;
    number: string;
  }[];
  sipAddress: string;
  h323Address: string;
  encryption: 'Enhanced (AES-256)' | 'End-to-End Encrypted';
  apiGenerated?: boolean;
  zoomApiEndpoint?: string;
  // The hosting Zoom account's real Host Key (PIN for "Claim Host") - lets
  // ANY participant become host during the meeting regardless of license
  // tier, unlike Alternative Host which only works for Licensed users on
  // the same Zoom account. Undefined when it couldn't be retrieved (never a
  // fabricated value).
  hostKey?: string;
  // Zoom's own "Copy Shareable Link" URL for this meeting's cloud
  // recording, filled in only after Zoom's real recording.completed
  // webhook fires - undefined until then (no meeting was recorded, or the
  // recording is still processing), never a placeholder/fabricated value.
  recordingUrl?: string;
}

export interface ZoomMeetingConfig {
  invitees: string[];
  meetingIdType: 'auto' | 'pmi';
  pmiNumber: string;
  hasAgenda: boolean;
  agenda: string;
  attachments: Array<{ id: string; name: string; size: string; type?: string }>;
  // Security
  passcodeEnabled: boolean;
  passcode: string;
  waitingRoom: boolean;
  requireAuth: boolean;
  // Notes & Chat
  allowMyNotesTranscript: boolean;
  enableContinuousChat: boolean;
  // Video
  hostVideo: boolean;
  participantVideo: boolean;
  // Audio
  audioOption: 'telephone' | 'computer' | 'both' | 'third_party';
  // Calendar
  calendarType: 'outlook' | 'google' | 'other';
  // Advanced
  joinAnytime: boolean;
  muteOnEntry: boolean;
  // When true, records to the Zoom Cloud (auto_recording: 'cloud') -
  // requires the hosting Zoom account to have Cloud Recording entitlement
  // (Licensed plan); Zoom silently fails/ignores it on a Basic account.
  autoRecord: boolean;
  alternativeHosts: string;
}

export interface Booking {
  id: string;
  meetingTypeId: string;
  meetingTitle: string;
  duration: number;
  hostName: string;
  hostEmail: string;
  hostAvatar: string;
  hostAccountId?: string;
  zoomAccountKey?: 'A' | 'B' | null;
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  participantCompany?: string;
  guestEmails: string[];
  date: string; // YYYY-MM-DD
  timeSlot: string; // "10:00 AM"
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
  zoomDetails: ZoomDetails;
  zoomConfig?: ZoomMeetingConfig;
  m365SyncStatus: 'not_synced' | 'synced' | 'failed';
  m365EventId?: string;
  m365SyncError?: string;
  answers: Record<string, any>;
  status: 'confirmed' | 'rescheduled' | 'cancelled';
  liveStatus?: 'started' | 'ended';
  reminders: {
    emailSent: boolean;
    emailSentAt?: string;
    emailError?: string;
    pushScheduled: boolean;
    pushFired?: boolean;
    reminderMinutes: number[]; // e.g. [1440, 60, 15]
  };
  createdAt: string;
  notes?: string;
}

export interface TimezoneOption {
  id: string;
  label: string;
  offset: string; // e.g. "UTC-4" or "UTC+1"
  region: string;
  sampleTime: string;
}

export interface M365SyncMailbox {
  accountKey: 'A' | 'B';
  mailbox: string;
}

export interface M365CalendarState {
  syncEnabled: boolean;
  connected: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
  mailboxes?: M365SyncMailbox[];
}

export interface M365ExternalEvent {
  id: string;
  subject: string;
  startTime: string; // ISO
  endTime: string; // ISO
  category: string;
  organizer: string;
}

export interface ZoomApiConfig {
  status: 'connected' | 'demo_mode' | 'unauthorized';
  accountId: string;
  clientId: string;
  authType: 'Server-to-Server OAuth' | 'User OAuth' | 'JWT (Legacy)';
  apiEndpoint: string;
  rateLimit: {
    limit: number;
    remaining: number;
    resetTime: string;
  };
  scopes: string[];
  webhookUrl: string;
  lastPingMs: number;
  mode?: 'live' | 'demo_mode';
  webhookSecretConfigured?: boolean;
  accounts?: Array<{
    key: 'A' | 'B';
    label: string;
    configured: boolean;
    accountIdMasked: string | null;
  }>;
}

export interface ZoomApiLog {
  id: string;
  timestamp: string;
  method: 'POST' | 'GET' | 'PATCH' | 'DELETE';
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  payloadSummary: string;
}

export interface FailedLoginRecord {
  id: string;
  ip: string;
  sessionId?: string;
  emailAttempted: string;
  timestamp: string;
  reason: string;
  userAgent?: string;
}

export interface SecurityRateLimitInfo {
  ip: string;
  consecutiveFails: number;
  lockoutCycle: number;
  lockoutUntil: number | null;
  remainingSeconds: number;
  isPermanentlyBlocked: boolean;
  lastAttemptAt: string;
}

export interface LoginSecurityAudit {
  totalFailedAttempts: number;
  activeLockoutsCount: number;
  permanentlyBlockedIpsCount: number;
  failedLogs: FailedLoginRecord[];
  rateLimits: SecurityRateLimitInfo[];
}

export interface M365SettingsConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  orgDomain: string;
  connected: boolean;
  validationStatus?: string;
  validationMessage?: string;
  verifiedLive?: boolean;
  graphApiVersion: string;
  lastValidatedAt: string;
  tokenStatus: string;
  latencyMs: number;
  envFileSynced: boolean;
}


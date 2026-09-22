import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  authenticateLocalUser,
  registerSupabaseUser,
  testSupabaseConnection,
  isSupabaseConfigured,
  getSupabase,
  verifySessionToken,
  verifyDemoSessionToken,
  issueM365SsoSessionToken,
  verifyM365SsoSessionToken
} from './src/lib/supabase';
import {
  ZoomAccountKey,
  getConfiguredAccountKeys,
  isAccountConfigured,
  getAccountLabel,
  getMaskedAccountId,
  getAccountAdminView,
  createZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  getZoomUserProfile,
  mapZoomMeetingResponse
} from './src/lib/zoomApi';
import { persistenceEnabled, loadTable, upsertRow, deleteRow, seedTableIfEmpty, clearTable } from './src/lib/db';
import type { ZoomMeetingConfig } from './src/types';
import { isPushConfigured, getVapidPublicKey, sendWebPush, PushSubscriptionRecord, PushPayload } from './src/lib/pushNotifications';

const app = express();
const PORT = 3000;

// Captures the raw request body alongside express.json()'s parsed version,
// needed to verify Zoom's webhook HMAC signature (computed over the exact
// raw bytes Zoom sent, not a re-serialized copy).
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

// ----------------------------------------------------
// HOST ACCOUNTS DATA
// ----------------------------------------------------
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

let hostAccounts: HostAccount[] = [
  {
    id: 'acc-1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    role: 'Principal Solutions Architect',
    department: 'Enterprise Architecture',
    status: 'available',
    currentActivity: 'Active in Microsoft 365 & Zoom',
    m365Connected: true,
    zoomPmi: '849 3019 4820',
    zoomAccountType: 'Enterprise',
    timezone: 'America/New_York'
  },
  {
    id: 'acc-2',
    name: 'Alex Rivera',
    email: 'alex.rivera@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    role: 'Lead Integration Engineer',
    department: 'Platform Engineering',
    status: 'available',
    currentActivity: 'Screen-Share Ready (Zoom Dev Suite)',
    m365Connected: true,
    zoomPmi: '938 4120 5912',
    zoomAccountType: 'Enterprise',
    timezone: 'America/Los_Angeles'
  },
  {
    id: 'acc-3',
    name: 'David Kim',
    email: 'david.kim@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    role: 'Director of Cloud Architecture',
    department: 'Executive Engineering',
    status: 'available',
    currentActivity: 'Exchange Synced',
    m365Connected: true,
    zoomPmi: '712 9054 3821',
    zoomAccountType: 'Enterprise',
    timezone: 'America/Chicago'
  },
  {
    id: 'acc-4',
    name: 'Maya Patel',
    email: 'maya.patel@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    role: 'Senior Customer Success Lead',
    department: 'Client Solutions & Growth',
    status: 'available',
    currentActivity: 'Available for Zoom Video Onboarding',
    m365Connected: true,
    zoomPmi: '620 3918 4729',
    zoomAccountType: 'Licensed',
    timezone: 'Europe/London'
  }
];

// In-Memory Database with Initial Seed Data
export interface SeedMeetingType {
  id: string;
  title: string;
  slug: string;
  duration: number;
  description: string;
  color: string;
  hostName: string;
  hostEmail: string;
  hostAvatar: string;
  hostRole: string;
  hostAccountId?: string;
  zoomMeetingType: 'video' | 'audio' | 'webinar' | 'screenshare';
  requiresApproval: boolean;
  isActive: boolean;
  bufferMinutes: number;
  customQuestions: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'phone';
    placeholder?: string;
    required: boolean;
    options?: string[];
    helpText?: string;
  }>;
}

let meetingTypes: SeedMeetingType[] = [
  {
    id: 'mt-30',
    title: '30 Minutes',
    slug: '30-min-zoom',
    duration: 30,
    description: 'Standard 30-minute Zoom video meeting session. Fast, focused strategy consultation with live screen-sharing.',
    color: '#0E71EB',
    hostName: 'Sarah Jenkins',
    hostEmail: 'sarah.jenkins@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Principal Solutions Architect',
    hostAccountId: 'acc-1',
    zoomMeetingType: 'video',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 10,
    customQuestions: [
      {
        id: 'q1',
        label: 'Meeting Agenda',
        type: 'textarea',
        placeholder: 'Please describe what you would like to achieve or specific questions you have...',
        required: true,
        helpText: 'Helps us prepare relevant technical documentation in advance.'
      }
    ]
  },
  {
    id: 'mt-45',
    title: '45 Minutes',
    slug: '45-min-zoom',
    duration: 45,
    description: 'Extended 45-minute technical breakdown, architecture review, and live product demonstration.',
    color: '#2D8CFF',
    hostName: 'Alex Rivera',
    hostEmail: 'alex.rivera@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Lead Integration Engineer',
    hostAccountId: 'acc-2',
    zoomMeetingType: 'screenshare',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 15,
    customQuestions: [
      {
        id: 'q1',
        label: 'Current Tech Stack & Systems to Integrate',
        type: 'textarea',
        placeholder: 'e.g., Microsoft 365, Azure, React, Node.js, Custom CRM...',
        required: true,
      },
      {
        id: 'q2',
        label: 'Expected number of attendees from your team',
        type: 'select',
        required: true,
        options: ['Just me (1 person)', '2 - 4 team members', '5 - 10 people', '10+ stakeholder demo'],
      }
    ]
  },
  {
    id: 'mt-60',
    title: '1 Hour',
    slug: '1-hour-zoom',
    duration: 60,
    description: 'Comprehensive 1-hour in-depth consultation, system architecture review, and hands-on workshop session.',
    color: '#0B5CBE',
    hostName: 'David Kim',
    hostEmail: 'david.kim@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Director of Cloud Architecture',
    hostAccountId: 'acc-3',
    zoomMeetingType: 'video',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 15,
    customQuestions: [
      {
        id: 'q1',
        label: 'Primary meeting objectives and agenda items',
        type: 'textarea',
        placeholder: 'Outline the main topics to cover during this 1-hour workshop...',
        required: true,
      },
      {
        id: 'q2',
        label: 'Do you require automated Zoom Cloud Recording with transcription?',
        type: 'radio',
        required: true,
        options: ['Yes, send recording & transcript after meeting', 'No recording needed'],
      }
    ]
  },
  {
    id: 'mt-custom',
    title: 'More than 1 hour',
    slug: 'custom-zoom',
    duration: 90,
    description: 'Custom duration session for extended team workshops, training, executive reviews, or multi-topic meetings.',
    color: '#6366F1',
    hostName: 'Maya Patel',
    hostEmail: 'maya.patel@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Senior Customer Success Lead',
    hostAccountId: 'acc-4',
    zoomMeetingType: 'video',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 20,
    customQuestions: [
      {
        id: 'q1',
        label: 'Extended Meeting Agenda & Objectives',
        type: 'textarea',
        placeholder: 'Describe the key goals and discussion topics for this extended session...',
        required: true,
      },
      {
        id: 'q2',
        label: 'Estimated Participant Count',
        type: 'select',
        required: true,
        options: ['1 - 5 attendees', '6 - 15 attendees', '16 - 50 attendees', '50+ attendees (Large Zoom Room)'],
      }
    ]
  }
];

// In-Memory Bookings Store
let bookings: any[] = [
  {
    id: 'zm-901452',
    meetingTypeId: 'mt-30',
    meetingTitle: 'Ayala Foundation Strategy & Collaboration Sync',
    duration: 30,
    hostName: 'Sarah Jenkins',
    hostEmail: 'sarah.jenkins@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    hostAccountId: 'acc-1',
    participantName: 'Arman Buhat',
    participantEmail: 'buhatar@gmail.com',
    participantPhone: '+63 917 555 1234',
    participantCompany: 'Ayala Foundation',
    guestEmails: ['program-team@ayalafoundation.org'],
    date: '2026-09-16',
    timeSlot: '10:00 AM',
    startTimeIso: '2026-09-16T10:00:00.000Z',
    endTimeIso: '2026-09-16T10:30:00.000Z',
    timezone: 'Asia/Manila',
    zoomDetails: {
      meetingId: '869 563 2911',
      formattedMeetingId: '869-563-2911',
      passcode: '7894676141',
      joinUrl: 'https://zoom.us/j/8695632911?pwd=Nzg5NDY3NjE0MQ',
      startUrl: 'https://zoom.us/s/8695632911',
      dialInNumbers: [
        { country: 'PH', city: 'Manila', number: '+63 2 8271 3900' },
        { country: 'US', city: 'San Jose', number: '+1 669 900 6833' }
      ],
      sipAddress: '8695632911@zoomcrc.com',
      h323Address: '162.255.37.11##8695632911#7894676141',
      encryption: 'Enhanced (AES-256)',
      apiGenerated: true,
      zoomApiEndpoint: 'https://api.zoom.us/v2/users/me/meetings'
    },
    zoomConfig: {
      invitees: ['program-team@ayalafoundation.org'],
      meetingIdType: 'auto',
      pmiNumber: '869 563 2911',
      hasAgenda: true,
      agenda: 'Q3 Operations review and Zoom/Office 365 Exchange integration milestone sign-off.',
      attachments: [{ id: 'att-1', name: 'Ayala_Foundation_Strategy_Q3.pdf', size: '2.4 MB' }],
      passcodeEnabled: true,
      passcode: '7894676141',
      waitingRoom: false,
      requireAuth: false,
      allowMyNotesTranscript: true,
      enableContinuousChat: true,
      hostVideo: true,
      participantVideo: true,
      audioOption: 'both',
      calendarType: 'outlook',
      joinAnytime: false,
      enableQa: false,
      muteOnEntry: true,
      autoRecord: false,
      autoAddCloudRecordingToChannel: false,
      enableAdditionalDataCenters: false,
      alternativeHosts: 'alex.rivera@zoompartner.com',
      manageAssetsSummary: true,
      manageAssetsRecording: true
    },
    m365SyncStatus: 'not_synced',
    answers: {
      q1: 'Reviewing quarterly cloud migration timeline and security compliance on Zoom infrastructure.'
    },
    status: 'confirmed',
    reminders: {
      emailSent: true,
      emailSentAt: '2026-09-15T14:30:00.000Z',
      pushScheduled: true,
      reminderMinutes: [1440, 60, 15]
    },
    createdAt: '2026-09-15T14:30:00.000Z',
    notes: 'Calendar invite confirmed & synchronized via Microsoft 365 Exchange'
  },
  {
    id: 'zm-892401',
    meetingTypeId: 'mt-1',
    meetingTitle: '30-Min Zoom Strategy & Discovery',
    duration: 30,
    hostName: 'Sarah Jenkins',
    hostEmail: 'sarah.jenkins@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    hostAccountId: 'acc-1',
    participantName: 'Michael Chen',
    participantEmail: 'mchen@enterprise.io',
    participantPhone: '+1 (555) 349-2810',
    participantCompany: 'Enterprise IO',
    guestEmails: ['tech-lead@enterprise.io'],
    date: '2026-08-26',
    timeSlot: '11:00 AM',
    startTimeIso: '2026-08-26T15:00:00.000Z',
    endTimeIso: '2026-08-26T15:30:00.000Z',
    timezone: 'America/New_York',
    zoomDetails: {
      meetingId: '849 3019 4820',
      formattedMeetingId: '849-3019-4820',
      passcode: 'Zm78Kq',
      joinUrl: 'https://zoom.us/j/84930194820?pwd=Wmt4ODRLcURhczl6',
      startUrl: 'https://zoom.us/s/84930194820',
      dialInNumbers: [
        { country: 'US', city: 'New York', number: '+1 646 558 8656' },
        { country: 'US', city: 'San Jose', number: '+1 669 900 6833' },
        { country: 'UK', city: 'London', number: '+44 203 481 5240' }
      ],
      sipAddress: '84930194820@zoomcrc.com',
      h323Address: '162.255.37.11##84930194820#Zm78Kq',
      encryption: 'Enhanced (AES-256)',
      apiGenerated: true,
      zoomApiEndpoint: 'https://api.zoom.us/v2/users/me/meetings'
    },
    m365SyncStatus: 'not_synced',
    answers: {
      q1: 'Reviewing quarterly cloud migration timeline and security compliance on Zoom infrastructure.'
    },
    status: 'confirmed',
    reminders: {
      emailSent: true,
      emailSentAt: '2026-08-25T14:30:00.000Z',
      pushScheduled: true,
      reminderMinutes: [1440, 60, 15]
    },
    createdAt: '2026-08-25T14:30:00.000Z',
    notes: 'Calendar invite sent via Microsoft 365 Exchange'
  }
];

// Real M365 calendar sync state - no fake seeded events. connected/
// lastCheckedAt/lastError reflect the outcome of the most recent real
// Graph getSchedule call (see getRealM365BusyBlocks), not a static claim.
let m365CalendarState = {
  syncEnabled: true,
  connected: false,
  lastCheckedAt: null as string | null,
  lastError: null as string | null
};

// ----------------------------------------------------
// ZOOM REST API ENGINE & LOGS
// ----------------------------------------------------
export interface ZoomApiLog {
  id: string;
  timestamp: string;
  method: 'POST' | 'GET' | 'PATCH' | 'DELETE';
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  payloadSummary: string;
}

let zoomApiLogs: ZoomApiLog[] = [
  {
    id: `zlog-1`,
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    method: 'GET',
    endpoint: 'https://api.zoom.us/v2/users/me',
    statusCode: 200,
    responseTimeMs: 84,
    payloadSummary: 'Fetched authenticated Zoom enterprise profile (Plan: Enterprise, Host ID: usr_zm9481)'
  },
  {
    id: `zlog-2`,
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    method: 'POST',
    endpoint: 'https://api.zoom.us/v2/users/me/meetings',
    statusCode: 201,
    responseTimeMs: 142,
    payloadSummary: 'Created meeting 849 3019 4820 (type: 2, encrypted: AES-256, waiting_room: true)'
  }
];

let zoomApiConfig = {
  status: 'connected' as const,
  accountId: process.env.ZOOM_ACCOUNT_ID || 'zm_acct_84920184',
  clientId: process.env.ZOOM_CLIENT_ID || 'zm_cli_993821049281',
  authType: 'Server-to-Server OAuth' as const,
  apiEndpoint: 'https://api.zoom.us/v2',
  rateLimit: {
    limit: 100,
    remaining: 97,
    resetTime: 'In 45 seconds'
  },
  scopes: [
    'meeting:write:admin',
    'meeting:read:admin',
    'user:read:admin',
    'recording:read:admin',
    'webinar:write:admin'
  ],
  webhookUrl: process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, '')}/api/zoom/webhooks`
    : '/api/zoom/webhooks',
  lastPingMs: 64
};

// Helper: Generate Compliant Zoom Details via REST API format
function generateZoomDetails(meetingTitle: string, hostName: string = 'Sarah Jenkins', preferredPasscode?: string) {
  const p1 = Math.floor(100 + Math.random() * 900);
  const p2 = Math.floor(1000 + Math.random() * 9000);
  const p3 = Math.floor(1000 + Math.random() * 9000);
  const meetingId = `${p1} ${p2} ${p3}`;
  const rawId = `${p1}${p2}${p3}`;

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let passcode = preferredPasscode || '';
  if (!passcode) {
    for (let i = 0; i < 6; i++) {
      passcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  const token = Buffer.from(`${passcode}_zoom_auth_${Date.now()}`).toString('base64').substring(0, 16);
  const joinUrl = `https://zoom.us/j/${rawId}?pwd=${token}`;
  const startUrl = `https://zoom.us/s/${rawId}`;

  // Record Zoom API REST Call Log
  const log: ZoomApiLog = {
    id: `zlog-${Date.now()}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    endpoint: 'https://api.zoom.us/v2/users/me/meetings',
    statusCode: 201,
    responseTimeMs: Math.floor(65 + Math.random() * 80),
    payloadSummary: `Created Zoom Room ${meetingId} for "${meetingTitle}" (Host: ${hostName}, Passcode: ${passcode})`
  };
  zoomApiLogs.unshift(log);
  if (zoomApiLogs.length > 30) zoomApiLogs.pop();
  persistZoomLog(log);

  return {
    meetingId,
    formattedMeetingId: `${p1}-${p2}-${p3}`,
    passcode,
    joinUrl,
    startUrl,
    dialInNumbers: [
      { country: 'US', city: 'New York', number: '+1 646 558 8656' },
      { country: 'US', city: 'San Jose', number: '+1 669 900 6833' },
      { country: 'US', city: 'Chicago', number: '+1 312 626 6799' },
      { country: 'UK', city: 'London', number: '+44 203 481 5240' },
      { country: 'DE', city: 'Frankfurt', number: '+49 69 7104 9922' },
      { country: 'JP', city: 'Tokyo', number: '+81 3 4578 1488' },
      { country: 'AU', city: 'Sydney', number: '+61 2 8015 6011' }
    ],
    sipAddress: `${rawId}@zoomcrc.com`,
    h323Address: `162.255.37.11##${rawId}#${passcode}`,
    encryption: 'Enhanced (AES-256)' as const,
    apiGenerated: false,
    zoomApiEndpoint: 'https://api.zoom.us/v2/users/me/meetings'
  };
}

// Rotation state: which account was assigned last when both were free
let lastAssignedZoomAccount: ZoomAccountKey | null = null;

// Picks a Zoom account for a new meeting, favoring whichever configured
// account (A or B) has no overlapping booking at the requested time.
// Falls back to round-robin between the two when both are free.
async function pickZoomAccount(startIso: string, endIso: string): Promise<ZoomAccountKey | null> {
  const configured = getConfiguredAccountKeys();
  if (configured.length === 0) return null;

  const overlapsExistingBooking = (key: ZoomAccountKey) =>
    bookings.some((b) => {
      if (b.status === 'cancelled' || b.zoomAccountKey !== key) return false;
      return b.startTimeIso < endIso && startIso < b.endTimeIso;
    });

  // Also real-checks each account's own M365 calendar, not just this app's
  // own booking log - an account can be genuinely busy in Outlook without
  // ever having been booked through this app.
  const dateStr = startIso.slice(0, 10);
  const overlapsRealM365 = async (key: ZoomAccountKey) => {
    if (!m365CalendarState.syncEnabled) return false;
    const blocks = await getZoomAccountM365BusyBlocks(key, dateStr);
    if (!blocks) return false; // couldn't check - fail open rather than block booking entirely
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    return blocks.some((block) => startMs < new Date(block.endIso).getTime() && endMs > new Date(block.startIso).getTime());
  };

  const free: ZoomAccountKey[] = [];
  for (const key of configured) {
    if (overlapsExistingBooking(key)) continue;
    if (await overlapsRealM365(key)) continue;
    free.push(key);
  }

  if (free.length === 0) return null;
  if (free.length === 1) return free[0];

  const next = free.find((key) => key !== lastAssignedZoomAccount) || free[0];
  lastAssignedZoomAccount = next;
  return next;
}

// Creates a meeting on the given Zoom account via the real REST API, falling
// back to the local mock generator when that account has no credentials configured.
async function provisionZoomMeeting(
  accountKey: ZoomAccountKey | null,
  meetingTitle: string,
  hostName: string,
  startIso: string,
  durationMinutes: number,
  timezone: string,
  agenda?: string,
  zoomConfig?: Partial<ZoomMeetingConfig>
) {
  if (!accountKey || !isAccountConfigured(accountKey)) {
    const preferredPasscode = zoomConfig?.passcodeEnabled !== false ? zoomConfig?.passcode : undefined;
    return { zoomDetails: generateZoomDetails(meetingTitle, hostName, preferredPasscode), accountKey };
  }

  const result = await createZoomMeeting(accountKey, {
    topic: meetingTitle,
    startTimeIso: startIso,
    durationMinutes,
    timezone,
    agenda,
    passcode: zoomConfig?.passcodeEnabled !== false ? zoomConfig?.passcode : undefined,
    waitingRoom: zoomConfig?.waitingRoom,
    hostVideo: zoomConfig?.hostVideo,
    participantVideo: zoomConfig?.participantVideo,
    audioOption: zoomConfig?.audioOption,
    muteOnEntry: zoomConfig?.muteOnEntry,
    joinBeforeHost: zoomConfig?.joinAnytime,
    meetingAuthentication: zoomConfig?.requireAuth,
    usePmi: zoomConfig?.meetingIdType === 'pmi',
    autoRecording: zoomConfig?.autoRecord,
    autoRecordTo: 'local'
  });

  const provisionLog: ZoomApiLog = {
    id: `zlog-${Date.now()}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    endpoint: result.endpoint,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    payloadSummary: `Created Zoom meeting ${result.data.id} on ${getAccountLabel(accountKey)} for "${meetingTitle}"`
  };
  zoomApiLogs.unshift(provisionLog);
  if (zoomApiLogs.length > 30) zoomApiLogs.pop();
  persistZoomLog(provisionLog);

  return { zoomDetails: mapZoomMeetingResponse(result.data), accountKey };
}

// ----------------------------------------------------
// MICROSOFT 365 AUTHENTICATION PROFILES
// ----------------------------------------------------
export interface M365UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin?: boolean;
  department: string;
  avatar: string;
  tenantName: string;
  tenantId: string;
  scopes: string[];
  jobTitle?: string;
}

let m365DirectoryUsers: M365UserProfile[] = [
  {
    id: 'm365-usr-admin',
    name: 'System Administrator',
    email: 'admin@zoompartner.com',
    role: 'Global Administrator',
    isAdmin: true,
    department: 'Enterprise IT & Cloud Security',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    tenantName: 'Contoso Enterprise AD & Zoom Partner Tenant',
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    scopes: ['User.Read', 'Calendars.ReadWrite', 'Mail.Send', 'OnlineMeetings.ReadWrite', 'Directory.AccessAsUser.All']
  },
  {
    id: 'm365-usr-1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@zoompartner.com',
    role: 'Global Administrator',
    isAdmin: true,
    department: 'Solutions Engineering & Architecture',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    tenantName: 'Contoso Cloud & Zoom Solutions Tenant',
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    scopes: ['User.Read', 'Calendars.ReadWrite', 'Mail.Send', 'OnlineMeetings.ReadWrite', 'Directory.AccessAsUser.All']
  },
  {
    id: 'm365-usr-2',
    name: 'Alex Rivera',
    email: 'alex.rivera@zoompartner.com',
    role: 'Integration Engineer',
    isAdmin: false,
    department: 'Platform Integrations',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    tenantName: 'Contoso Cloud & Zoom Solutions Tenant',
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    scopes: ['User.Read', 'Calendars.ReadWrite', 'Mail.Send', 'OnlineMeetings.ReadWrite']
  },
  {
    id: 'm365-usr-3',
    name: 'David Kim',
    email: 'david.kim@zoompartner.com',
    role: 'Staff Engineer',
    isAdmin: false,
    department: 'Executive Technology',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    tenantName: 'Contoso Cloud & Zoom Solutions Tenant',
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    scopes: ['User.Read', 'Calendars.ReadWrite', 'Mail.Send', 'OnlineMeetings.ReadWrite']
  },
  {
    id: 'm365-usr-4',
    name: 'Maya Patel',
    email: 'maya.patel@zoompartner.com',
    role: 'Customer Success Specialist',
    isAdmin: false,
    department: 'Client Growth & Success',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    tenantName: 'Contoso Cloud & Zoom Solutions Tenant',
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    scopes: ['User.Read', 'Calendars.ReadWrite', 'Mail.Send', 'OnlineMeetings.ReadWrite']
  },
  {
    id: 'm365-usr-guest',
    name: 'Enterprise Client',
    email: 'buhatar@gmail.com',
    role: 'Enterprise Member',
    isAdmin: false,
    department: 'Partner Accounts',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    tenantName: 'External Azure AD Federated Tenant',
    tenantId: 'fed92110-4492-41e2-b912-881a2019ab92',
    scopes: ['User.Read', 'Calendars.ReadWrite', 'Mail.Send']
  }
];

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Zoom Booking Portal API',
    zoomApiConnected: true,
    m365SyncActive: m365CalendarState.syncEnabled,
    timestamp: new Date().toISOString()
  });
});

// 2. Authentication Endpoints (Supabase Authentication & Security Rate-Limiting)
interface FailedAttemptRecord {
  id: string;
  ip: string;
  sessionId?: string;
  emailAttempted: string;
  timestamp: string;
  reason: string;
  userAgent?: string;
}

interface RateLimitEntry {
  ip: string;
  sessionId?: string;
  consecutiveFails: number;
  lockoutCycle: number; // 0 = normal, 1 = 1-min lock, 2 = 3-min lock (repeat 1), 3 = 3-min lock (repeat 2), 4 = 3-min lock (repeat 3), >=5 = permanently blocked
  lockoutUntil: number | null;
  isPermanentlyBlocked: boolean;
  lastAttemptAt: string;
}

const failedLoginLogs: FailedAttemptRecord[] = [];
const rateLimitStore = new Map<string, RateLimitEntry>();
let pushSubscriptions: PushSubscriptionRecord[] = [];

// Sends a real Web Push notification to every subscription registered for
// this email (a person can have more than one - phone, laptop, etc.), and
// drops any subscription the browser's push service reports as gone.
async function sendPushToEmail(email: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  const normalizedEmail = email.toLowerCase().trim();
  const targets = pushSubscriptions.filter((s) => s.email.toLowerCase() === normalizedEmail);
  for (const sub of targets) {
    const result = await sendWebPush(sub, payload);
    if (result.shouldRemove) {
      pushSubscriptions = pushSubscriptions.filter((s) => s.id !== sub.id);
      deleteRow('push_subscriptions', sub.id).catch(() => {});
    }
  }
}

// ----------------------------------------------------
// PERSISTENCE BOOTSTRAP
// ----------------------------------------------------
// Without Supabase configured, this is a no-op and the app runs exactly as
// before (pure in-memory, reset on every restart). With it configured,
// host accounts and meeting types are seeded into the database once (if
// empty) and then reloaded from it on every boot; bookings and logs are
// loaded as-is (empty on a fresh project, which is correct for real
// usage - no fake demo data seeded into a real deployment).
function persistZoomLog(log: ZoomApiLog): void {
  upsertRow('zoom_api_logs', log.id, log).catch(() => {});
}

function persistFailedLogin(record: FailedAttemptRecord): void {
  upsertRow('failed_login_logs', record.id, record).catch(() => {});
}

// One-time self-healing cleanup: a Supabase project seeded before the
// Screen Sharing / Zoom Audio Preference intake questions were removed
// from the code still has them saved in its meeting_types rows, and
// loading from the database (by design) takes priority over the current
// in-code defaults. Strips them from whatever was just loaded and writes
// the cleaned version back, so this runs itself right on the next boot
// without needing direct database access.
const DEPRECATED_CUSTOM_QUESTION_LABELS = new Set([
  'Do you require Screen Sharing / Live Demo capabilities?',
  'Zoom Audio Preference',
  'Company or Organization Name'
]);

// Same self-healing idea, for a label that was renamed rather than removed.
const RENAMED_CUSTOM_QUESTION_LABELS = new Map([
  ['What is the primary topic or goal for this Zoom meeting?', 'Meeting Agenda']
]);

async function removeDeprecatedCustomQuestions(): Promise<void> {
  for (const meetingType of meetingTypes) {
    const before = meetingType.customQuestions.length;
    meetingType.customQuestions = meetingType.customQuestions.filter(
      (q) => !DEPRECATED_CUSTOM_QUESTION_LABELS.has(q.label)
    );
    let renamed = false;
    for (const q of meetingType.customQuestions) {
      const newLabel = RENAMED_CUSTOM_QUESTION_LABELS.get(q.label);
      if (newLabel) {
        q.label = newLabel;
        renamed = true;
      }
    }
    if (meetingType.customQuestions.length !== before || renamed) {
      await upsertRow('meeting_types', meetingType.id, meetingType);
    }
  }
}

async function initPersistence(): Promise<void> {
  if (!persistenceEnabled()) {
    console.log('[persistence] Supabase not configured - running in-memory only (data resets on restart).');
    return;
  }

  await seedTableIfEmpty('host_accounts', hostAccounts);
  await seedTableIfEmpty('meeting_types', meetingTypes);

  const loadedHosts = await loadTable<HostAccount>('host_accounts');
  if (loadedHosts && loadedHosts.length > 0) hostAccounts = loadedHosts;

  const loadedMeetingTypes = await loadTable<SeedMeetingType>('meeting_types');
  if (loadedMeetingTypes && loadedMeetingTypes.length > 0) {
    meetingTypes = loadedMeetingTypes;
    await removeDeprecatedCustomQuestions();
  }

  const loadedBookings = await loadTable<any>('bookings');
  if (loadedBookings) bookings = loadedBookings;

  const loadedZoomLogs = await loadTable<ZoomApiLog>('zoom_api_logs');
  if (loadedZoomLogs) zoomApiLogs = loadedZoomLogs;

  const loadedFailedLogins = await loadTable<FailedAttemptRecord>('failed_login_logs');
  if (loadedFailedLogins) failedLoginLogs.push(...loadedFailedLogins);

  const loadedPushSubscriptions = await loadTable<PushSubscriptionRecord>('push_subscriptions');
  if (loadedPushSubscriptions) pushSubscriptions = loadedPushSubscriptions;

  console.log(
    `[persistence] Loaded from Supabase: ${hostAccounts.length} host accounts, ${meetingTypes.length} meeting types, ${bookings.length} bookings, ${zoomApiLogs.length} Zoom API logs, ${failedLoginLogs.length} failed login logs, ${pushSubscriptions.length} push subscriptions.`
  );
}

const REMINDER_CHECK_INTERVAL_MS = 60 * 1000;

function formatReminderLead(minutesBefore: number): string {
  if (minutesBefore >= 1440) return `${Math.round(minutesBefore / 1440)} day(s)`;
  if (minutesBefore >= 60) return `${Math.round(minutesBefore / 60)} hour(s)`;
  return `${minutesBefore} minutes`;
}

// Runs every minute, checking every non-cancelled booking against its own
// reminders.reminderMinutes thresholds (e.g. 1440/60/15 minutes before
// start) and sends a real push the first time a threshold is crossed -
// tracked per booking in reminders.sentReminderMinutes so it never repeats.
async function checkAndSendReminders(): Promise<void> {
  if (!isPushConfigured()) return;
  const now = Date.now();

  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;
    const minutesUntilStart = (new Date(booking.startTimeIso).getTime() - now) / 60000;
    if (minutesUntilStart < 0) continue;

    const reminderMinutesList: number[] = booking.reminders?.reminderMinutes || [];
    if (!booking.reminders.sentReminderMinutes) booking.reminders.sentReminderMinutes = [];
    const sent: number[] = booking.reminders.sentReminderMinutes;

    for (const minutesBefore of reminderMinutesList) {
      if (sent.includes(minutesBefore) || minutesUntilStart > minutesBefore) continue;
      sent.push(minutesBefore);
      await sendPushToEmail(booking.participantEmail, {
        title: 'Upcoming Zoom Meeting',
        body: `${booking.meetingTitle} starts in ${formatReminderLead(minutesBefore)} (${booking.timeSlot})`,
        tag: `reminder-${booking.id}-${minutesBefore}`,
        url: '/'
      });
      await upsertRow('bookings', booking.id, booking).catch(() => {});
    }
  }
}

function getClientIp(req: express.Request): string {
  // Only trust X-Forwarded-For when explicitly running behind a trusted
  // reverse proxy/load balancer that sets it - otherwise any client can
  // spoof this header to evade or frame another IP for the rate limiter.
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

// Resets an entry's lockout state once its timer has expired, so callers
// (login, status check, admin audit) never see stale "still locked" data.
function resetExpiredLockout(entry: RateLimitEntry): void {
  if (entry.lockoutUntil && entry.lockoutUntil <= Date.now()) {
    entry.lockoutUntil = null;
    entry.consecutiveFails = 0;
  }
}

function getRateLimitEntry(req: express.Request): RateLimitEntry {
  const ip = getClientIp(req);
  let entry = rateLimitStore.get(ip);
  if (!entry) {
    entry = {
      ip,
      sessionId: req.headers['x-session-id']?.toString() || req.body?.sessionId || 'default-session',
      consecutiveFails: 0,
      lockoutCycle: 0,
      lockoutUntil: null,
      isPermanentlyBlocked: false,
      lastAttemptAt: new Date().toISOString()
    };
    rateLimitStore.set(ip, entry);
  }
  return entry;
}

app.get('/api/auth/rate-limit-status', (req, res) => {
  const entry = getRateLimitEntry(req);
  resetExpiredLockout(entry);
  const remainingSeconds = entry.lockoutUntil && entry.lockoutUntil > Date.now()
    ? Math.ceil((entry.lockoutUntil - Date.now()) / 1000)
    : 0;

  res.json({
    success: true,
    ip: entry.ip,
    isPermanentlyBlocked: Boolean(entry.isPermanentlyBlocked),
    isLockedOut: Boolean(remainingSeconds > 0),
    lockoutUntil: entry.lockoutUntil,
    remainingSeconds,
    consecutiveFails: entry.consecutiveFails,
    lockoutCycle: entry.lockoutCycle
  });
});

app.get('/api/auth/supabase/status', async (req, res) => {
  try {
    const status = await testSupabaseConnection();
    res.json({
      success: true,
      configured: status.connected,
      ...status
    });
  } catch (err: any) {
    res.json({
      success: false,
      configured: false,
      error: err?.message || 'Error checking Supabase connection'
    });
  }
});

// ----------------------------------------------------
// ENV FILE SYNC & PERSISTENCE HELPER
// ----------------------------------------------------
function updateEnvFile(keyValues: Record<string, string>): boolean {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    } else {
      const examplePath = path.join(process.cwd(), '.env.example');
      if (fs.existsSync(examplePath)) {
        content = fs.readFileSync(examplePath, 'utf8');
      }
    }

    const lines = content.split('\n');
    const updatedKeys = new Set<string>();

    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) {
        return line;
      }
      const eqIdx = line.indexOf('=');
      const key = line.substring(0, eqIdx).trim();
      if (key in keyValues) {
        updatedKeys.add(key);
        const val = keyValues[key] !== undefined ? String(keyValues[key]) : '';
        const formattedVal = val.includes(' ') || val.includes('#') ? `"${val}"` : val;
        return `${key}=${formattedVal}`;
      }
      return line;
    });

    for (const [k, v] of Object.entries(keyValues)) {
      if (!updatedKeys.has(k)) {
        const val = v !== undefined ? String(v) : '';
        const formattedVal = val.includes(' ') || val.includes('#') ? `"${val}"` : val;
        newLines.push(`${k}=${formattedVal}`);
        updatedKeys.add(k);
      }
      // Update memory process.env directly
      process.env[k] = String(v);
    }

    fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed writing to .env file:', e);
    for (const [k, v] of Object.entries(keyValues)) {
      process.env[k] = String(v);
    }
    return false;
  }
}

// ----------------------------------------------------
// LIVE MICROSOFT ENTRA ID & GRAPH API VALIDATION
// (Performs real HTTP validation against login.microsoftonline.com)
// ----------------------------------------------------
async function validateMicrosoftEntraLive(tenantId?: string, clientId?: string, clientSecret?: string) {
  const tId = (tenantId || process.env.MICROSOFT_TENANT_ID || '').trim();
  const cId = (clientId || process.env.MICROSOFT_CLIENT_ID || '').trim();
  const cSecret = (clientSecret || process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  const orgDomain = (process.env.MICROSOFT_ORGANIZATION_DOMAIN || '').trim();

  const startTime = Date.now();

  if (!tId) {
    return {
      connected: false,
      status: 'missing_tenant',
      message: 'Microsoft Tenant ID is missing in .env. Enter your Azure Entra ID Tenant ID to connect.',
      latencyMs: 0,
      verifiedLive: true,
      lastValidatedAt: new Date().toISOString()
    };
  }

  try {
    // Step 1: Query Microsoft Entra OpenID Discovery endpoint
    const discoveryUrl = `https://login.microsoftonline.com/${encodeURIComponent(tId)}/v2.0/.well-known/openid-configuration`;
    const discoveryRes = await fetch(discoveryUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Zoom-M365-Entra-Live-Validator/1.0'
      }
    });

    const latencyMs = Date.now() - startTime;

    if (!discoveryRes.ok) {
      let errText = '';
      try {
        const errJson = (await discoveryRes.json()) as any;
        errText = errJson.error_description || errJson.error || discoveryRes.statusText;
      } catch {
        errText = await discoveryRes.text();
      }
      return {
        connected: false,
        status: 'invalid_tenant',
        message: `Microsoft Entra Tenant check failed (${discoveryRes.status}): ${errText.substring(0, 180)}`,
        latencyMs,
        verifiedLive: true,
        lastValidatedAt: new Date().toISOString()
      };
    }

    const discoveryData = (await discoveryRes.json()) as any;
    const tokenEndpoint = discoveryData.token_endpoint || `https://login.microsoftonline.com/${encodeURIComponent(tId)}/oauth2/v2.0/token`;
    const issuer = discoveryData.issuer;

    // Step 2: If Client ID and Client Secret are present, test live OAuth token request
    if (cId && cSecret) {
      const params = new URLSearchParams();
      params.append('client_id', cId);
      params.append('client_secret', cSecret);
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'https://graph.microsoft.com/.default');

      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      const totalLatency = Date.now() - startTime;

      if (tokenRes.ok) {
        const tokenData = (await tokenRes.json()) as any;
        return {
          connected: true,
          status: 'authenticated',
          message: 'Live Microsoft Entra ID & Graph API connection verified and active.',
          tokenType: tokenData.token_type || 'Bearer',
          expiresIn: tokenData.expires_in,
          issuer,
          tokenStatus: 'Valid & Active (Signed Entra JWT)',
          graphApiVersion: 'v1.0',
          orgDomain: orgDomain || 'Active Entra Tenant',
          latencyMs: totalLatency,
          verifiedLive: true,
          lastValidatedAt: new Date().toISOString()
        };
      } else {
        let authErr = '';
        try {
          const authErrJson = (await tokenRes.json()) as any;
          authErr = authErrJson.error_description || authErrJson.error || tokenRes.statusText;
        } catch {
          authErr = await tokenRes.text();
        }
        return {
          connected: false,
          status: 'auth_failed',
          message: `Microsoft Entra OAuth verification rejected: ${authErr.substring(0, 220)}`,
          issuer,
          latencyMs: totalLatency,
          verifiedLive: true,
          lastValidatedAt: new Date().toISOString()
        };
      }
    } else if (cId) {
      return {
        connected: false,
        status: 'secret_required',
        message: `Tenant validated (${issuer}). Client Secret is required to authenticate against Microsoft Graph API.`,
        issuer,
        latencyMs,
        verifiedLive: true,
        lastValidatedAt: new Date().toISOString()
      };
    } else {
      return {
        connected: false,
        status: 'client_id_required',
        message: `Tenant found (${issuer}). Application (Client) ID and Client Secret are required.`,
        issuer,
        latencyMs,
        verifiedLive: true,
        lastValidatedAt: new Date().toISOString()
      };
    }
  } catch (netErr: any) {
    return {
      connected: false,
      status: 'network_error',
      message: `Failed to connect to Microsoft Entra identity servers: ${netErr?.message || 'Network unreachable'}`,
      latencyMs: Date.now() - startTime,
      verifiedLive: true,
      lastValidatedAt: new Date().toISOString()
    };
  }
}

app.get('/api/admin/m365/config', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const tenantId = process.env.MICROSOFT_TENANT_ID || '';
  const clientId = process.env.MICROSOFT_CLIENT_ID || '';
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/callback`;
  const scopes = process.env.MICROSOFT_GRAPH_SCOPES || 'User.Read Calendars.ReadWrite Mail.Send offline_access';
  const orgDomain = process.env.MICROSOFT_ORGANIZATION_DOMAIN || '';
  const primaryEmail = process.env.MICROSOFT_PRIMARY_USER_EMAIL || '';

  const validation = await validateMicrosoftEntraLive(tenantId, clientId, clientSecret);

  res.json({
    success: true,
    data: {
      tenantId,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      orgDomain,
      primaryEmail,
      connected: validation.connected,
      validationStatus: validation.status,
      validationMessage: validation.message,
      graphApiVersion: 'v1.0',
      lastValidatedAt: validation.lastValidatedAt,
      tokenStatus: validation.connected ? 'Valid & Active (Live Bearer OAuth 2.0)' : 'Unauthenticated',
      latencyMs: validation.latencyMs,
      envFileSynced: true,
      verifiedLive: true
    }
  });
});

const M365_CONFIG_KEYS = new Set([
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_REDIRECT_URI',
  'MICROSOFT_GRAPH_SCOPES',
  'MICROSOFT_ORGANIZATION_DOMAIN',
  'MICROSOFT_PRIMARY_USER_EMAIL'
]);

app.post('/api/admin/m365/config', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const { keys } = req.body;
  if (!keys || typeof keys !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload: keys object required' });
  }

  // Whitelist to known M365 keys only - never forward arbitrary key names
  // from the request body to updateEnvFile.
  const filteredKeys: Record<string, string> = {};
  for (const [k, v] of Object.entries(keys)) {
    if (M365_CONFIG_KEYS.has(k)) {
      filteredKeys[k] = String(v);
    }
  }

  const success = updateEnvFile(filteredKeys);

  const tenantId = process.env.MICROSOFT_TENANT_ID || '';
  const clientId = process.env.MICROSOFT_CLIENT_ID || '';
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || '';
  const scopes = process.env.MICROSOFT_GRAPH_SCOPES || '';
  const orgDomain = process.env.MICROSOFT_ORGANIZATION_DOMAIN || '';
  const primaryEmail = process.env.MICROSOFT_PRIMARY_USER_EMAIL || '';

  const validation = await validateMicrosoftEntraLive(tenantId, clientId, clientSecret);

  res.json({
    success: true,
    message: success ? 'Configuration written directly to .env file and active runtime.' : 'Runtime configuration updated.',
    envFileSynced: success,
    data: {
      tenantId,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      orgDomain,
      primaryEmail,
      connected: validation.connected,
      validationStatus: validation.status,
      validationMessage: validation.message,
      graphApiVersion: 'v1.0',
      lastValidatedAt: validation.lastValidatedAt,
      tokenStatus: validation.connected ? 'Valid & Active (Live Bearer OAuth 2.0)' : 'Unauthenticated',
      latencyMs: validation.latencyMs,
      envFileSynced: success,
      verifiedLive: true
    }
  });
});

app.post('/api/admin/m365/test-connection', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const tenantId = req.body?.tenantId || process.env.MICROSOFT_TENANT_ID || '';
  const clientId = req.body?.clientId || process.env.MICROSOFT_CLIENT_ID || '';
  const clientSecret = req.body?.clientSecret || process.env.MICROSOFT_CLIENT_SECRET || '';

  const validation = await validateMicrosoftEntraLive(tenantId, clientId, clientSecret);

  res.json({
    success: validation.connected,
    connected: validation.connected,
    status: validation.status,
    message: validation.message,
    tenantName: process.env.MICROSOFT_ORGANIZATION_DOMAIN ? `${process.env.MICROSOFT_ORGANIZATION_DOMAIN}` : 'Azure Entra ID',
    graphApiVersion: 'v1.0',
    tokenStatus: validation.connected ? 'Active (Live Bearer JWT Signed)' : 'Inactive / Authentication Rejected',
    latencyMs: validation.latencyMs,
    testedAt: validation.lastValidatedAt,
    verifiedLive: true
  });
});

// ----------------------------------------------------
// REAL MICROSOFT 365 SSO - Entra ID OAuth 2.0 authorization-code flow
// ----------------------------------------------------

// Signs a short-lived, single-use-window CSRF nonce for the OAuth
// redirect round trip. Per-process is fine: it only needs to survive the
// few seconds between redirecting to Microsoft and Microsoft redirecting
// back, never across a server restart.
const OAUTH_STATE_SECRET = crypto.randomBytes(32).toString('hex');
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function signOAuthState(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const ts = Date.now().toString();
  const raw = `${nonce}.${ts}`;
  const sig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(raw).digest('base64url');
  return `${raw}.${sig}`;
}

function verifyOAuthState(state: string): boolean {
  const parts = (state || '').split('.');
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  const expected = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(`${nonce}.${ts}`).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return false;
  }
  const age = Date.now() - Number(ts);
  return age >= 0 && age < OAUTH_STATE_TTL_MS;
}

function getM365OAuthConfig(req: express.Request) {
  return {
    tenantId: (process.env.MICROSOFT_TENANT_ID || '').trim(),
    clientId: (process.env.MICROSOFT_CLIENT_ID || '').trim(),
    clientSecret: (process.env.MICROSOFT_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.MICROSOFT_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/callback`).trim(),
    scopes: (process.env.MICROSOFT_GRAPH_SCOPES || 'User.Read Calendars.ReadWrite Mail.Send offline_access').trim(),
    orgDomain: (process.env.MICROSOFT_ORGANIZATION_DOMAIN || '').trim().toLowerCase()
  };
}

// ----------------------------------------------------
// REAL MICROSOFT 365 CALENDAR SYNC (app-only Graph, read-only)
// ----------------------------------------------------
// This checks the ONE configured sync mailbox (MICROSOFT_PRIMARY_USER_EMAIL)
// for real conflicts via Microsoft Graph's getSchedule endpoint - it does
// NOT write bookings back into Outlook as calendar events (that's a
// separate, bigger feature: creating/updating/deleting real events per
// booking). Since there's only one real mailbox configured, its busy
// blocks apply uniformly across all 4 display "hosts", not per-account -
// this app has no way to know which of the 4 corresponds to a real M365
// mailbox unless each host account email is itself a real user in your
// tenant.
let graphAppToken: { token: string; expiresAt: number } | null = null;

async function getGraphAppToken(): Promise<string | null> {
  const tenantId = (process.env.MICROSOFT_TENANT_ID || '').trim();
  const clientId = (process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = (process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  if (!tenantId || !clientId || !clientSecret) return null;

  if (graphAppToken && graphAppToken.expiresAt > Date.now() + 30_000) {
    return graphAppToken.token;
  }

  const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default'
    }).toString()
  });
  if (!tokenRes.ok) return null;

  const data = (await tokenRes.json()) as any;
  if (!data.access_token) return null;
  graphAppToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return graphAppToken.token;
}

interface M365BusyBlock {
  startIso: string;
  endIso: string;
  status: string;
  subject?: string;
}

const m365BusyCache = new Map<string, { blocks: M365BusyBlock[]; fetchedAt: number }>();
const M365_BUSY_CACHE_TTL_MS = 3 * 60 * 1000;

// Live-queries Microsoft Graph for real busy blocks on one mailbox for one
// calendar day (UTC). The mailbox is always one of the two rotating Zoom
// accounts' real M365 addresses (ZOOM_ACCOUNT_A_USER_ID / _B_USER_ID) -
// those are the accounts that actually host meetings, so their own real
// calendars are what can genuinely conflict with a booking. Returns null on
// any failure (unconfigured, no consent, network error) so callers can
// distinguish "no conflicts" from "couldn't check".
async function getRealM365BusyBlocks(dateStr: string, mailbox: string): Promise<M365BusyBlock[] | null> {
  if (!mailbox) return null;

  const cacheKey = `${mailbox}|${dateStr}`;
  const cached = m365BusyCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < M365_BUSY_CACHE_TTL_MS) {
    return cached.blocks;
  }

  const token = await getGraphAppToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/calendar/getSchedule`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'outlook.timezone="UTC"'
      },
      body: JSON.stringify({
        schedules: [mailbox],
        startTime: { dateTime: `${dateStr}T00:00:00`, timeZone: 'UTC' },
        endTime: { dateTime: `${dateStr}T23:59:59`, timeZone: 'UTC' },
        availabilityViewInterval: 30
      })
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const items = data?.value?.[0]?.scheduleItems || [];
    const blocks: M365BusyBlock[] = items
      .filter((item: any) => item.status && item.status !== 'free')
      .map((item: any) => ({
        startIso: item.start.dateTime.endsWith('Z') ? item.start.dateTime : `${item.start.dateTime}Z`,
        endIso: item.end.dateTime.endsWith('Z') ? item.end.dateTime : `${item.end.dateTime}Z`,
        status: item.status,
        subject: item.subject
      }));

    m365BusyCache.set(cacheKey, { blocks, fetchedAt: Date.now() });
    return blocks;
  } catch {
    return null;
  }
}

// Real busy blocks for one rotating Zoom account, keyed by which account
// (A/B) - reads that account's real M365 mailbox from
// ZOOM_ACCOUNT_{key}_USER_ID, the same address used for meeting creation.
async function getZoomAccountM365BusyBlocks(key: ZoomAccountKey, dateStr: string): Promise<M365BusyBlock[] | null> {
  const mailbox = (process.env[`ZOOM_ACCOUNT_${key}_USER_ID`] || '').trim();
  return getRealM365BusyBlocks(dateStr, mailbox);
}

// ----------------------------------------------------
// REAL EMAIL SENDING - Microsoft Graph sendMail (app-only), sent AS
// whichever rotating Zoom account actually hosts the meeting.
// ----------------------------------------------------
// Requires the Azure app registration to have the Mail.Send APPLICATION
// permission (not just delegated User.Read/Mail.Send under Graph scopes)
// admin-consented in Azure Portal - that's a manual, one-time step outside
// this codebase. Without it, sendGraphMail fails with a permission error,
// which is surfaced honestly via reminders.emailError rather than a fake
// emailSent: true.
async function sendGraphMail(
  fromMailbox: string,
  toEmails: string[],
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  if (!fromMailbox) return { success: false, error: 'No sending mailbox configured for this Zoom account.' };
  if (toEmails.length === 0) return { success: false, error: 'No recipients to send to.' };

  const token = await getGraphAppToken();
  if (!token) return { success: false, error: 'Microsoft Graph is not configured (missing tenant/client credentials).' };

  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromMailbox)}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: htmlBody },
          toRecipients: toEmails.map((email) => ({ emailAddress: { address: email } }))
        },
        saveToSentItems: true
      })
    });

    if (res.status === 202) return { success: true };

    const errText = await res.text().catch(() => '');
    return { success: false, error: `Graph sendMail failed (${res.status}): ${errText.slice(0, 300)}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error contacting Microsoft Graph.' };
  }
}

function buildBookingConfirmationEmail(booking: any): { subject: string; html: string } {
  const zd = booking.zoomDetails || {};
  const subject = `Confirmed: ${booking.meetingTitle} — ${booking.date} at ${booking.timeSlot}`;
  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a;">
      <p>Your Zoom meeting is confirmed.</p>
      <p style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${booking.meetingTitle}</p>
      <p style="margin-top: 0; color: #555;">${booking.date} at ${booking.timeSlot} (${booking.timezone})</p>
      <table style="margin-top: 16px;">
        <tr><td style="padding: 4px 12px 4px 0; color: #555;">Join URL</td><td><a href="${zd.joinUrl || ''}">${zd.joinUrl || ''}</a></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #555;">Meeting ID</td><td>${zd.meetingId || ''}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #555;">Passcode</td><td>${zd.passcode || ''}</td></tr>
      </table>
      <p style="margin-top: 20px; color: #888; font-size: 12px;">Sent via Zoom Scheduling Portal.</p>
    </div>
  `;
  return { subject, html };
}

// Step 1: redirect the browser to Microsoft's real sign-in page.
app.get('/api/auth/m365/authorize', (req, res) => {
  const { tenantId, clientId, redirectUri, scopes } = getM365OAuthConfig(req);

  if (!tenantId || !clientId) {
    return res.redirect('/?m365_error=' + encodeURIComponent('Microsoft 365 login is not configured yet. Set up Azure Entra ID credentials first.'));
  }

  const authorizeUrl = new URL(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_mode', 'query');
  authorizeUrl.searchParams.set('scope', scopes);
  authorizeUrl.searchParams.set('state', signOAuthState());
  authorizeUrl.searchParams.set('prompt', 'select_account');

  res.redirect(authorizeUrl.toString());
});

// Step 2: Microsoft redirects back here with an authorization code. Exchange
// it for a real access token, look up the signed-in user via Microsoft
// Graph, and issue this app's own session token for them.
app.get('/auth/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
  const oauthErrorDescription = typeof req.query.error_description === 'string' ? req.query.error_description : '';

  const failWith = (message: string) => res.redirect('/?m365_error=' + encodeURIComponent(message));

  if (oauthError) {
    return failWith(oauthErrorDescription || oauthError);
  }
  if (!code) {
    return failWith('Microsoft did not return an authorization code.');
  }
  if (!state || !verifyOAuthState(state)) {
    return failWith('Your Microsoft 365 sign-in request expired or was invalid. Please try again.');
  }

  const { tenantId, clientId, clientSecret, redirectUri, scopes, orgDomain } = getM365OAuthConfig(req);
  if (!tenantId || !clientId || !clientSecret) {
    return failWith('Microsoft 365 login is not fully configured (missing tenant, client ID, or client secret).');
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: scopes
      }).toString()
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenRes.ok || !tokenData.access_token) {
      return failWith(tokenData.error_description || tokenData.error || 'Microsoft rejected the sign-in request.');
    }

    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = (await profileRes.json()) as any;
    if (!profileRes.ok) {
      return failWith(profile?.error?.message || 'Failed to read your Microsoft 365 profile.');
    }

    const userEmail = String(profile.mail || profile.userPrincipalName || '').toLowerCase().trim();
    if (!userEmail) {
      return failWith('Your Microsoft 365 account has no email address Graph will report.');
    }
    if (orgDomain && !userEmail.endsWith(`@${orgDomain}`)) {
      return failWith(`Only ${orgDomain} accounts may sign in here.`);
    }

    const isAdmin = userEmail.includes('admin');
    const displayName = profile.displayName || userEmail.split('@')[0];

    const user = {
      id: profile.id || `m365-${userEmail}`,
      name: displayName,
      email: userEmail,
      role: profile.jobTitle || (isAdmin ? 'Administrator' : 'Staff Member'),
      isAdmin,
      department: profile.department || 'Microsoft 365',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      tenantName: process.env.MICROSOFT_ORGANIZATION_DOMAIN || 'Azure Entra ID',
      tenantId,
      scopes: scopes.split(/\s+/).filter(Boolean),
      accessToken: issueM365SsoSessionToken(userEmail, isAdmin),
      provider: 'm365',
      jobTitle: profile.jobTitle || undefined,
      signedInAt: new Date().toISOString()
    };

    const encodedUser = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
    res.redirect(`/#m365_sso=${encodedUser}`);
  } catch (err: any) {
    console.error('M365 SSO callback error:', err);
    failWith(err?.message || 'Unexpected error completing Microsoft 365 sign-in.');
  }
});

app.get('/api/auth/m365/status', (req, res) => {
  const isConfigured = Boolean(
    process.env.MICROSOFT_CLIENT_ID && 
    process.env.MICROSOFT_TENANT_ID && 
    process.env.MICROSOFT_CLIENT_ID.trim() !== '' && 
    process.env.MICROSOFT_TENANT_ID.trim() !== ''
  );
  res.json({
    success: true,
    configured: isConfigured,
    message: isConfigured 
      ? 'Microsoft 365 Entra ID is configured.' 
      : 'Microsoft 365 Entra ID is not configured (MICROSOFT_CLIENT_ID and MICROSOFT_TENANT_ID required).'
  });
});

app.get('/api/auth/m365/accounts', (req, res) => {
  res.json({
    success: true,
    data: m365DirectoryUsers
  });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, department } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required to register in Supabase.'
    });
  }

  const result = await registerSupabaseUser(email, password, name || email.split('@')[0], department);
  if (result.success && result.user) {
    return res.json({
      success: true,
      message: 'User registered and authenticated successfully in Supabase.',
      user: result.user
    });
  } else {
    return res.status(400).json({
      success: false,
      message: result.error || 'Failed to create user in Supabase.'
    });
  }
});

app.post('/api/auth/m365/login', async (req, res) => {
  const { email, password } = req.body;
  const rawInput = (email || '').trim().toLowerCase();
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown Client';

  const entry = getRateLimitEntry(req);

  // 0. Check Permanent IP Block
  if (entry.isPermanentlyBlocked) {
    const blockedLog: FailedAttemptRecord = {
      id: `fail-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ip: clientIp,
      emailAttempted: rawInput || 'empty',
      timestamp: new Date().toISOString(),
      reason: 'Rejected: IP is permanently blocked due to repeated login failures',
      userAgent
    };
    failedLoginLogs.unshift(blockedLog);
    persistFailedLogin(blockedLog);
    return res.status(403).json({
      success: false,
      blocked: true,
      message: 'Your IP address has been permanently blocked due to repeated failed login attempts. Please contact an administrator.'
    });
  }

  // 1. Check Active Lockout Window
  if (entry.lockoutUntil && entry.lockoutUntil > Date.now()) {
    const remainingSeconds = Math.ceil((entry.lockoutUntil - Date.now()) / 1000);
    return res.status(429).json({
      success: false,
      lockedOut: true,
      remainingSeconds,
      lockoutUntil: entry.lockoutUntil,
      lockoutCycle: entry.lockoutCycle,
      message: `Too many failed login attempts. Please wait ${remainingSeconds} seconds before trying again.`
    });
  }

  // If lockout timer just expired, reset consecutive fails for the new attempt batch
  resetExpiredLockout(entry);

  // Real Microsoft 365 SSO goes through /api/auth/m365/authorize +
  // /auth/callback (a real Entra ID OAuth redirect flow), not this
  // password endpoint - it never accepts an isSSO/authMethod flag itself.

  // 2. Strict Supabase Authentication
  if (!rawInput) {
    return res.status(400).json({
      success: false,
      message: 'Invalid credentials.'
    });
  }

  try {
    const sbResult = await authenticateLocalUser(rawInput, password);
    if (sbResult.success && sbResult.user) {
      // Successful login -> Reset consecutive fails and lockout
      entry.consecutiveFails = 0;
      entry.lockoutUntil = null;
      entry.lastAttemptAt = new Date().toISOString();

      return res.json({
        success: true,
        message: 'Signed in successfully via Supabase Database Authentication.',
        user: sbResult.user
      });
    }

    // Authentication FAILED -> Process rate limit and lockout logic
    entry.consecutiveFails++;
    entry.lastAttemptAt = new Date().toISOString();

    const failedLog: FailedAttemptRecord = {
      id: `fail-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ip: clientIp,
      emailAttempted: rawInput,
      timestamp: new Date().toISOString(),
      reason: sbResult.error || 'Invalid credentials or user not found in Supabase Auth/DB',
      userAgent
    };
    failedLoginLogs.unshift(failedLog);
    persistFailedLogin(failedLog);

    if (failedLoginLogs.length > 250) {
      failedLoginLogs.length = 250;
    }

    // Check if 3 consecutive failures reached
    if (entry.consecutiveFails >= 3) {
      entry.lockoutCycle++;

      if (entry.lockoutCycle === 1) {
        // Initial block: 1 minute (60 seconds)
        entry.lockoutUntil = Date.now() + 60 * 1000;
        return res.status(429).json({
          success: false,
          lockedOut: true,
          remainingSeconds: 60,
          lockoutUntil: entry.lockoutUntil,
          lockoutCycle: 1,
          message: 'Invalid credentials. 3 consecutive failed attempts reached. You are temporarily locked out for 1 minute.'
        });
      } else if (entry.lockoutCycle === 2) {
        // Repeat cycle 1: 3 minutes (180 seconds)
        entry.lockoutUntil = Date.now() + 180 * 1000;
        return res.status(429).json({
          success: false,
          lockedOut: true,
          remainingSeconds: 180,
          lockoutUntil: entry.lockoutUntil,
          lockoutCycle: 2,
          message: 'Invalid credentials. Repeated failed attempts in this session. Locked out for 3 minutes (Cycle 1 of 3).'
        });
      } else if (entry.lockoutCycle === 3) {
        // Repeat cycle 2: 3 minutes (180 seconds)
        entry.lockoutUntil = Date.now() + 180 * 1000;
        return res.status(429).json({
          success: false,
          lockedOut: true,
          remainingSeconds: 180,
          lockoutUntil: entry.lockoutUntil,
          lockoutCycle: 3,
          message: 'Invalid credentials. Repeated failed attempts in this session. Locked out for 3 minutes (Cycle 2 of 3).'
        });
      } else if (entry.lockoutCycle === 4) {
        // Repeat cycle 3: 3 minutes (180 seconds) - Last chance
        entry.lockoutUntil = Date.now() + 180 * 1000;
        return res.status(429).json({
          success: false,
          lockedOut: true,
          remainingSeconds: 180,
          lockoutUntil: entry.lockoutUntil,
          lockoutCycle: 4,
          message: 'Invalid credentials. Repeated failed attempts in this session. Locked out for 3 minutes (Cycle 3 of 3 - Final Warning).'
        });
      } else {
        // Exceeded 3 repeat blocks -> Permanently block IP
        entry.isPermanentlyBlocked = true;
        entry.lockoutUntil = null;
        return res.status(403).json({
          success: false,
          blocked: true,
          message: 'Invalid credentials. Your IP address has been permanently blocked due to repeated failed login attempts. Please contact an administrator.'
        });
      }
    }

    // Normal failed attempt (< 3 consecutive) -> Always return "Invalid credentials."
    const remainingAttempts = 3 - entry.consecutiveFails;
    return res.status(401).json({
      success: false,
      message: `Invalid credentials. (${entry.consecutiveFails}/3 failed attempts)`,
      consecutiveFails: entry.consecutiveFails,
      attemptsRemaining: remainingAttempts
    });

  } catch (err: any) {
    console.error('Supabase authentication error:', err);
    return res.status(500).json({
      success: false,
      message: 'Invalid credentials.'
    });
  }
});

// Admin Security Audits & IP Management
// resolveIdentity/requireAdmin are declared further down but hoisted, since
// these are function declarations evaluated before any request runs.
async function requireAdmin(req: express.Request, res: express.Response): Promise<string | null> {
  const identity = await resolveIdentity(req);
  if (!identity) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return null;
  }
  if (!identity.isAdmin) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return null;
  }
  return identity.email;
}

app.get('/api/admin/failed-logins', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const rateLimits = Array.from(rateLimitStore.values()).map((r) => {
    resetExpiredLockout(r);
    const remainingSeconds = r.lockoutUntil && r.lockoutUntil > Date.now()
      ? Math.ceil((r.lockoutUntil - Date.now()) / 1000)
      : 0;
    return {
      ...r,
      remainingSeconds
    };
  });

  const activeLockoutsCount = rateLimits.filter((r) => r.remainingSeconds > 0).length;
  const permanentlyBlockedIpsCount = rateLimits.filter((r) => r.isPermanentlyBlocked).length;

  res.json({
    success: true,
    data: {
      totalFailedAttempts: failedLoginLogs.length,
      activeLockoutsCount,
      permanentlyBlockedIpsCount,
      failedLogs: failedLoginLogs,
      rateLimits
    }
  });
});

app.post('/api/admin/unblock-ip', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, message: 'IP address is required.' });
  }

  const entry = rateLimitStore.get(ip);
  if (entry) {
    entry.isPermanentlyBlocked = false;
    entry.lockoutUntil = null;
    entry.consecutiveFails = 0;
    entry.lockoutCycle = 0;
    rateLimitStore.set(ip, entry);
  }

  res.json({
    success: true,
    message: `IP ${ip} has been successfully unblocked and login limits have been reset.`
  });
});

app.post('/api/admin/clear-failed-logs', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  failedLoginLogs.length = 0;
  await clearTable('failed_login_logs');
  res.json({
    success: true,
    message: 'Failed login security logs have been cleared.'
  });
});


// 3. Host Accounts Endpoints
app.get('/api/host-accounts', (req, res) => {
  res.json({
    success: true,
    data: hostAccounts
  });
});

// 4. Meeting Types
app.get('/api/meeting-types', (req, res) => {
  res.json({ success: true, data: meetingTypes });
});

app.get('/api/meeting-types/:id', (req, res) => {
  const item = meetingTypes.find((m) => m.id === req.params.id || m.slug === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Meeting type not found' });
  res.json({ success: true, data: item });
});

app.post('/api/meeting-types', (req, res) => {
  const newType: SeedMeetingType = {
    id: `mt-${Date.now()}`,
    slug: (req.body.title || 'new-meeting').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: req.body.title || 'New Zoom Meeting',
    duration: Number(req.body.duration) || 30,
    description: req.body.description || '',
    color: req.body.color || '#0E71EB',
    hostName: req.body.hostName || 'Sarah Jenkins',
    hostEmail: req.body.hostEmail || 'sarah.jenkins@zoompartner.com',
    hostAvatar: req.body.hostAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    hostRole: req.body.hostRole || 'Meeting Host',
    hostAccountId: req.body.hostAccountId || 'acc-1',
    zoomMeetingType: req.body.zoomMeetingType || 'video',
    requiresApproval: req.body.requiresApproval || false,
    isActive: true,
    bufferMinutes: Number(req.body.bufferMinutes) || 10,
    customQuestions: req.body.customQuestions || []
  };
  meetingTypes.push(newType);
  upsertRow('meeting_types', newType.id, newType).catch(() => {});
  res.status(201).json({ success: true, data: newType });
});

// 5. Account-Aware Availability Matrix Generator (Shows which accounts are open/busy)
app.get('/api/availability', async (req, res) => {
  try {
    const {
      meetingTypeId,
      date,
      timezone = 'America/New_York',
      accountId, // optional filter by specific host account
      duration: queryDuration
    } = req.query as {
      meetingTypeId?: string;
      date?: string;
      timezone?: string;
      accountId?: string;
      duration?: string;
    };

    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required (YYYY-MM-DD)' });
    }

    const meetingType = meetingTypes.find((m) => m.id === meetingTypeId) || meetingTypes[0];
    const duration = queryDuration ? parseInt(queryDuration, 10) : (meetingType ? meetingType.duration : 30);

    // Day of week check: Weekends closed by default
    const parsedDate = new Date(`${date}T12:00:00`);
    const dayOfWeek = parsedDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Each meeting type has one fixed host - only checking that host (instead
    // of every demo host account) is what makes a booked slot actually show
    // as blocked for that meeting type. An explicit accountId query param
    // still wins, for the (currently unused) multi-host picker.
    const meetingTypeHost = meetingType?.hostAccountId
      ? hostAccounts.find((a) => a.id === meetingType.hostAccountId)
      : undefined;

    const targetAccounts = accountId && accountId !== 'all'
      ? hostAccounts.filter((a) => a.id === accountId)
      : meetingTypeHost
      ? [meetingTypeHost]
      : hostAccounts;

    // Real Microsoft 365 calendar conflicts for this day, per rotating Zoom
    // account (A/B) - those are the accounts that actually host meetings,
    // so their own real M365 calendars are what can genuinely conflict.
    const configuredZoomAccounts = getConfiguredAccountKeys();
    const zoomAccountM365Blocks = new Map<ZoomAccountKey, M365BusyBlock[]>();
    if (m365CalendarState.syncEnabled && configuredZoomAccounts.length > 0) {
      let anyReachable = false;
      for (const key of configuredZoomAccounts) {
        const blocks = await getZoomAccountM365BusyBlocks(key, date);
        if (blocks !== null) {
          zoomAccountM365Blocks.set(key, blocks);
          anyReachable = true;
        }
      }
      m365CalendarState.lastCheckedAt = new Date().toISOString();
      m365CalendarState.connected = anyReachable;
      m365CalendarState.lastError = anyReachable ? null : 'Could not reach Microsoft Graph for either rotating account mailbox.';
    }

    // An org-wide slot is only truly available if at least one of the two
    // rotating Zoom accounts is free on both its own real M365 calendar and
    // its existing Zoom bookings - that's the actual capacity limit,
    // independent of which display host persona is shown.
    const isZoomAccountFreeAt = (key: ZoomAccountKey, slotStartMs: number, slotEndMs: number) => {
      const zoomBusy = bookings.some(
        (b) =>
          b.status !== 'cancelled' &&
          b.zoomAccountKey === key &&
          new Date(b.startTimeIso).getTime() < slotEndMs &&
          slotStartMs < new Date(b.endTimeIso).getTime()
      );
      if (zoomBusy) return false;

      const blocks = zoomAccountM365Blocks.get(key);
      if (!blocks) return true; // couldn't check this account - fail open
      return !blocks.some(
        (block) => slotStartMs < new Date(block.endIso).getTime() && slotEndMs > new Date(block.startIso).getTime()
      );
    };

    // Booking hours: 08:00 AM to 20:00 (8:00 PM)
    const slots: Array<{
      id: string;
      time: string;
      formattedTime: string;
      isoString: string;
      isAvailable: boolean; // TRUE = GREEN, FALSE = RED
      reason?: string;
      availableAccounts: HostAccount[];
      unavailableAccounts: Array<{ account: HostAccount; reason: string }>;
      assignedHost?: HostAccount;
      bookedBy?: { name: string; company?: string };
    }> = [];

    const startHour = 8;
    const endHour = 20;
    const stepMinutes = duration <= 15 ? 15 : duration <= 30 ? 30 : duration <= 45 ? 45 : 60;

    // Track daily open slots count per host account
    const accountOpenCounts: Record<string, number> = {};
    targetAccounts.forEach((acc) => {
      accountOpenCounts[acc.id] = 0;
    });

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += stepMinutes) {
        if (h + m / 60 + duration / 60 > endHour) continue;

        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedTime = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
        const slotIso = `${date}T${timeStr}:00.000Z`;

        if (isWeekend) {
          slots.push({
            id: `${date}-${timeStr}`,
            time: timeStr,
            formattedTime,
            isoString: slotIso,
            isAvailable: false,
            reason: 'Weekend (Unavailable)',
            availableAccounts: [],
            unavailableAccounts: targetAccounts.map((acc) => ({ account: acc, reason: 'Weekend' }))
          });
          continue;
        }

        // Check each target account for availability
        const availableForSlot: HostAccount[] = [];
        const unavailableForSlot: Array<{ account: HostAccount; reason: string }> = [];

        targetAccounts.forEach((acc) => {
          // Check Zoom Bookings
          const existingBooking = bookings.find(
            (b) =>
              b.date === date &&
              b.timeSlot === formattedTime &&
              b.status !== 'cancelled' &&
              (b.hostAccountId === acc.id || b.hostEmail === acc.email)
          );

          // Real capacity check: is at least one rotating Zoom account free
          // (both Zoom-side and real M365) at this exact time?
          const slotStart = new Date(slotIso).getTime();
          const slotEnd = slotStart + duration * 60 * 1000;
          const noZoomAccountFree =
            configuredZoomAccounts.length > 0 &&
            !configuredZoomAccounts.some((key) => isZoomAccountFreeAt(key, slotStart, slotEnd));

          // Lunch / buffer check
          const isLunchBuffer = h === 12 && m === 0;

          if (existingBooking) {
            unavailableForSlot.push({ account: acc, reason: `Booked in Zoom: ${existingBooking.meetingTitle}` });
          } else if (noZoomAccountFree) {
            unavailableForSlot.push({ account: acc, reason: 'Both rotating Zoom accounts busy (Zoom + M365 calendar)' });
          } else if (isLunchBuffer) {
            unavailableForSlot.push({ account: acc, reason: 'Lunch / Administrative Buffer' });
          } else {
            availableForSlot.push(acc);
            accountOpenCounts[acc.id] = (accountOpenCounts[acc.id] || 0) + 1;
          }
        });

        const isSlotOpen = availableForSlot.length > 0;

        slots.push({
          id: `${date}-${timeStr}`,
          time: timeStr,
          formattedTime,
          isoString: slotIso,
          isAvailable: isSlotOpen, // GREEN if open, RED if all busy
          reason: isSlotOpen
            ? undefined
            : unavailableForSlot.length > 0
            ? unavailableForSlot[0].reason
            : 'All Accounts Unavailable',
          availableAccounts: availableForSlot,
          unavailableAccounts: unavailableForSlot,
          assignedHost: availableForSlot[0] || targetAccounts[0]
        });
      }
    }

    const hostAccountsSummary = targetAccounts.map((acc) => ({
      ...acc,
      dailyOpenSlotsCount: accountOpenCounts[acc.id] || 0,
      status: (accountOpenCounts[acc.id] || 0) > 0 ? ('available' as const) : ('busy' as const)
    }));

    res.json({
      success: true,
      date,
      timezone,
      duration,
      slots,
      totalAvailable: slots.filter((s) => s.isAvailable).length,
      totalBooked: slots.filter((s) => !s.isAvailable).length,
      hostAccountsSummary,
      selectedAccountId: accountId || 'all',
      m365SyncActive: m365CalendarState.syncEnabled
    });
  } catch (err: any) {
    console.error('Error in /api/availability:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to calculate availability' });
  }
});

// 6. Bookings Endpoints

interface RequestIdentity {
  email: string;
  isAdmin: boolean;
}

// Resolves who is actually making this request. When Supabase is
// configured, this is a real, server-verified identity: the client sends
// its Supabase session token, and we ask Supabase to vouch for it - the
// client's own claim of who it is (or whether it's an admin) is never
// trusted. Only when Supabase itself isn't configured anywhere in this
// deployment (pure local/demo mode) do we fall back to trusting a
// self-asserted X-User-Email header, matching this app's "still works
// without real credentials" pattern elsewhere — that fallback provides no
// real security guarantee and is not meant for production use.
async function resolveIdentity(req: express.Request): Promise<RequestIdentity | null> {
  if (isSupabaseConfigured()) {
    const authHeader = req.headers['authorization'];
    const token = typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;
    if (!token) return null;

    // Real Supabase sessions first; fall back to our own signed demo-account
    // tokens (see issueDemoSessionToken) for explicitly allowlisted demo
    // profiles that don't have a real Supabase Auth password, and to
    // real Microsoft Entra ID SSO sessions (see issueM365SsoSessionToken).
    return (await verifySessionToken(token)) || verifyDemoSessionToken(token) || verifyM365SsoSessionToken(token);
  }

  const raw = req.headers['x-user-email'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const email = value ? value.toString().toLowerCase().trim() : '';
  if (!email) return null;
  return { email, isAdmin: email.includes('admin') || email === 'sarah.jenkins@zoompartner.com' };
}

function canAccessBooking(booking: any, email: string): boolean {
  const participantMatch = (booking.participantEmail || '').toLowerCase().trim() === email;
  const guestMatch = (booking.guestEmails || []).some(
    (g: string) => (g || '').toLowerCase().trim() === email
  );
  return participantMatch || guestMatch;
}

// zoomDetails.startUrl lets whoever holds it start/control the meeting as
// host - it's for the host, never the participant who booked it. Nothing
// in this app's participant-facing UI uses it (only join_url does), so it
// is stripped for anyone but an admin.
function redactStartUrlForParticipant(booking: any): any {
  if (!booking?.zoomDetails?.startUrl) return booking;
  const { startUrl, ...restZoomDetails } = booking.zoomDetails;
  return { ...booking, zoomDetails: restZoomDetails };
}

app.get('/api/bookings', async (req, res) => {
  try {
    const identity = await resolveIdentity(req);
    if (!identity) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const { email, isAdmin } = identity;
    const visible = isAdmin ? bookings : bookings.filter((b) => canAccessBooking(b, email));
    res.json({ success: true, data: isAdmin ? visible : visible.map(redactStartUrlForParticipant) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  const identity = await resolveIdentity(req);
  if (!identity) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const { email, isAdmin } = identity;
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking || (!isAdmin && !canAccessBooking(booking, email))) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }
  res.json({ success: true, data: isAdmin ? booking : redactStartUrlForParticipant(booking) });
});

app.post('/api/bookings', async (req, res) => {
  try {
    const {
      meetingTypeId,
      hostAccountId,
      date,
      timeSlot,
      timezone = 'America/New_York',
      participantName,
      participantEmail,
      participantPhone,
      participantCompany,
      guestEmails = [],
      answers = {},
      notes,
      meetingTopic,
      topic,
      zoomConfig,
    } = req.body;

    if (!participantName || !participantEmail || !date || !timeSlot) {
      return res.status(400).json({
        success: false,
        error: 'Missing required booking information (name, email, date, timeSlot)'
      });
    }

    const meetingType = meetingTypes.find((m) => m.id === meetingTypeId) || meetingTypes[0];
    const assignedHost = hostAccounts.find((a) => a.id === hostAccountId) ||
      hostAccounts.find((a) => a.id === meetingType.hostAccountId) ||
      hostAccounts[0];

    const finalMeetingTitle = (meetingTopic || topic || meetingType.title || 'Zoom Video Meeting').trim();

    // Safely parse timeSlot ("9:00 AM", "2:30 PM", etc.)
    const timeMatch = timeSlot.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    let hour = 9;
    let minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const startIso = `${date}T${pad(hour)}:${pad(minute)}:00.000Z`;
    const endMinutes = hour * 60 + minute + (meetingType.duration || 30);
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endIso = `${date}T${pad(endHour)}:${pad(endMin)}:00.000Z`;

    // Assign one of the two rotating Zoom accounts and provision the meeting
    // (real Zoom REST API call when that account has credentials configured,
    // otherwise a local mock so the app still works in dev without them).
    const zoomAccountKey = await pickZoomAccount(startIso, endIso);
    if (getConfiguredAccountKeys().length > 0 && !zoomAccountKey) {
      return res.status(409).json({
        success: false,
        error: 'Both rotating Zoom accounts already have a meeting at this time. Please choose a different slot.'
      });
    }

    let zoomDetails;
    try {
      ({ zoomDetails } = await provisionZoomMeeting(
        zoomAccountKey,
        finalMeetingTitle,
        assignedHost.name,
        startIso,
        meetingType.duration || 30,
        timezone,
        notes,
        zoomConfig
      ));
    } catch (zoomErr: any) {
      console.error('Zoom API error while creating meeting:', zoomErr);
      return res.status(502).json({
        success: false,
        error: `Failed to create the Zoom meeting: ${zoomErr.message || 'Zoom API error'}`
      });
    }

    const newBooking = {
      id: `zm-${Math.floor(100000 + Math.random() * 900000)}`,
      meetingTypeId: meetingType.id,
      meetingTitle: finalMeetingTitle,
      duration: meetingType.duration,
      hostName: assignedHost.name,
      hostEmail: assignedHost.email,
      hostAvatar: assignedHost.avatar,
      hostAccountId: assignedHost.id,
      zoomAccountKey,
      participantName,
      participantEmail,
      participantPhone,
      participantCompany,
      guestEmails,
      date,
      timeSlot,
      startTimeIso: startIso,
      endTimeIso: endIso,
      timezone,
      zoomDetails,
      zoomConfig: {
        invitees: guestEmails,
        meetingIdType: zoomConfig?.meetingIdType || 'auto',
        pmiNumber: assignedHost.zoomPmi || '',
        hasAgenda: false,
        agenda: '',
        attachments: [],
        passcodeEnabled: zoomConfig?.passcodeEnabled ?? true,
        passcode: zoomDetails.passcode,
        waitingRoom: zoomConfig?.waitingRoom ?? true,
        requireAuth: zoomConfig?.requireAuth ?? false,
        allowMyNotesTranscript: true,
        enableContinuousChat: true,
        hostVideo: zoomConfig?.hostVideo ?? true,
        participantVideo: zoomConfig?.participantVideo ?? true,
        audioOption: zoomConfig?.audioOption || 'both',
        calendarType: 'outlook',
        joinAnytime: zoomConfig?.joinAnytime ?? false,
        enableQa: false,
        muteOnEntry: zoomConfig?.muteOnEntry ?? true,
        autoRecord: zoomConfig?.autoRecord ?? false,
        autoAddCloudRecordingToChannel: false,
        enableAdditionalDataCenters: false,
        alternativeHosts: '',
        manageAssetsSummary: true,
        manageAssetsRecording: true,
      },
      // M365 sync only reads the configured mailbox's calendar for conflict
      // checking (see getRealM365BusyBlocks) - it does not write bookings
      // back into Outlook as real calendar events, so there is no real
      // event ID to record here.
      m365SyncStatus: 'not_synced' as const,
      m365EventId: undefined,
      answers,
      status: 'confirmed',
      reminders: {
        emailSent: false,
        emailSentAt: undefined as string | undefined,
        emailError: undefined as string | undefined,
        pushScheduled: true,
        reminderMinutes: [1440, 60, 15]
      },
      createdAt: new Date().toISOString(),
      notes: notes || 'Booked via Zoom Scheduling Portal'
    };

    bookings.unshift(newBooking);
    await upsertRow('bookings', newBooking.id, newBooking);

    // Real confirmation email, sent AS the rotating Zoom account that
    // hosts this specific meeting (its real M365 mailbox), not a fixed
    // sender - to the participant and every invitee.
    const emailRecipients = [newBooking.participantEmail, ...(newBooking.guestEmails || [])].filter(Boolean);
    const senderMailbox = zoomAccountKey ? (process.env[`ZOOM_ACCOUNT_${zoomAccountKey}_USER_ID`] || '') : '';
    const { subject, html } = buildBookingConfirmationEmail(newBooking);
    const emailResult = await sendGraphMail(senderMailbox, emailRecipients, subject, html);
    newBooking.reminders.emailSent = emailResult.success;
    if (emailResult.success) {
      newBooking.reminders.emailSentAt = new Date().toISOString();
    } else {
      newBooking.reminders.emailError = emailResult.error;
    }
    await upsertRow('bookings', newBooking.id, newBooking);

    sendPushToEmail(newBooking.participantEmail, {
      title: 'Zoom Meeting Confirmed',
      body: `${newBooking.meetingTitle} - ${newBooking.date} at ${newBooking.timeSlot}`,
      tag: `booking-${newBooking.id}`,
      url: '/'
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: redactStartUrlForParticipant(newBooking),
      message: emailResult.success
        ? 'Zoom meeting scheduled successfully! Confirmation email sent.'
        : `Zoom meeting scheduled successfully. Confirmation email failed to send: ${emailResult.error}`
    });
  } catch (err: any) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create booking' });
  }
});

app.patch('/api/bookings/:id', async (req, res) => {
  const identity = await resolveIdentity(req);
  if (!identity) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking || (!identity.isAdmin && !canAccessBooking(booking, identity.email))) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  const { zoomConfig, meetingTitle, notes, guestEmails } = req.body;

  const accountKey = booking.zoomAccountKey as ZoomAccountKey | undefined;
  if (booking.zoomDetails.apiGenerated && accountKey && isAccountConfigured(accountKey)) {
    try {
      const rawMeetingId = booking.zoomDetails.meetingId.replace(/\s/g, '');
      const result = await updateZoomMeeting(accountKey, rawMeetingId, {
        topic: meetingTitle,
        agenda: zoomConfig?.agenda,
        passcode: zoomConfig?.passcode,
        waitingRoom: zoomConfig?.waitingRoom,
        autoRecording: zoomConfig?.autoRecord,
        autoRecordTo: 'local',
        alternativeHosts: zoomConfig?.alternativeHosts,
        hostVideo: zoomConfig?.hostVideo,
        participantVideo: zoomConfig?.participantVideo,
        audioOption: zoomConfig?.audioOption,
        muteOnEntry: zoomConfig?.muteOnEntry,
        joinBeforeHost: zoomConfig?.joinAnytime,
        meetingAuthentication: zoomConfig?.requireAuth,
        usePmi: zoomConfig ? zoomConfig.meetingIdType === 'pmi' : undefined
      });
      const updateLog: ZoomApiLog = {
        id: `zlog-${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: 'PATCH',
        endpoint: result.endpoint,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        payloadSummary: `Updated Zoom meeting ${rawMeetingId} on ${getAccountLabel(accountKey)}`
      };
      zoomApiLogs.unshift(updateLog);
      if (zoomApiLogs.length > 30) zoomApiLogs.pop();
      persistZoomLog(updateLog);
    } catch (zoomErr: any) {
      console.error('Zoom API error while updating meeting:', zoomErr);
      return res.status(502).json({
        success: false,
        error: `Failed to update the Zoom meeting: ${zoomErr.message || 'Zoom API error'}`
      });
    }
  }

  if (zoomConfig) booking.zoomConfig = zoomConfig;
  if (meetingTitle) booking.meetingTitle = meetingTitle;
  if (notes !== undefined) booking.notes = notes;
  if (guestEmails) booking.guestEmails = guestEmails;

  // If passcode in zoomConfig changed, update zoomDetails.passcode
  if (zoomConfig?.passcode) {
    booking.zoomDetails.passcode = zoomConfig.passcode;
  }

  await upsertRow('bookings', booking.id, booking);

  res.json({
    success: true,
    data: booking,
    message: 'Meeting details & Zoom configuration updated and synced with Microsoft 365 Exchange.'
  });
});

app.post('/api/bookings/:id/cancel', async (req, res) => {
  const identity = await resolveIdentity(req);
  if (!identity) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking || (!identity.isAdmin && !canAccessBooking(booking, identity.email))) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  const accountKey = booking.zoomAccountKey as ZoomAccountKey | undefined;
  const rawMeetingId = booking.zoomDetails.meetingId.replace(/\s/g, '');

  if (booking.zoomDetails.apiGenerated && accountKey && isAccountConfigured(accountKey)) {
    try {
      const result = await deleteZoomMeeting(accountKey, rawMeetingId);
      const cancelLog: ZoomApiLog = {
        id: `zlog-${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: 'DELETE',
        endpoint: result.endpoint,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        payloadSummary: `Cancelled Zoom meeting ${rawMeetingId} on ${getAccountLabel(accountKey)}`
      };
      zoomApiLogs.unshift(cancelLog);
      if (zoomApiLogs.length > 30) zoomApiLogs.pop();
      persistZoomLog(cancelLog);
    } catch (zoomErr: any) {
      console.error('Zoom API error while cancelling meeting:', zoomErr);
      return res.status(502).json({
        success: false,
        error: `Failed to cancel the Zoom meeting: ${zoomErr.message || 'Zoom API error'}`
      });
    }
  } else {
    const mockCancelLog: ZoomApiLog = {
      id: `zlog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: 'DELETE',
      endpoint: `https://api.zoom.us/v2/meetings/${rawMeetingId}`,
      statusCode: 204,
      responseTimeMs: 95,
      payloadSummary: `Cancelled Zoom meeting ${booking.zoomDetails.meetingId} via Zoom REST API`
    };
    zoomApiLogs.unshift(mockCancelLog);
    persistZoomLog(mockCancelLog);
  }

  booking.status = 'cancelled';
  await upsertRow('bookings', booking.id, booking);

  sendPushToEmail(booking.participantEmail, {
    title: 'Zoom Meeting Cancelled',
    body: `${booking.meetingTitle} (${booking.date} at ${booking.timeSlot}) has been cancelled.`,
    tag: `booking-${booking.id}`,
    url: '/'
  }).catch(() => {});

  res.json({ success: true, message: 'Meeting cancelled and removed from Microsoft 365 calendar and Zoom.', data: booking });
});

// 7. Zoom REST API Integration Endpoints
app.get('/api/zoom/config', (req, res) => {
  const accounts = (['A', 'B'] as ZoomAccountKey[]).map((key) => ({
    key,
    label: getAccountLabel(key),
    configured: isAccountConfigured(key),
    accountIdMasked: getMaskedAccountId(key)
  }));

  res.json({
    success: true,
    data: {
      ...zoomApiConfig,
      accounts,
      mode: accounts.some((a) => a.configured) ? 'live' : 'demo_mode',
      webhookSecretConfigured: Boolean(process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
    },
    activeRoomsCount: bookings.filter((b) => b.status !== 'cancelled').length
  });
});

// Admin-only: view/edit the two rotating Zoom credentials, persisted to .env
// so they survive a restart. The client secret is write-only - GET never
// returns it, only whether one is currently set.
app.get('/api/admin/zoom/config', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const accounts = (['A', 'B'] as ZoomAccountKey[]).map((key) => getAccountAdminView(key));
  res.json({ success: true, data: { accounts } });
});

app.post('/api/admin/zoom/config', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const { accountKey, label, accountId, clientId, clientSecret, userId } = req.body as {
    accountKey?: string;
    label?: string;
    accountId?: string;
    clientId?: string;
    clientSecret?: string;
    userId?: string;
  };

  if (accountKey !== 'A' && accountKey !== 'B') {
    return res.status(400).json({ success: false, message: 'accountKey must be "A" or "B"' });
  }

  const prefix = `ZOOM_ACCOUNT_${accountKey}`;
  // Whitelisted keys only - never forward the request body's own key names
  // to updateEnvFile, so this can't be used to overwrite arbitrary env vars.
  const keys: Record<string, string> = {};
  if (label !== undefined) keys[`${prefix}_LABEL`] = label;
  if (accountId !== undefined) keys[`${prefix}_ID`] = accountId;
  if (clientId !== undefined) keys[`${prefix}_CLIENT_ID`] = clientId;
  if (userId !== undefined) keys[`${prefix}_USER_ID`] = userId;
  // Blank/omitted secret means "keep the existing one" - never blank it out
  // just because the field was left empty in the edit form.
  if (clientSecret) keys[`${prefix}_CLIENT_SECRET`] = clientSecret;

  const saved = updateEnvFile(keys);

  res.json({
    success: saved,
    message: saved
      ? `${getAccountLabel(accountKey)} credentials saved.`
      : 'Saved to memory, but failed to write .env file to disk - changes will not survive a restart.',
    data: getAccountAdminView(accountKey)
  });
});

app.post('/api/zoom/test-connection', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const results: Array<{ key: ZoomAccountKey; label: string; connected: boolean; latencyMs?: number; error?: string }> = [];

  for (const key of (['A', 'B'] as ZoomAccountKey[])) {
    if (!isAccountConfigured(key)) {
      results.push({ key, label: getAccountLabel(key), connected: false, error: 'Not configured' });
      continue;
    }
    try {
      const result = await getZoomUserProfile(key);
      const pingLog: ZoomApiLog = {
        id: `zlog-${Date.now()}-${key}`,
        timestamp: new Date().toISOString(),
        method: 'GET',
        endpoint: result.endpoint,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        payloadSummary: `Ping test successful on ${getAccountLabel(key)}: authenticated as ${result.data.email || result.data.id}`
      };
      zoomApiLogs.unshift(pingLog);
      persistZoomLog(pingLog);
      results.push({ key, label: getAccountLabel(key), connected: true, latencyMs: result.responseTimeMs });
    } catch (err: any) {
      results.push({ key, label: getAccountLabel(key), connected: false, error: err.message || 'Zoom API error' });
    }
  }
  if (zoomApiLogs.length > 30) zoomApiLogs.length = 30;

  const anyConnected = results.some((r) => r.connected);
  zoomApiConfig.lastPingMs = results.find((r) => r.latencyMs)?.latencyMs || zoomApiConfig.lastPingMs;

  res.json({
    success: anyConnected || results.every((r) => !isAccountConfigured(r.key)),
    accounts: results,
    message: results.every((r) => !isAccountConfigured(r.key))
      ? 'No Zoom accounts configured — running in demo mode with mock meeting data.'
      : `Checked ${results.length} rotating Zoom accounts.`
  });
});

app.get('/api/zoom/logs', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  res.json({
    success: true,
    data: zoomApiLogs
  });
});

// Real Zoom Event Webhook Listener.
// Configure this URL (APP_URL + /api/zoom/webhooks) under your Zoom
// Server-to-Server app's Feature > Event Subscriptions, subscribed to
// Meeting > Started/Ended/Participant Joined. Set ZOOM_WEBHOOK_SECRET_TOKEN
// to the "Secret Token" Zoom shows on that page, so requests can be verified.
app.post('/api/zoom/webhooks', (req: any, res) => {
  const body = req.body || {};
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

  // 1. Zoom's one-time endpoint URL validation handshake.
  if (body.event === 'endpoint.url_validation') {
    const plainToken = body.payload?.plainToken;
    if (!plainToken) {
      return res.status(400).json({ success: false, message: 'Missing plainToken' });
    }
    if (!secretToken) {
      return res.status(400).json({
        success: false,
        message: 'ZOOM_WEBHOOK_SECRET_TOKEN is not configured on this server; cannot complete validation.'
      });
    }
    const encryptedToken = crypto.createHmac('sha256', secretToken).update(plainToken).digest('hex');
    return res.json({ plainToken, encryptedToken });
  }

  // 2. Verify Zoom's request signature (skipped, with a warning, if no
  // secret is configured yet - matches the rest of the app's "works in
  // demo mode without real credentials" behavior).
  if (secretToken) {
    const signature = req.headers['x-zm-signature'];
    const timestamp = req.headers['x-zm-request-timestamp'];

    // Reject stale/replayed requests - a captured valid payload should not
    // stay valid forever. Zoom's own docs recommend a 5 minute window.
    const timestampMs = Number(timestamp);
    const isFreshTimestamp = Number.isFinite(timestampMs) && Math.abs(Date.now() - timestampMs) <= 5 * 60 * 1000;
    if (!isFreshTimestamp) {
      return res.status(401).json({ success: false, message: 'Missing or stale x-zm-request-timestamp' });
    }

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);
    const expected = `v0=${crypto
      .createHmac('sha256', secretToken)
      .update(`v0:${timestamp}:${rawBody}`)
      .digest('hex')}`;

    const signatureValid =
      typeof signature === 'string' &&
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!signatureValid) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
  }

  // 3. Handle the event.
  const eventName = body.event as string | undefined;
  const zoomObject = body.payload?.object;
  const rawMeetingId = zoomObject?.id !== undefined ? String(zoomObject.id) : null;
  const booking = rawMeetingId
    ? bookings.find((b) => b.zoomDetails.meetingId.replace(/\s/g, '') === rawMeetingId)
    : undefined;

  let payloadSummary = `Received ${eventName || 'unknown event'}`;
  if (eventName === 'meeting.started' && booking) {
    booking.liveStatus = 'started';
    payloadSummary = `Meeting started: "${booking.meetingTitle}" (${rawMeetingId})`;
    upsertRow('bookings', booking.id, booking).catch(() => {});
    sendPushToEmail(booking.participantEmail, {
      title: 'Zoom Meeting Started',
      body: `${booking.meetingTitle} is live now - join anytime.`,
      tag: `live-${booking.id}`,
      url: '/'
    }).catch(() => {});
  } else if (eventName === 'meeting.ended' && booking) {
    booking.liveStatus = 'ended';
    payloadSummary = `Meeting ended: "${booking.meetingTitle}" (${rawMeetingId})`;
    upsertRow('bookings', booking.id, booking).catch(() => {});
  } else if (eventName === 'meeting.participant_joined' && booking) {
    const participantName = zoomObject?.participant?.user_name || 'Unknown participant';
    payloadSummary = `${participantName} joined "${booking.meetingTitle}" (${rawMeetingId})`;
  } else if (rawMeetingId && !booking) {
    payloadSummary = `${eventName || 'Event'} for meeting ${rawMeetingId} - no matching booking found`;
  } else if (!secretToken) {
    payloadSummary += ' (signature not verified - ZOOM_WEBHOOK_SECRET_TOKEN not configured)';
  }

  const webhookLog: ZoomApiLog = {
    id: `zlog-webhook-${Date.now()}`,
    timestamp: new Date().toISOString(),
    method: 'POST',
    endpoint: '/api/zoom/webhooks',
    statusCode: 200,
    responseTimeMs: 0,
    payloadSummary
  };
  zoomApiLogs.unshift(webhookLog);
  if (zoomApiLogs.length > 30) zoomApiLogs.pop();
  persistZoomLog(webhookLog);

  res.status(200).json({ success: true });
});

// 8. Microsoft 365 Calendar & Graph API Sync (real, per rotating Zoom account)
app.get('/api/m365/status', (req, res) => {
  const mailboxes = getConfiguredAccountKeys().map((key) => ({
    accountKey: key,
    mailbox: process.env[`ZOOM_ACCOUNT_${key}_USER_ID`] || ''
  }));
  res.json({
    success: true,
    data: { ...m365CalendarState, mailboxes }
  });
});

app.post('/api/m365/sync-toggle', (req, res) => {
  m365CalendarState.syncEnabled = !m365CalendarState.syncEnabled;
  res.json({
    success: true,
    data: m365CalendarState,
    message: m365CalendarState.syncEnabled
      ? 'Microsoft 365 Calendar Sync is now active.'
      : 'Microsoft 365 Calendar Sync paused.'
  });
});

// Live-checks both rotating accounts' real M365 calendars for one date and
// returns what Graph actually reports - replaces the old fake "add a busy
// slot" simulator, which just pushed made-up data into an in-memory array
// and never touched a real calendar.
app.get('/api/m365/check-now', async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
  const configured = getConfiguredAccountKeys();

  if (configured.length === 0) {
    return res.json({ success: false, message: 'No Zoom accounts configured to check.', results: [] });
  }

  const results = await Promise.all(
    configured.map(async (key) => {
      const mailbox = process.env[`ZOOM_ACCOUNT_${key}_USER_ID`] || '';
      const blocks = await getZoomAccountM365BusyBlocks(key, date);
      return {
        accountKey: key,
        mailbox,
        reachable: blocks !== null,
        busyBlocks: blocks || []
      };
    })
  );

  m365CalendarState.lastCheckedAt = new Date().toISOString();
  const anyReachable = results.some((r) => r.reachable);
  m365CalendarState.connected = anyReachable;
  m365CalendarState.lastError = anyReachable ? null : 'Could not reach Microsoft Graph for either rotating account mailbox.';

  res.json({ success: true, date, results });
});

// 9. Reminder dispatch trigger endpoint
app.post('/api/reminders/trigger', async (req, res) => {
  const identity = await resolveIdentity(req);
  if (!identity) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const { bookingId, reminderType } = req.body;
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking || (!identity.isAdmin && !canAccessBooking(booking, identity.email))) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  await sendPushToEmail(booking.participantEmail, {
    title: 'Upcoming Zoom Meeting',
    body: `${booking.meetingTitle} starts soon (${booking.timeSlot})`,
    tag: `reminder-${booking.id}`,
    url: '/'
  });

  res.json({
    success: true,
    reminderSent: true,
    timestamp: new Date().toISOString(),
    // Host-only fields (startUrl) are never handed back over this endpoint.
    booking: { id: booking.id, meetingTitle: booking.meetingTitle, participantEmail: booking.participantEmail },
    reminderType: reminderType || '15-min-reminder',
    message: `Reminder sent to ${booking.participantEmail} for Zoom Meeting: ${booking.meetingTitle}`
  });
});

// 10. Web Push subscriptions - no login required (booking itself doesn't
// require one), keyed by whatever email the subscribing browser provides.
app.get('/api/push/vapid-public-key', (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(404).json({ success: false, configured: false, error: 'Push notifications are not configured on this server.' });
  }
  res.json({ success: true, configured: true, publicKey: key });
});

app.post('/api/push/subscribe', async (req, res) => {
  const { email, subscription } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ success: false, error: 'email and a valid push subscription are required' });
  }

  // Re-subscribing with the same endpoint (e.g. browser refreshed keys)
  // replaces the old record instead of accumulating duplicates.
  pushSubscriptions = pushSubscriptions.filter((s) => s.endpoint !== subscription.endpoint);
  const record: PushSubscriptionRecord = {
    id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: normalizedEmail,
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    createdAt: new Date().toISOString()
  };
  pushSubscriptions.push(record);
  await upsertRow('push_subscriptions', record.id, record);

  res.json({ success: true, message: 'Push notifications enabled.' });
});

app.post('/api/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ success: false, error: 'endpoint is required' });
  }
  const toRemove = pushSubscriptions.filter((s) => s.endpoint === endpoint);
  pushSubscriptions = pushSubscriptions.filter((s) => s.endpoint !== endpoint);
  for (const sub of toRemove) {
    await deleteRow('push_subscriptions', sub.id).catch(() => {});
  }
  res.json({ success: true, message: 'Push notifications disabled.' });
});

// ----------------------------------------------------
// VITE / STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  await initPersistence();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zoom Booking Portal server running on http://localhost:${PORT}`);
  });

  if (isPushConfigured()) {
    setInterval(() => {
      checkAndSendReminders().catch((err) => console.error('[push] Reminder check failed:', err));
    }, REMINDER_CHECK_INTERVAL_MS);
  }
}

startServer();

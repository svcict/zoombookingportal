// Real Zoom REST API client for the two rotating Server-to-Server OAuth credentials.
// Docs: https://developers.zoom.us/docs/api/

export type ZoomAccountKey = 'A' | 'B';

interface ZoomCredentials {
  key: ZoomAccountKey;
  label: string;
  accountId: string;
  clientId: string;
  clientSecret: string;
  userId: string; // Zoom user (email or userId) this credential set schedules meetings as
}

const ZOOM_OAUTH_TOKEN_URL = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

function readCredentials(key: ZoomAccountKey): ZoomCredentials | null {
  const prefix = `ZOOM_ACCOUNT_${key}`;
  const accountId = process.env[`${prefix}_ID`];
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  const userId = process.env[`${prefix}_USER_ID`];
  const label = process.env[`${prefix}_LABEL`] || `Zoom Account ${key}`;

  if (!accountId || !clientId || !clientSecret || !userId) return null;
  return { key, label, accountId, clientId, clientSecret, userId };
}

export function isAccountConfigured(key: ZoomAccountKey): boolean {
  return readCredentials(key) !== null;
}

export function getConfiguredAccountKeys(): ZoomAccountKey[] {
  return (['A', 'B'] as ZoomAccountKey[]).filter(isAccountConfigured);
}

export function getAccountLabel(key: ZoomAccountKey): string {
  return readCredentials(key)?.label || `Zoom Account ${key}`;
}

export function getMaskedAccountId(key: ZoomAccountKey): string | null {
  const creds = readCredentials(key);
  if (!creds) return null;
  if (creds.accountId.length <= 4) return '****';
  return `${creds.accountId.slice(0, 4)}${'*'.repeat(Math.max(0, creds.accountId.length - 4))}`;
}

export interface ZoomAccountAdminView {
  key: ZoomAccountKey;
  label: string;
  accountId: string;
  clientId: string;
  userId: string;
  hasClientSecret: boolean;
  configured: boolean;
}

// Everything an admin editing form needs, except the client secret itself -
// that's write-only from the UI's perspective, same as any other credential.
export function getAccountAdminView(key: ZoomAccountKey): ZoomAccountAdminView {
  const prefix = `ZOOM_ACCOUNT_${key}`;
  return {
    key,
    label: process.env[`${prefix}_LABEL`] || `Zoom Account ${key}`,
    accountId: process.env[`${prefix}_ID`] || '',
    clientId: process.env[`${prefix}_CLIENT_ID`] || '',
    userId: process.env[`${prefix}_USER_ID`] || '',
    hasClientSecret: Boolean(process.env[`${prefix}_CLIENT_SECRET`]),
    configured: isAccountConfigured(key)
  };
}

const tokenCache = new Map<ZoomAccountKey, { token: string; expiresAt: number }>();

async function getAccessToken(key: ZoomAccountKey): Promise<string> {
  const creds = readCredentials(key);
  if (!creds) throw new Error(`Zoom account ${key} is not configured`);

  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const res = await fetch(
    `${ZOOM_OAUTH_TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(creds.accountId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Zoom OAuth token request failed for account ${key}: ${res.status} ${body}`);
  }

  const data = await res.json();
  const token = data.access_token as string;
  const expiresInMs = (data.expires_in as number) * 1000;
  tokenCache.set(key, { token, expiresAt: Date.now() + expiresInMs });
  return token;
}

interface ZoomApiCallResult<T> {
  data: T;
  statusCode: number;
  responseTimeMs: number;
  endpoint: string;
  method: string;
}

async function zoomRequest<T = any>(
  key: ZoomAccountKey,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<ZoomApiCallResult<T>> {
  const token = await getAccessToken(key);
  const endpoint = `${ZOOM_API_BASE}${path}`;
  const startedAt = Date.now();

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const responseTimeMs = Date.now() - startedAt;

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Zoom API ${method} ${path} failed: ${res.status} ${errBody}`);
  }

  const data = res.status === 204 ? (undefined as unknown as T) : await res.json();
  return { data, statusCode: res.status, responseTimeMs, endpoint, method };
}

// Zoom's `audio` meeting setting values, mapped from the portal's own
// ZoomMeetingConfig.audioOption vocabulary.
const AUDIO_OPTION_MAP: Record<string, string> = {
  telephone: 'telephony',
  computer: 'voip',
  both: 'both',
  third_party: 'thirdParty'
};

export interface CreateMeetingInput {
  topic: string;
  startTimeIso: string;
  durationMinutes: number;
  timezone: string;
  agenda?: string;
  passcode?: string;
  waitingRoom?: boolean;
  autoRecording?: boolean;
  autoRecordTo?: 'local' | 'cloud';
  alternativeHosts?: string;
  hostVideo?: boolean;
  participantVideo?: boolean;
  audioOption?: 'telephone' | 'computer' | 'both' | 'third_party';
  muteOnEntry?: boolean;
  joinBeforeHost?: boolean;
  meetingAuthentication?: boolean;
  usePmi?: boolean;
}

export async function createZoomMeeting(key: ZoomAccountKey, input: CreateMeetingInput) {
  const creds = readCredentials(key);
  if (!creds) throw new Error(`Zoom account ${key} is not configured`);

  return zoomRequest(key, 'POST', `/users/${encodeURIComponent(creds.userId)}/meetings`, {
    topic: input.topic,
    type: input.usePmi ? 1 : 2, // 1 = instant meeting using PMI, 2 = scheduled with a generated ID
    start_time: input.startTimeIso,
    duration: input.durationMinutes,
    timezone: input.timezone,
    agenda: input.agenda,
    ...(input.passcode ? { password: input.passcode } : {}),
    settings: {
      host_video: input.hostVideo ?? true,
      participant_video: input.participantVideo ?? true,
      join_before_host: input.joinBeforeHost ?? false,
      waiting_room: input.waitingRoom ?? true,
      mute_upon_entry: input.muteOnEntry ?? true,
      audio: AUDIO_OPTION_MAP[input.audioOption || 'both'] || 'both',
      auto_recording: input.autoRecording ? (input.autoRecordTo || 'cloud') : 'none',
      alternative_hosts: input.alternativeHosts || '',
      meeting_authentication: input.meetingAuthentication ?? false,
      use_pmi: input.usePmi ?? false,
      encryption_type: 'enhanced_encryption'
    }
  });
}

export interface UpdateMeetingInput extends Partial<CreateMeetingInput> {}

export async function updateZoomMeeting(key: ZoomAccountKey, meetingId: string, input: UpdateMeetingInput) {
  const settings: Record<string, unknown> = {};
  if (input.waitingRoom !== undefined) settings.waiting_room = input.waitingRoom;
  if (input.autoRecording !== undefined) settings.auto_recording = input.autoRecording ? (input.autoRecordTo || 'cloud') : 'none';
  if (input.alternativeHosts !== undefined) settings.alternative_hosts = input.alternativeHosts;
  if (input.hostVideo !== undefined) settings.host_video = input.hostVideo;
  if (input.participantVideo !== undefined) settings.participant_video = input.participantVideo;
  if (input.audioOption !== undefined) settings.audio = AUDIO_OPTION_MAP[input.audioOption] || 'both';
  if (input.muteOnEntry !== undefined) settings.mute_upon_entry = input.muteOnEntry;
  if (input.joinBeforeHost !== undefined) settings.join_before_host = input.joinBeforeHost;
  if (input.meetingAuthentication !== undefined) settings.meeting_authentication = input.meetingAuthentication;
  if (input.usePmi !== undefined) settings.use_pmi = input.usePmi;

  return zoomRequest(key, 'PATCH', `/meetings/${encodeURIComponent(meetingId)}`, {
    ...(input.topic ? { topic: input.topic } : {}),
    ...(input.startTimeIso ? { start_time: input.startTimeIso } : {}),
    ...(input.durationMinutes ? { duration: input.durationMinutes } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    ...(input.agenda !== undefined ? { agenda: input.agenda } : {}),
    ...(input.passcode ? { password: input.passcode } : {}),
    ...(Object.keys(settings).length > 0 ? { settings } : {})
  });
}

export async function deleteZoomMeeting(key: ZoomAccountKey, meetingId: string) {
  return zoomRequest(key, 'DELETE', `/meetings/${encodeURIComponent(meetingId)}`);
}

export async function getZoomUserProfile(key: ZoomAccountKey) {
  const creds = readCredentials(key);
  if (!creds) throw new Error(`Zoom account ${key} is not configured`);
  return zoomRequest(key, 'GET', `/users/${encodeURIComponent(creds.userId)}`);
}

// Real host key lookup - the personal PIN set on this Zoom account's profile
// (Zoom web portal: Profile > Host Key). Any participant can use it during
// the meeting (Participants > Claim Host) to become host, regardless of
// license tier or which Zoom account they're signed into - unlike
// alternative host, which only works for Licensed users on the SAME Zoom
// account. Requires the Server-to-Server OAuth app's Client ID/Secret owner
// to have granted an admin-level user-read scope (see README) - Zoom
// treats the host key as sensitive and doesn't return it under the plain
// user:read:user scope already used elsewhere in this app.
//
// Confirmed live (with the admin scope correctly granted): host_key is
// still absent from schedule_meeting/feature/every other key in the
// default response body - Zoom withholds sensitive fields like this one
// unless explicitly requested via custom_query_fields, so it's asked for
// by its documented dotted path here.
export async function getZoomUserSettings(key: ZoomAccountKey) {
  const creds = readCredentials(key);
  if (!creds) throw new Error(`Zoom account ${key} is not configured`);
  return zoomRequest(
    key,
    'GET',
    `/users/${encodeURIComponent(creds.userId)}/settings?custom_query_fields=schedule_meeting.host_key`
  );
}

export interface MappedZoomDetails {
  meetingId: string;
  formattedMeetingId: string;
  passcode: string;
  joinUrl: string;
  startUrl: string;
  dialInNumbers: { country: string; city: string; number: string }[];
  sipAddress: string;
  h323Address: string;
  encryption: 'Enhanced (AES-256)' | 'End-to-End Encrypted';
  apiGenerated: true;
  zoomApiEndpoint: string;
}

export function mapZoomMeetingResponse(meeting: any): MappedZoomDetails {
  const rawId = String(meeting.id);
  const formatted = rawId.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  const dialInNumbers = (meeting.settings?.global_dial_in_numbers || []).map((d: any) => ({
    country: d.country_name || d.country,
    city: d.city || '',
    number: d.number
  }));

  return {
    meetingId: rawId.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3'),
    formattedMeetingId: formatted,
    passcode: meeting.password || '',
    joinUrl: meeting.join_url,
    startUrl: meeting.start_url,
    dialInNumbers,
    sipAddress: `${rawId}@zoomcrc.com`,
    h323Address: meeting.h323_password ? `162.255.37.11##${rawId}#${meeting.h323_password}` : '',
    encryption: meeting.settings?.encryption_type === 'e2ee' ? 'End-to-End Encrypted' : 'Enhanced (AES-256)',
    apiGenerated: true,
    zoomApiEndpoint: `${ZOOM_API_BASE}/meetings/${rawId}`
  };
}

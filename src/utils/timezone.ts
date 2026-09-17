import { TimezoneOption } from '../types';

export const COMMON_TIMEZONES: { id: string; label: string; region: string }[] = [
  { id: 'America/New_York', label: 'Eastern Time (US & Canada)', region: 'North America' },
  { id: 'America/Chicago', label: 'Central Time (US & Canada)', region: 'North America' },
  { id: 'America/Denver', label: 'Mountain Time (US & Canada)', region: 'North America' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', region: 'North America' },
  { id: 'America/Anchorage', label: 'Alaska Time', region: 'North America' },
  { id: 'Pacific/Honolulu', label: 'Hawaii Time', region: 'North America' },
  { id: 'America/Sao_Paulo', label: 'Brasilia Time (Sao Paulo)', region: 'South America' },
  { id: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'North America' },
  { id: 'America/Vancouver', label: 'Pacific Time (Vancouver)', region: 'North America' },
  { id: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Universal' },
  { id: 'Europe/London', label: 'London, Dublin, Edinburgh (GMT/BST)', region: 'Europe' },
  { id: 'Europe/Paris', label: 'Paris, Berlin, Rome, Madrid (CET)', region: 'Europe' },
  { id: 'Europe/Helsinki', label: 'Helsinki, Athens, Cairo (EET)', region: 'Europe' },
  { id: 'Europe/Moscow', label: 'Moscow Standard Time (MSK)', region: 'Europe' },
  { id: 'Asia/Dubai', label: 'Dubai, Abu Dhabi (GST)', region: 'Middle East' },
  { id: 'Asia/Kolkata', label: 'India Standard Time (IST)', region: 'Asia' },
  { id: 'Asia/Bangkok', label: 'Bangkok, Hanoi, Jakarta (ICT)', region: 'Asia' },
  { id: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur (SGT)', region: 'Asia' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong, Beijing (CST)', region: 'Asia' },
  { id: 'Asia/Tokyo', label: 'Tokyo, Seoul (JST/KST)', region: 'Asia' },
  { id: 'Australia/Sydney', label: 'Sydney, Melbourne (AEST/AEDT)', region: 'Australia/Pacific' },
  { id: 'Australia/Perth', label: 'Perth (AWST)', region: 'Australia/Pacific' },
  { id: 'Pacific/Auckland', label: 'Auckland, Wellington (NZST/NZDT)', region: 'Australia/Pacific' },
];

/**
 * Gets user's detected local timezone or default America/New_York
 */
export function getDetectedTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch (e) {
    // fallback
  }
  return 'America/New_York';
}

/**
 * Returns formatted time in a target timezone
 */
export function formatTimeInTimezone(
  date: Date | string | number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(d);
  } catch (err) {
    return new Intl.DateTimeFormat('en-US', options).format(d);
  }
}

/**
 * Formats full date in a target timezone (e.g. "Tuesday, August 25, 2026")
 */
export function formatDateInTimezone(
  date: Date | string | number,
  timeZone: string
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    }).format(d);
  } catch (err) {
    return d.toDateString();
  }
}

/**
 * Returns list of timezone options with their current offset and live sample time
 */
export function getTimezoneOptions(): TimezoneOption[] {
  const now = new Date();
  return COMMON_TIMEZONES.map((tz) => {
    let offsetStr = 'UTC';
    let sampleTime = '';
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz.id,
        timeZoneName: 'shortOffset',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).formatToParts(now);

      const tzNamePart = parts.find((p) => p.type === 'timeZoneName');
      if (tzNamePart) {
        offsetStr = tzNamePart.value;
      }
      sampleTime = new Intl.DateTimeFormat('en-US', {
        timeZone: tz.id,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now);
    } catch (e) {
      offsetStr = 'UTC';
      sampleTime = now.toLocaleTimeString();
    }

    return {
      id: tz.id,
      label: tz.label,
      offset: offsetStr,
      region: tz.region,
      sampleTime,
    };
  });
}

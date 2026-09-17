import { Booking } from '../types';

/**
 * Formats an ISO string into ICS UTC string: YYYYMMDDTHHmmssZ
 */
function toIcsFormat(isoString: string): string {
  const d = new Date(isoString);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generate iCalendar (.ics) content for Microsoft 365 / Outlook / Apple / Google
 */
export function generateIcsContent(booking: Booking): string {
  const start = toIcsFormat(booking.startTimeIso);
  const end = toIcsFormat(booking.endTimeIso);
  const now = toIcsFormat(new Date().toISOString());

  const description = [
    `Topic: ${booking.meetingTitle}`,
    `Host: ${booking.hostName} (${booking.hostEmail})`,
    `Participant: ${booking.participantName} (${booking.participantEmail})`,
    ``,
    `Join Zoom Meeting:`,
    `${booking.zoomDetails.joinUrl}`,
    ``,
    `Meeting ID: ${booking.zoomDetails.meetingId}`,
    `Passcode: ${booking.zoomDetails.passcode}`,
    ``,
    `Dial-in by location:`,
    booking.zoomDetails.dialInNumbers.map(d => `${d.city}: ${d.number}`).join('\\n'),
    ``,
    `Synced with Microsoft 365 Exchange Calendar.`
  ].join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zoom Video Communications//Zoom Booking Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:zoom-booking-${booking.id}@zoom.us`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Zoom Meeting: ${booking.meetingTitle} with ${booking.hostName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${booking.zoomDetails.joinUrl}`,
    `ORGANIZER;CN="${booking.hostName}":mailto:${booking.hostEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="${booking.participantName}":mailto:${booking.participantEmail}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Zoom Meeting Reminder (15 minutes prior)',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Download .ics file
 */
export function downloadIcsFile(booking: Booking) {
  const ics = generateIcsContent(booking);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `zoom-meeting-${booking.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate direct Microsoft 365 / Outlook Web Calendar URL
 */
export function getOutlookWebCalendarUrl(booking: Booking): string {
  const start = new Date(booking.startTimeIso).toISOString();
  const end = new Date(booking.endTimeIso).toISOString();
  const title = encodeURIComponent(`Zoom Meeting: ${booking.meetingTitle} - ${booking.hostName}`);
  const location = encodeURIComponent(booking.zoomDetails.joinUrl);
  const body = encodeURIComponent(
    `Zoom Meeting Link: ${booking.zoomDetails.joinUrl}\n\nMeeting ID: ${booking.zoomDetails.meetingId}\nPasscode: ${booking.zoomDetails.passcode}\n\nHost: ${booking.hostName}\nGuest: ${booking.participantName}`
  );

  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${body}&startdt=${start}&enddt=${end}&location=${location}`;
}

/**
 * Generate Microsoft 365 Office.com / Enterprise Outlook URL
 */
export function getM365EnterpriseCalendarUrl(booking: Booking): string {
  const start = new Date(booking.startTimeIso).toISOString();
  const end = new Date(booking.endTimeIso).toISOString();
  const title = encodeURIComponent(`Zoom Meeting: ${booking.meetingTitle}`);
  const location = encodeURIComponent(booking.zoomDetails.joinUrl);
  const body = encodeURIComponent(
    `Zoom Link: ${booking.zoomDetails.joinUrl}\nMeeting ID: ${booking.zoomDetails.meetingId}\nPasscode: ${booking.zoomDetails.passcode}`
  );

  return `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&body=${body}&startdt=${start}&enddt=${end}&location=${location}`;
}

/**
 * Generate Google Calendar URL for fallback convenience
 */
export function getGoogleCalendarUrl(booking: Booking): string {
  const start = toIcsFormat(booking.startTimeIso);
  const end = toIcsFormat(booking.endTimeIso);
  const title = encodeURIComponent(`Zoom Meeting: ${booking.meetingTitle}`);
  const location = encodeURIComponent(booking.zoomDetails.joinUrl);
  const details = encodeURIComponent(
    `Zoom Link: ${booking.zoomDetails.joinUrl}\nMeeting ID: ${booking.zoomDetails.meetingId}\nPasscode: ${booking.zoomDetails.passcode}\nHost: ${booking.hostName}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

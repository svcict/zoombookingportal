import { Booking, ZoomMeetingConfig } from '../types';

/**
 * Saves the Edit window's changes to a booking. Resolves with the server's
 * saved copy and its message (which says if, say, the Outlook event or the
 * Host Key email didn't go through); throws an Error with a readable message
 * on any failure, so the Edit window can stay open and show it instead of a
 * success notice for a save that never happened.
 */
export async function saveBookingEdit(
  bookingId: string,
  zoomConfig: ZoomMeetingConfig,
  sendHostKey: boolean,
  authHeaders: Record<string, string>
): Promise<{ booking: Booking; message: string }> {
  let res: Response;
  try {
    res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ zoomConfig, guestEmails: zoomConfig.invitees, sendHostKey }),
    });
  } catch {
    throw new Error("We couldn't reach the server. Check your connection");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.data) {
    if (res.status === 401) throw new Error('Your sign-in has expired. Sign in again, then retry');
    throw new Error(data?.error || data?.message || `The server rejected the change (${res.status})`);
  }
  return { booking: data.data as Booking, message: data.message || 'Meeting updated.' };
}

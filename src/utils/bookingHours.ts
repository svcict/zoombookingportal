// The single source of truth for when meetings can be booked, shared by the
// server's availability check, the date-time picker (which greys out
// anything outside it) and the dashboard's calendar grid and "Hours" label.
// All times are wall-clock times in the booker's selected timezone.

export const BOOKING_START_HOUR = 8; // 8:00 AM
export const BOOKING_END_HOUR = 20; // 8:00 PM - a meeting must start before this
export const BOOKING_HOURS_LABEL = '8:00 AM – 8:00 PM';

/** Weekends (Saturday, Sunday) are not bookable. dateStr is YYYY-MM-DD. */
export function isWeekendDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Whether a meeting may start at this wall-clock time: a weekday, from
 * 8:00 AM up to (not including) 8:00 PM, and not exactly 12:00 noon (the
 * lunch / administrative buffer).
 */
export function isBookableStart(dateStr: string, minutesOfDay: number): boolean {
  if (isWeekendDate(dateStr)) return false;
  if (minutesOfDay < BOOKING_START_HOUR * 60 || minutesOfDay >= BOOKING_END_HOUR * 60) return false;
  if (minutesOfDay === 12 * 60) return false;
  return true;
}

/** Whether a meeting may end at this wall-clock time: a weekday, after 8:00 AM, by 8:00 PM. */
export function isBookableEnd(dateStr: string, minutesOfDay: number): boolean {
  if (isWeekendDate(dateStr)) return false;
  return minutesOfDay > BOOKING_START_HOUR * 60 && minutesOfDay <= BOOKING_END_HOUR * 60;
}

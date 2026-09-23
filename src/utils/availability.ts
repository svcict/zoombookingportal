import { TimeSlot, HostAccount, Booking, MeetingType } from '../types';
import { INITIAL_HOST_ACCOUNTS } from '../data/initialData';
import { zonedTimeToUtc, getDetectedTimezone } from './timezone';

export function generateLocalAvailabilitySlots(params: {
  meetingType: MeetingType;
  date: string;
  selectedAccountId?: string;
  bookings?: Booking[];
  timezone?: string;
}): { slots: TimeSlot[]; hostAccountsSummary: HostAccount[] } {
  const {
    meetingType,
    date,
    selectedAccountId = 'all',
    bookings = [],
    timezone = getDetectedTimezone()
  } = params;

  const duration = meetingType.duration || 30;
  const parsedDate = new Date(`${date}T12:00:00`);
  const dayOfWeek = parsedDate.getDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Each meeting type has one fixed host - only checking that host (instead
  // of every demo host account) is what makes a booked slot actually show
  // as blocked for that meeting type. An explicit selectedAccountId still
  // wins, for the (currently unused) multi-host picker.
  const meetingTypeHost = meetingType.hostAccountId
    ? INITIAL_HOST_ACCOUNTS.find((a) => a.id === meetingType.hostAccountId)
    : undefined;

  const targetAccounts = selectedAccountId && selectedAccountId !== 'all'
    ? INITIAL_HOST_ACCOUNTS.filter((a) => a.id === selectedAccountId)
    : meetingTypeHost
    ? [meetingTypeHost]
    : INITIAL_HOST_ACCOUNTS;

  const slots: TimeSlot[] = [];
  const startHour = 8;
  const endHour = 20;
  const stepMinutes = duration <= 15 ? 15 : duration <= 30 ? 30 : duration <= 45 ? 45 : 60;

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
      const slotIso = zonedTimeToUtc(date, h, m, timezone).toISOString();
      const isPast = new Date(slotIso).getTime() <= Date.now();

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

      const availableForSlot: HostAccount[] = [];
      const unavailableForSlot: Array<{ account: HostAccount; reason: string }> = [];

      targetAccounts.forEach((acc) => {
        if (isPast) {
          unavailableForSlot.push({ account: acc, reason: 'This time has already passed' });
          return;
        }

        // Check Zoom Bookings
        const existingBooking = bookings.find(
          (b) =>
            b.date === date &&
            b.timeSlot === formattedTime &&
            b.status !== 'cancelled' &&
            (b.hostAccountId === acc.id || b.hostEmail === acc.email)
        );

        // Standard lunch buffer
        const isLunchBuffer = h === 12 && m === 0;

        if (existingBooking) {
          unavailableForSlot.push({ account: acc, reason: `Booked: ${existingBooking.meetingTitle}` });
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
        isAvailable: isSlotOpen,
        reason: isSlotOpen
          ? undefined
          : unavailableForSlot.length > 0
          ? unavailableForSlot[0].reason
          : 'Unavailable',
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

  return { slots, hostAccountsSummary };
}

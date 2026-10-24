import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Globe, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { zonedTimeToUtc, getNowInTimezone, getWallTimeInTimezone } from '../utils/timezone';
import { isBookableStart, isBookableEnd, isWeekendDate, BOOKING_END_HOUR, BOOKING_HOURS_LABEL } from '../utils/bookingHours';
import { TimeSlot } from '../types';

interface SimpleDateTimePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  formattedDate: string;
  selectedTimezone: string;
  onChangeTimezone: () => void;
  meetingTypeId?: string;
  onDurationChange: (minutes: number) => void;
  onSelectTime: (slot: TimeSlot) => void;
  // The slot applied before (e.g. coming Back from the intake form, which
  // remounts this picker) - restored instead of a fresh suggestion.
  appliedSlot?: TimeSlot | null;
  appliedDurationMinutes?: number;
  // Focus the date-time field on mount (coming Back from the intake form).
  autoFocusField?: boolean;
}

type AvailabilityState =
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'blocked'; reason?: string }
  | { status: 'unknown' };

type Ampm = 'AM' | 'PM';
type Step = 'start' | 'end';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const HOURS = [12, ...Array.from({ length: 11 }, (_, i) => i + 1)]; // 12, 1, 2, ... 11 - clock order
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, ... 55
const AMPMS: Ampm[] = ['AM', 'PM'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const to24Hour = (hour12: number, ampm: Ampm) => (ampm === 'AM' ? hour12 % 12 : (hour12 % 12) + 12);

const formatTimeLabel = (hour12: number, minute: number, ampm: Ampm) =>
  `${hour12}:${pad2(minute)} ${ampm}`;

// A wall-clock moment in the selected timezone: a date plus minutes since
// midnight. Every "is this in the past / before the start" check below is a
// plain comparison of these, so the columns can gray out options cheaply.
type WallTime = { date: string; minutes: number };

const compareWall = (a: WallTime, b: WallTime) =>
  a.date === b.date ? a.minutes - b.minutes : a.date < b.date ? -1 : 1;

const addMinutes = (t: WallTime, delta: number): WallTime => {
  const [y, m, d] = t.date.split('-').map(Number);
  const total = t.minutes + delta;
  const dayShift = Math.floor(total / 1440);
  const day = new Date(Date.UTC(y, m - 1, d + dayShift));
  return {
    date: toDateStr(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
    minutes: total - dayShift * 1440,
  };
};

const splitWall = (t: WallTime) => {
  const h24 = Math.floor(t.minutes / 60);
  return {
    hour12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: t.minutes % 60,
    ampm: (h24 < 12 ? 'AM' : 'PM') as Ampm,
  };
};

const DEFAULT_DURATION = 30;

// First start time at or after `from`, on a 30-minute boundary, that is
// bookable (a weekday within booking hours) and not before `earliest`.
// Used for the auto-suggestion and when a pick has nothing valid nearby.
const nextBookableStart = (from: WallTime, earliest: WallTime): WallTime => {
  const base = compareWall(from, earliest) < 0 ? earliest : from;
  let t: WallTime = { date: base.date, minutes: Math.ceil(base.minutes / 30) * 30 };
  if (t.minutes >= 1440) t = addMinutes({ date: t.date, minutes: 0 }, t.minutes);
  for (let i = 0; i < 14 * 48; i++) {
    if (isBookableStart(t.date, t.minutes) && compareWall(t, earliest) >= 0) return t;
    t = addMinutes(t, 30);
  }
  return base;
};

// The allowed time on the same date closest to `t` (preferring later), in
// 5-minute steps, or null if that whole date has nothing allowed.
const nearestAllowedOnDate = (t: WallTime, allowed: (w: WallTime) => boolean): WallTime | null => {
  for (let offset = 0; offset < 1440; offset += 5) {
    for (const minutes of [t.minutes + offset, t.minutes - offset]) {
      if (minutes < 0 || minutes >= 1440) continue;
      const candidate = { date: t.date, minutes };
      if (allowed(candidate)) return candidate;
    }
  }
  return null;
};

// Allowed time nearest to `t` within the same hour (only the minute moves) -
// used when the booker just picked that hour.
const nearestInSameHour = (t: WallTime, allowed: (w: WallTime) => boolean): WallTime | null => {
  const hour = Math.floor(t.minutes / 60);
  for (let offset = 0; offset < 60; offset += 5) {
    for (const minutes of [t.minutes + offset, t.minutes - offset]) {
      if (Math.floor(minutes / 60) !== hour) continue;
      const candidate = { date: t.date, minutes };
      if (allowed(candidate)) return candidate;
    }
  }
  return null;
};

// Allowed time nearest to `t` with the same minute (only the hour moves) -
// used when the booker switched AM/PM and their minute should survive.
const nearestKeepingMinute = (t: WallTime, allowed: (w: WallTime) => boolean): WallTime | null => {
  for (let offset = 0; offset < 1440; offset += 60) {
    for (const minutes of [t.minutes - offset, t.minutes + offset]) {
      if (minutes < 0 || minutes >= 1440) continue;
      const candidate = { date: t.date, minutes };
      if (allowed(candidate)) return candidate;
    }
  }
  return null;
};

// What the booker most wants kept when their pick has to move: the hour
// they just clicked, or the minute when they switched AM/PM.
type Keep = 'hour' | 'minute' | undefined;

const wallLabel = (t: WallTime) => {
  const { hour12, minute, ampm } = splitWall(t);
  return formatTimeLabel(hour12, minute, ampm);
};

const formatDateLabel = (dateStr: string) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Date-range picker matching the "Date Range Picker" design: a floating
// calendar + hour/minute/AM-PM scroll-column popover, driven through two
// steps (Start, then Next -> End) instead of the design's own click-twice-
// on-one-calendar range select, per instruction. Still backed by the same
// real availability check (/api/availability/check) so the user still sees
// whether the exact range they picked is actually free before applying.
export const SimpleDateTimePicker: React.FC<SimpleDateTimePickerProps> = ({
  selectedDate,
  onSelectDate,
  formattedDate,
  selectedTimezone,
  onChangeTimezone,
  meetingTypeId,
  onDurationChange,
  onSelectTime,
  appliedSlot,
  appliedDurationMinutes,
  autoFocusField = false,
}) => {
  // "Now" in the selected timezone, refreshed every 30s so options gray out
  // as time passes while the picker sits open.
  const [now, setNow] = useState(() => getNowInTimezone(selectedTimezone));
  useEffect(() => {
    setNow(getNowInTimezone(selectedTimezone));
    const id = setInterval(() => setNow(getNowInTimezone(selectedTimezone)), 30000);
    return () => clearInterval(id);
  }, [selectedTimezone]);

  // Earliest possible start: the next 5-minute mark strictly after now.
  const earliestStart = addMinutes({ date: now.dateStr, minutes: 0 }, Math.floor(now.minutes / 5) * 5 + 5);
  // A start is allowed when it's not in the past and within booking hours
  // (weekdays, 8 AM to 8 PM, not the 12:00 lunch buffer - bookingHours.ts).
  const isStartAllowed = (t: WallTime) => compareWall(t, earliestStart) >= 0 && isBookableStart(t.date, t.minutes);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('start');
  const [applied, setApplied] = useState(false);

  // Restore a previously applied slot; otherwise auto-suggest the next
  // bookable half-hour from now (rolling past the evening, weekends and the
  // lunch buffer), or 9:00 AM when a later day was already picked.
  const [start, setStartRaw] = useState<WallTime>(() => {
    if (appliedSlot?.isoString) {
      const wall = getWallTimeInTimezone(new Date(appliedSlot.isoString), selectedTimezone);
      return { date: wall.dateStr, minutes: wall.minutes };
    }
    const nowWall = getNowInTimezone(selectedTimezone);
    const earliest = addMinutes({ date: nowWall.dateStr, minutes: 0 }, Math.floor(nowWall.minutes / 5) * 5 + 5);
    const from = selectedDate && selectedDate > nowWall.dateStr ? { date: selectedDate, minutes: 9 * 60 } : earliest;
    return nextBookableStart(from, earliest);
  });
  const [end, setEndRaw] = useState<WallTime>(() => {
    const wanted = addMinutes(start, appliedSlot && appliedDurationMinutes && appliedDurationMinutes > 0 ? appliedDurationMinutes : DEFAULT_DURATION);
    // Keep the suggested end within booking hours too (e.g. 7:45 PM + 30 min).
    return isBookableEnd(wanted.date, wanted.minutes) ? wanted : { date: start.date, minutes: BOOKING_END_HOUR * 60 };
  });

  const startDate = start.date;
  const endDate = end.date;
  const { hour12: startHour, minute: startMinute, ampm: startAmpm } = splitWall(start);
  const { hour12: endHour, minute: endMinute, ampm: endAmpm } = splitWall(end);
  const [viewYear, setViewYear] = useState(Number(start.date.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(Number(start.date.slice(5, 7)) - 1);

  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'unknown' });
  const requestIdRef = useRef(0);

  // Show the month of whichever end is about to be edited.
  const showMonthOf = (dateStr: string) => {
    setViewYear(Number(dateStr.slice(0, 4)));
    setViewMonth(Number(dateStr.slice(5, 7)) - 1);
  };

  // Moving the start never lands on a time that can't be booked: it snaps
  // to the nearest allowed time that day (or the next bookable slot), and
  // carries the end along so the meeting length is kept, within booking hours.
  // Why a picked time couldn't be used as-is, for the adjustment note.
  const whyNotBookable = (t: WallTime, isEnd: boolean) => {
    if (isWeekendDate(t.date)) return 'weekends can\'t be booked';
    if (isEnd) return compareWall(t, minEnd) < 0 ? 'the end must be after the start' : `meetings must end by ${wallLabel({ date: t.date, minutes: BOOKING_END_HOUR * 60 })}`;
    if (compareWall(t, earliestStart) < 0) return 'that time has already passed';
    if (t.minutes === 12 * 60) return '12:00 noon is reserved';
    return `it's outside booking hours (${BOOKING_HOURS_LABEL})`;
  };
  // Shown in the status line whenever a pick had to be moved, so nothing
  // changes silently.
  const [adjustNote, setAdjustNote] = useState<string | null>(null);

  const setStart = (next: WallTime, keep?: Keep) => {
    const length = durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION;
    // When the pick itself isn't allowed, prefer a nearby start that keeps
    // what the booker just chose (the hour, or the minute) and still fits
    // the whole meeting before 8 PM.
    const fitsWholeMeeting = (t: WallTime) => {
      const e = addMinutes(t, length);
      return isStartAllowed(t) && isBookableEnd(e.date, e.minutes);
    };
    const preferred = (allowed: (w: WallTime) => boolean) =>
      keep === 'hour' ? nearestInSameHour(next, allowed) : keep === 'minute' ? nearestKeepingMinute(next, allowed) : null;
    const snapped = isStartAllowed(next)
      ? next
      : preferred(fitsWholeMeeting) ?? preferred(isStartAllowed) ??
        nearestAllowedOnDate(next, fitsWholeMeeting) ?? nearestAllowedOnDate(next, isStartAllowed) ?? nextBookableStart(next, earliestStart);
    const wantedEnd = addMinutes(snapped, length);
    const endFits = isBookableEnd(wantedEnd.date, wantedEnd.minutes);
    const newEnd = endFits ? wantedEnd : { date: snapped.date, minutes: BOOKING_END_HOUR * 60 };
    setApplied(false);
    setStartRaw(snapped);
    setEndRaw(newEnd);
    if (compareWall(snapped, next) !== 0) {
      setAdjustNote(`Start moved to ${snapped.date !== next.date ? `${formatDateLabel(snapped.date)} ` : ''}${wallLabel(snapped)}: ${wallLabel(next)} can't be booked because ${whyNotBookable(next, false)}.`);
    } else if (!endFits) {
      setAdjustNote(`End moved to ${wallLabel(newEnd)}, the latest a meeting can run.`);
    } else {
      setAdjustNote(null);
    }
  };
  // The end can't be at or before the start, or outside booking hours.
  const minEnd = addMinutes(start, 5);
  const isEndAllowed = (t: WallTime) => compareWall(t, minEnd) >= 0 && isBookableEnd(t.date, t.minutes);
  const setEnd = (next: WallTime, keep?: Keep) => {
    const preferred =
      keep === 'hour' ? nearestInSameHour(next, isEndAllowed) : keep === 'minute' ? nearestKeepingMinute(next, isEndAllowed) : null;
    const snapped = isEndAllowed(next) ? next : preferred ?? nearestAllowedOnDate(next, isEndAllowed) ?? minEnd;
    setApplied(false);
    setEndRaw(snapped);
    setAdjustNote(
      compareWall(snapped, next) !== 0
        ? `End moved to ${wallLabel(snapped)}: ${wallLabel(next)} can't be used because ${whyNotBookable(next, true)}.`
        : null
    );
  };

  // If the clock (or a timezone change) overtakes the chosen start, move it
  // up to the next bookable time rather than leaving a stale one selected.
  useEffect(() => {
    if (!isStartAllowed(start)) setStart(start);
  }, [earliestStart.date, earliestStart.minutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const startIso = zonedTimeToUtc(startDate, to24Hour(startHour, startAmpm), startMinute, selectedTimezone).toISOString();
  const endIso = zonedTimeToUtc(endDate, to24Hour(endHour, endAmpm), endMinute, selectedTimezone).toISOString();
  const isPast = new Date(startIso).getTime() <= Date.now();
  const durationMinutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  const isValidRange = durationMinutes > 0;

  // Tell the parent when the start day changes. Skipped when it already has
  // this day (e.g. remounting after Back), since the parent's handler also
  // clears the applied slot.
  const reportedDateRef = useRef(selectedDate);
  useEffect(() => {
    if (startDate === reportedDateRef.current) return;
    reportedDateRef.current = startDate;
    onSelectDate(startDate);
  }, [startDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isValidRange) onDurationChange(durationMinutes);
  }, [durationMinutes, isValidRange, onDurationChange]);

  useEffect(() => {
    if (isPast || !isValidRange) {
      setAvailability({ status: 'unknown' });
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setAvailability({ status: 'checking' });

    const time = `${pad2(to24Hour(startHour, startAmpm))}:${pad2(startMinute)}`;
    const params = new URLSearchParams({ date: startDate, time, timezone: selectedTimezone });
    if (meetingTypeId) params.set('meetingTypeId', meetingTypeId);
    params.set('duration', String(durationMinutes));

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/availability/check?${params.toString()}`);
        const data = await res.json();
        if (thisRequestId !== requestIdRef.current) return; // a newer check superseded this one
        if (data.success) {
          setAvailability(
            data.isAvailable ? { status: 'available' } : { status: 'blocked', reason: data.reason }
          );
        } else {
          setAvailability({ status: 'unknown' });
        }
      } catch {
        if (thisRequestId === requestIdRef.current) setAvailability({ status: 'unknown' });
      }
    }, 300); // debounce rapid picks

    return () => clearTimeout(timeout);
  }, [startDate, startHour, startMinute, startAmpm, durationMinutes, isValidRange, isPast, selectedTimezone, meetingTypeId]);

  // Also hold Apply/Next while the free-slot check is still in flight, so a
  // clashing time can't slip through during the debounce + round trip. A
  // failed check ('unknown') stays bookable - the server re-checks on submit.
  const isBlocked = isPast || !isValidRange || availability.status === 'blocked' || availability.status === 'checking';

  const pickStartDay = (d: string) => setStart({ date: d, minutes: start.minutes });
  const pickEndDay = (d: string) => setEnd({ date: d, minutes: end.minutes });

  const handleNext = () => {
    setStep('end');
    showMonthOf(endDate);
  };
  const handleBack = () => {
    setStep('start');
    showMonthOf(startDate);
  };
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Closing (Cancel, Esc, Apply) hands keyboard focus back to the field.
  const closePicker = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };
  const handleCancel = closePicker;

  useEffect(() => {
    if (autoFocusField) triggerRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening the panel, or switching between Start and End, puts keyboard
  // focus on the selected day, so arrow keys work straight away.
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusActiveDay = () =>
    requestAnimationFrame(() => calendarRef.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus());
  useEffect(() => {
    if (isOpen) focusActiveDay();
  }, [isOpen, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrow keys move the selected day (left/right one day, up/down one week),
  // skipping days that can't be picked and following into the next month.
  const handleCalendarKeyDown = (e: React.KeyboardEvent) => {
    const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (!delta) return;
    e.preventDefault();
    const [y, m, d] = activeDateStr.split('-').map(Number);
    for (let i = 1; i <= 60; i++) {
      const candidate = new Date(Date.UTC(y, m - 1, d + delta * i));
      const dateStr = toDateStr(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate());
      if (dayDisabledFn(dateStr)) continue;
      showMonthOf(dateStr);
      onPickDay(dateStr);
      focusActiveDay();
      return;
    }
  };
  // Esc closes the open picker wherever keyboard focus is (usually still on
  // the field that opened it).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    if (isBlocked) return;
    onSelectTime({
      id: `custom-${startDate}-${startHour}${startAmpm}${startMinute}-${endDate}-${endHour}${endAmpm}${endMinute}`,
      time: `${pad2(to24Hour(startHour, startAmpm))}:${pad2(startMinute)}`,
      formattedTime: formatTimeLabel(startHour, startMinute, startAmpm),
      isoString: startIso,
      isAvailable: availability.status !== 'blocked',
    });
    setApplied(true);
    closePicker();
  };

  const durationLabel = (() => {
    if (!isValidRange) return 'Select a valid time range';
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return `${parts.join(' ')} meeting`;
  })();

  const summary = `${formatDateLabel(startDate)} ${formatTimeLabel(startHour, startMinute, startAmpm)} – ${formatDateLabel(endDate)} ${formatTimeLabel(endHour, endMinute, endAmpm)}`;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const activeDateStr = step === 'start' ? startDate : endDate;
  const onPickDay = step === 'start' ? pickStartDay : pickEndDay;

  // Whatever end is being edited, and which times it may take - everything
  // else (past, before the start, evenings, weekends) is grayed out in the
  // calendar and time columns rather than rejected after the fact.
  const active = step === 'start' ? start : end;
  const isAllowed = step === 'start' ? isStartAllowed : isEndAllowed;
  const setActive = step === 'start' ? setStart : setEnd;
  const { hour12: activeHour, minute: activeMinute, ampm: activeAmpm } = splitWall(active);
  const at = (minutes: number): WallTime => ({ date: active.date, minutes });
  const minuteDisabled = (m: number) => !isAllowed(at(to24Hour(activeHour, activeAmpm) * 60 + m));
  const hourDisabled = (h12: number) => !MINUTES.some((m) => isAllowed(at(to24Hour(h12, activeAmpm) * 60 + m)));
  const ampmDisabled = (ap: Ampm) => !HOURS.some((h12) => MINUTES.some((m) => isAllowed(at(to24Hour(h12, ap) * 60 + m))));
  const dayDisabledFn = (dateStr: string) => {
    if (step === 'end') return dateStr < start.date || isWeekendDate(dateStr);
    if (dateStr < earliestStart.date || isWeekendDate(dateStr)) return true;
    // e.g. today after the last bookable start has passed
    return dateStr === earliestStart.date && nearestAllowedOnDate({ date: dateStr, minutes: 0 }, isStartAllowed) === null;
  };
  const viewDates = Array.from({ length: daysInMonth }, (_, k) => toDateStr(viewYear, viewMonth, k + 1));
  const activeInView = viewDates.includes(activeDateStr);
  const firstEnabledInView = viewDates.find((d) => !dayDisabledFn(d));

  const availabilityReadout = (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
      {adjustNote && (
        <span className="flex items-start gap-1.5 max-w-sm text-xs text-amber-800 text-center">
          <Info className="w-3.5 h-3.5 mt-px shrink-0" />
          <span>{adjustNote}</span>
        </span>
      )}
      <span className="text-xs text-gray-500 font-medium">{durationLabel}</span>
      {!isValidRange ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold text-center">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          End must be after start
        </span>
      ) : isPast ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold text-center">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          This time has already passed
        </span>
      ) : availability.status === 'checking' ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Checking availability&hellip;
        </span>
      ) : availability.status === 'available' ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          This time is available
        </span>
      ) : availability.status === 'blocked' ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold text-center">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {availability.reason || 'Blocked'}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col h-full p-5 sm:p-6 bg-white">
      <div className="pb-4 border-b border-gray-100 mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-blue-100 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4.5 h-4.5 text-[#0433FF]" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg tracking-tight">Pick time and date</div>
            <p className="text-sm text-gray-500 mt-0.5">{formattedDate}</p>
          </div>
        </div>

        {/* Timezone pill button */}
        <button
          type="button"
          onClick={onChangeTimezone}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Globe className="w-3.5 h-3.5 text-[#0433FF]" />
          <span className="font-mono text-[11px] truncate max-w-[180px]">
            {selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}
          </span>
          <span className="text-[10px] text-[#0433FF] font-bold underline">Change</span>
        </button>
      </div>

      <div className="flex items-baseline justify-between gap-3 mb-2 max-w-[480px]">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Date &amp; Time Range
        </label>
        <span className="text-xs text-gray-500">Weekdays, {BOOKING_HOURS_LABEL}</span>
      </div>

      <div className="relative w-full max-w-[480px]">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`Meeting date and time: ${summary}. Change`}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white border-2 border-[#0433FF] rounded-lg text-left cursor-pointer"
        >
          <span className="text-[15px] text-gray-900 truncate">{summary}</span>
          <CalendarIcon className="w-[18px] h-[18px] text-gray-500 shrink-0" />
        </button>

        {isOpen && (
          <div
            role="dialog"
            aria-label={step === 'start' ? 'Choose the start date and time' : 'Choose the end date and time'}
            className="mt-2 bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden"
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 px-5 pt-4">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${step === 'start' ? 'text-[#0433FF]' : 'text-gray-500'}`}>
                1. Start
              </span>
              <span className="text-gray-500">→</span>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${step === 'end' ? 'text-[#0433FF]' : 'text-gray-500'}`}>
                2. End
              </span>
            </div>

            <div className="flex flex-col sm:flex-row">
              {/* Calendar */}
              <div className="w-[260px] shrink-0 p-4 pt-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-bold text-gray-900">{MONTH_NAMES[viewMonth]} {viewYear}</div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMonth((m) => { if (m === 0) { setViewYear((y) => y - 1); return 11; } return m - 1; })}
                      className="p-1 text-gray-500 hover:text-gray-900 cursor-pointer"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMonth((m) => { if (m === 11) { setViewYear((y) => y + 1); return 0; } return m + 1; })}
                      className="p-1 text-gray-500 hover:text-gray-900 cursor-pointer"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((wd, i) => (
                    <div key={i} className="text-center text-xs text-gray-500 py-1.5">{wd}</div>
                  ))}
                </div>

                <div ref={calendarRef} className="grid grid-cols-7 gap-0.5" onKeyDown={handleCalendarKeyDown}>
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    // (one Tab stop for the whole grid: the selected day, or
                    // the first pickable day when it's in another month)
                    const day = i + 1;
                    const dateStr = toDateStr(viewYear, viewMonth, day);
                    const isStart = dateStr === startDate;
                    const isEnd = dateStr === endDate;
                    const isEdge = isStart || isEnd;
                    const isInRange = startDate < dateStr && dateStr < endDate;
                    const isActive = dateStr === activeDateStr;
                    const isDisabled = dayDisabledFn(dateStr);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onPickDay(dateStr)}
                        disabled={isDisabled}
                        aria-label={formatDateLabel(dateStr)}
                        aria-pressed={isActive}
                        tabIndex={isActive || (!activeInView && !isDisabled && dateStr === firstEnabledInView) ? 0 : -1}
                        className={`aspect-square text-sm rounded ${
                          isDisabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : isEdge
                            ? `rounded-full font-bold text-white cursor-pointer ${isActive ? 'bg-[#0433FF]' : 'bg-[#0433FF]/60'}`
                            : isInRange
                              ? 'bg-blue-100 text-gray-800 cursor-pointer'
                              : 'text-gray-800 hover:bg-gray-100 cursor-pointer'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hour / Minute / AM-PM columns for whichever end is active */}
              <div className="flex items-start py-3 px-1 border-t sm:border-t-0 sm:border-l border-gray-100">
                <ScrollColumn
                  label="Hour"
                  values={HOURS}
                  active={activeHour}
                  format={(v) => pad2(v)}
                  isDisabled={hourDisabled}
                  onSelect={(h) => setActive(at(to24Hour(h, activeAmpm) * 60 + activeMinute), 'hour')}
                />
                <ScrollColumn
                  label="Minute"
                  values={MINUTES}
                  active={activeMinute}
                  format={(v) => pad2(v)}
                  isDisabled={minuteDisabled}
                  onSelect={(m) => setActive(at(to24Hour(activeHour, activeAmpm) * 60 + m), 'hour')}
                />
                <ScrollColumn
                  label="AM/PM"
                  values={AMPMS}
                  active={activeAmpm}
                  format={(v) => v}
                  isDisabled={ampmDisabled}
                  onSelect={(ap) => setActive(at(to24Hour(activeHour, ap) * 60 + activeMinute), 'minute')}
                />
              </div>
            </div>

            <div className="px-5 pb-1">{availabilityReadout}</div>

            <div className="flex items-center justify-end gap-5 px-5 py-3.5 border-t border-gray-100">
              {step === 'start' ? (
                <>
                  <button type="button" onClick={handleCancel} className="text-[13px] font-bold tracking-wide text-[#0433FF] cursor-pointer">
                    CANCEL
                  </button>
                  <button type="button" onClick={handleNext} className="text-[13px] font-bold tracking-wide text-[#0433FF] cursor-pointer">
                    NEXT
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={handleBack} className="text-[13px] font-bold tracking-wide text-[#0433FF] cursor-pointer">
                    BACK
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isBlocked}
                    className={`text-[13px] font-bold tracking-wide cursor-pointer ${isBlocked ? 'text-gray-300 cursor-not-allowed' : 'text-[#0433FF]'}`}
                  >
                    {applied ? 'APPLIED ✓' : 'APPLY'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Once collapsed, still need a way forward - reopening the popover
          again shouldn't be the only path to continue past this step */}
      {!isOpen && (
        <div className="mt-4 w-full max-w-[480px] space-y-3">
          {availabilityReadout}
          <button
            type="button"
            onClick={handleApply}
            disabled={isBlocked}
            className={`w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-colors ${
              isBlocked ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#0433FF] hover:bg-[#0320AF] cursor-pointer'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

function ScrollColumn<T extends string | number>({
  label,
  values,
  active,
  format,
  onSelect,
  isDisabled,
}: {
  label: string;
  values: T[];
  active: T;
  format: (v: T) => string;
  onSelect: (v: T) => void;
  isDisabled?: (v: T) => boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // One Tab stop per column (the selected value); Up/Down arrows move to the
  // previous/next pickable value. Focus follows whatever value ends up
  // selected, since the picker may adjust it.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const from = values.indexOf(active);
    for (let i = from + dir; i >= 0 && i < values.length; i += dir) {
      if (isDisabled?.(values[i])) continue;
      onSelect(values[i]);
      requestAnimationFrame(() => containerRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.focus());
      return;
    }
  };

  // Keep the selected value centred in view - on open and whenever it
  // changes (including when the picker snaps it forward past a gray slot).
  useEffect(() => {
    const container = containerRef.current;
    const button = container?.querySelector<HTMLElement>('[data-active="true"]');
    if (!container || !button) return;
    container.scrollTo({
      top: button.offsetTop - container.clientHeight / 2 + button.clientHeight / 2,
      behavior: hasScrolledRef.current ? 'smooth' : 'auto',
    });
    hasScrolledRef.current = true;
  }, [active]);

  return (
    <div className="w-16">
    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center pb-1.5" aria-hidden="true">
      {label === 'Minute' ? 'Min' : label}
    </div>
    <div ref={containerRef} role="group" aria-label={label} onKeyDown={handleKeyDown} className="relative max-h-[232px] overflow-y-auto no-scrollbar px-1 space-y-0.5">
      {values.map((v) => {
        const disabled = isDisabled?.(v) ?? false;
        const selected = v === active;
        return (
          <button
            key={String(v)}
            type="button"
            data-active={selected}
            onClick={() => onSelect(v)}
            disabled={disabled}
            aria-pressed={selected}
            tabIndex={selected ? 0 : -1}
            aria-label={`${label === 'AM/PM' ? '' : `${label} `}${format(v)}`}
            className={`w-full h-9 text-center text-sm rounded-md transition-colors ${
              selected
                ? 'bg-[#0433FF] text-white font-bold cursor-pointer'
                : disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-800 hover:bg-gray-100 font-normal cursor-pointer'
            }`}
          >
            {format(v)}
          </button>
        );
      })}
    </div>
    </div>
  );
}

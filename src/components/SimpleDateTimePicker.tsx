import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Globe, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { zonedTimeToUtc, getNowInTimezone } from '../utils/timezone';
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
}) => {
  // "Now" in the selected timezone, refreshed every 30s so options gray out
  // as time passes while the picker sits open.
  const [now, setNow] = useState(() => getNowInTimezone(selectedTimezone));
  useEffect(() => {
    setNow(getNowInTimezone(selectedTimezone));
    const id = setInterval(() => setNow(getNowInTimezone(selectedTimezone)), 30000);
    return () => clearInterval(id);
  }, [selectedTimezone]);

  // Earliest bookable start: the next 5-minute mark strictly after now.
  const earliestStart = addMinutes({ date: now.dateStr, minutes: 0 }, Math.floor(now.minutes / 5) * 5 + 5);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('start');
  const [applied, setApplied] = useState(false);

  // Auto-suggest the next open half-hour from the current time, unless a
  // later day was already picked (e.g. coming back to this step).
  const [start, setStartRaw] = useState<WallTime>(() => {
    const nowWall = getNowInTimezone(selectedTimezone);
    if (selectedDate && selectedDate > nowWall.dateStr) return { date: selectedDate, minutes: 9 * 60 };
    return addMinutes({ date: nowWall.dateStr, minutes: 0 }, Math.floor(nowWall.minutes / 30) * 30 + 30);
  });
  const [end, setEndRaw] = useState<WallTime>(() => addMinutes(start, DEFAULT_DURATION));

  const startDate = start.date;
  const endDate = end.date;
  const { hour12: startHour, minute: startMinute, ampm: startAmpm } = splitWall(start);
  const { hour12: endHour, minute: endMinute, ampm: endAmpm } = splitWall(end);
  const [viewYear, setViewYear] = useState(Number(start.date.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(Number(start.date.slice(5, 7)) - 1);

  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'unknown' });
  const requestIdRef = useRef(0);

  // Jump the calendar to whichever end's month is being edited.
  useEffect(() => {
    const d = new Date(`${step === 'start' ? startDate : endDate}T12:00:00`);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Moving the start never lands in the past (snaps to the earliest open
  // slot instead) and carries the end along so the meeting length is kept.
  const setStart = (next: WallTime) => {
    const clamped = compareWall(next, earliestStart) < 0 ? earliestStart : next;
    setStartRaw(clamped);
    setEndRaw(addMinutes(clamped, durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION));
  };
  // The end can't be at or before the start.
  const minEnd = addMinutes(start, 5);
  const setEnd = (next: WallTime) => setEndRaw(compareWall(next, minEnd) < 0 ? minEnd : next);

  // If the clock (or a timezone change) overtakes the chosen start, move it
  // up to the next open slot rather than leaving a stale past time selected.
  useEffect(() => {
    if (compareWall(start, earliestStart) < 0) setStart(earliestStart);
  }, [earliestStart.date, earliestStart.minutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const startIso = zonedTimeToUtc(startDate, to24Hour(startHour, startAmpm), startMinute, selectedTimezone).toISOString();
  const endIso = zonedTimeToUtc(endDate, to24Hour(endHour, endAmpm), endMinute, selectedTimezone).toISOString();
  const isPast = new Date(startIso).getTime() <= Date.now();
  const durationMinutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  const isValidRange = durationMinutes > 0;

  useEffect(() => {
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

  useEffect(() => {
    setApplied(false);
  }, [startDate, startHour, startMinute, startAmpm, endDate, endHour, endMinute, endAmpm]);

  const isBlocked = isPast || !isValidRange || availability.status === 'blocked';

  const pickStartDay = (d: string) => setStart({ date: d, minutes: start.minutes });
  const pickEndDay = (d: string) => setEnd({ date: d, minutes: end.minutes });

  const handleNext = () => setStep('end');
  const handleBack = () => setStep('start');
  const handleCancel = () => setIsOpen(false);

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
    setIsOpen(false);
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

  // Whatever end is being edited, plus the earliest moment it may take -
  // anything before that is grayed out in the calendar and time columns.
  const active = step === 'start' ? start : end;
  const minAllowed = step === 'start' ? earliestStart : minEnd;
  const setActive = step === 'start' ? setStart : setEnd;
  const { hour12: activeHour, minute: activeMinute, ampm: activeAmpm } = splitWall(active);
  const at = (minutes: number): WallTime => ({ date: active.date, minutes });
  const isBefore = (minutes: number) => compareWall(at(minutes), minAllowed) < 0;
  const hourDisabled = (h12: number) => isBefore(to24Hour(h12, activeAmpm) * 60 + 55);
  const minuteDisabled = (m: number) => isBefore(to24Hour(activeHour, activeAmpm) * 60 + m);
  const ampmDisabled = (ap: Ampm) => isBefore(to24Hour(11, ap) * 60 + 55);

  const availabilityReadout = (
    <div className="flex flex-col items-center gap-2">
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

      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
        Date &amp; Time Range
      </label>

      <div className="relative w-full max-w-[480px]">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white border-2 border-[#0433FF] rounded-lg text-left cursor-pointer"
        >
          <span className="text-[15px] text-gray-900 truncate">{summary}</span>
          <CalendarIcon className="w-[18px] h-[18px] text-gray-500 shrink-0" />
        </button>

        {isOpen && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
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

                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = toDateStr(viewYear, viewMonth, day);
                    const isStart = dateStr === startDate;
                    const isEnd = dateStr === endDate;
                    const isEdge = isStart || isEnd;
                    const isInRange = startDate < dateStr && dateStr < endDate;
                    const isActive = dateStr === activeDateStr;
                    const isDisabled = dateStr < minAllowed.date;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onPickDay(dateStr)}
                        disabled={isDisabled}
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
                  values={HOURS}
                  active={activeHour}
                  format={(v) => pad2(v)}
                  isDisabled={hourDisabled}
                  onSelect={(h) => setActive(at(to24Hour(h, activeAmpm) * 60 + activeMinute))}
                />
                <ScrollColumn
                  values={MINUTES}
                  active={activeMinute}
                  format={(v) => pad2(v)}
                  isDisabled={minuteDisabled}
                  onSelect={(m) => setActive(at(to24Hour(activeHour, activeAmpm) * 60 + m))}
                />
                <ScrollColumn
                  values={AMPMS}
                  active={activeAmpm}
                  format={(v) => v}
                  isDisabled={ampmDisabled}
                  onSelect={(ap) => setActive(at(to24Hour(activeHour, ap) * 60 + activeMinute))}
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
  values,
  active,
  format,
  onSelect,
  isDisabled,
}: {
  values: T[];
  active: T;
  format: (v: T) => string;
  onSelect: (v: T) => void;
  isDisabled?: (v: T) => boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

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
    <div ref={containerRef} className="relative w-16 max-h-[252px] overflow-y-auto no-scrollbar px-1 space-y-0.5">
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
  );
}

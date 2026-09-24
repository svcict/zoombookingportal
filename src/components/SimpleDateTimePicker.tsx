import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Globe, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { zonedTimeToUtc } from '../utils/timezone';
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
const HOURS = Array.from({ length: 12 }, (_, i) => 12 - i); // 12, 11, ... 1
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, ... 55
const AMPMS: Ampm[] = ['AM', 'PM'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const to24Hour = (hour12: number, ampm: Ampm) => (ampm === 'AM' ? hour12 % 12 : (hour12 % 12) + 12);

const formatTimeLabel = (hour12: number, minute: number, ampm: Ampm) =>
  `${hour12}:${pad2(minute)} ${ampm}`;

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
  const initial = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date(Date.now() + 86400000);

  const [isOpen, setIsOpen] = useState(true);
  const [step, setStep] = useState<Step>('start');
  const [applied, setApplied] = useState(false);

  const [startDate, setStartDate] = useState(selectedDate || toDateStr(initial.getFullYear(), initial.getMonth(), initial.getDate()));
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [startAmpm, setStartAmpm] = useState<Ampm>('AM');

  const [endDate, setEndDate] = useState(startDate);
  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(30);
  const [endAmpm, setEndAmpm] = useState<Ampm>('AM');

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'unknown' });
  const requestIdRef = useRef(0);

  // Jump the calendar to whichever end's month is being edited.
  useEffect(() => {
    const d = new Date(`${step === 'start' ? startDate : endDate}T12:00:00`);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const pickStartDay = (d: string) => {
    setStartDate(d);
    if (endDate < d) setEndDate(d); // keep the range sane when start moves past the old end
  };

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
  const onPickDay = step === 'start' ? pickStartDay : setEndDate;

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
            <CalendarIcon className="w-4.5 h-4.5 text-[#0b5cff]" />
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
          <Globe className="w-3.5 h-3.5 text-[#0b5cff]" />
          <span className="font-mono text-[11px] truncate max-w-[180px]">
            {selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}
          </span>
          <span className="text-[10px] text-[#0b5cff] font-bold underline">Change</span>
        </button>
      </div>

      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
        Date &amp; Time Range
      </label>

      <div className="relative w-full max-w-[480px]">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white border-2 border-[#0b5cff] rounded-lg text-left cursor-pointer"
        >
          <span className="text-[15px] text-gray-900 truncate">{summary}</span>
          <CalendarIcon className="w-[18px] h-[18px] text-gray-500 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {/* Step indicator */}
            <div className="flex items-center gap-2 px-5 pt-4">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${step === 'start' ? 'text-[#0b5cff]' : 'text-gray-400'}`}>
                1. Start
              </span>
              <span className="text-gray-300">→</span>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${step === 'end' ? 'text-[#0b5cff]' : 'text-gray-400'}`}>
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
                    <div key={i} className="text-center text-xs text-gray-400 py-1.5">{wd}</div>
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
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onPickDay(dateStr)}
                        className={`aspect-square text-sm cursor-pointer rounded ${
                          isEdge
                            ? `rounded-full font-bold text-white ${isActive ? 'bg-[#0b5cff]' : 'bg-[#0b5cff]/60'}`
                            : isInRange
                              ? 'bg-blue-100 text-gray-800'
                              : 'text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hour / Minute / AM-PM columns for whichever end is active */}
              <div className="flex border-t sm:border-t-0 sm:border-l border-gray-100">
                <ScrollColumn
                  values={HOURS}
                  active={step === 'start' ? startHour : endHour}
                  format={(v) => pad2(v)}
                  onSelect={step === 'start' ? setStartHour : setEndHour}
                />
                <ScrollColumn
                  values={MINUTES}
                  active={step === 'start' ? startMinute : endMinute}
                  format={(v) => pad2(v)}
                  onSelect={step === 'start' ? setStartMinute : setEndMinute}
                  bordered
                />
                <ScrollColumn
                  values={AMPMS}
                  active={step === 'start' ? startAmpm : endAmpm}
                  format={(v) => v}
                  onSelect={(step === 'start' ? setStartAmpm : setEndAmpm) as (v: Ampm) => void}
                  bordered
                />
              </div>
            </div>

            {step === 'end' && <div className="px-5 pb-1">{availabilityReadout}</div>}

            <div className="flex items-center justify-end gap-5 px-5 py-3.5 border-t border-gray-100">
              {step === 'start' ? (
                <>
                  <button type="button" onClick={handleCancel} className="text-[13px] font-bold tracking-wide text-[#0b5cff] cursor-pointer">
                    CANCEL
                  </button>
                  <button type="button" onClick={handleNext} className="text-[13px] font-bold tracking-wide text-[#0b5cff] cursor-pointer">
                    NEXT
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={handleBack} className="text-[13px] font-bold tracking-wide text-[#0b5cff] cursor-pointer">
                    BACK
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isBlocked}
                    className={`text-[13px] font-bold tracking-wide cursor-pointer ${isBlocked ? 'text-gray-300 cursor-not-allowed' : 'text-[#0b5cff]'}`}
                  >
                    {applied ? 'APPLIED ✓' : 'APPLY'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {!isOpen && <div className="mt-4">{availabilityReadout}</div>}
    </div>
  );
};

function ScrollColumn<T extends string | number>({
  values,
  active,
  format,
  onSelect,
  bordered,
}: {
  values: T[];
  active: T;
  format: (v: T) => string;
  onSelect: (v: T) => void;
  bordered?: boolean;
}) {
  return (
    <div className={`w-16 max-h-[280px] overflow-y-auto py-2 ${bordered ? 'border-l border-gray-100' : ''}`}>
      {values.map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onSelect(v)}
          className={`w-full text-center py-2 text-sm cursor-pointer rounded-md mx-auto ${
            v === active ? 'bg-[#0b5cff] text-white font-bold' : 'text-gray-800 hover:bg-gray-100 font-normal'
          }`}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
}

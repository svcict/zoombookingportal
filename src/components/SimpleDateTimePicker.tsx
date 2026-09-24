import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Globe, CheckCircle2, XCircle, Loader2, ChevronDown } from 'lucide-react';
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

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const formatTimeLabel = (hhmm: string) =>
  new Date(`2000-01-01T${hhmm}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const formatDateLabel = (dateStr: string) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Consolidated date + time range field, matching the "Pick Time and Date"
// design: the trigger stays in normal document flow and expands an inline
// panel below it (no floating/absolute popover, so nothing can clip it and
// the live availability readout is never hidden behind an overlay), styled
// with plain native inputs rather than @mui/x-date-pickers-pro (which needs
// a paid license for its own range picker). Still backed by the same real
// availability check (/api/availability/check) so the user still sees
// whether the exact date/time range they picked is actually free.
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
  const [startTime, setStartTime] = useState('09:00'); // HH:MM, 24-hour
  const [endTime, setEndTime] = useState('09:30');
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'unknown' });
  const [isOpen, setIsOpen] = useState(true);
  const [applied, setApplied] = useState(false);
  const requestIdRef = useRef(0);

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const isoString = selectedDate
    ? zonedTimeToUtc(selectedDate, startHour, startMinute, selectedTimezone).toISOString()
    : '';
  const isPast = Boolean(isoString) && new Date(isoString).getTime() <= Date.now();
  const durationMinutes = toMinutes(endTime) - toMinutes(startTime);
  const isValidRange = durationMinutes > 0;

  useEffect(() => {
    if (isValidRange) onDurationChange(durationMinutes);
  }, [durationMinutes, isValidRange, onDurationChange]);

  useEffect(() => {
    if (!selectedDate || isPast || !isValidRange) {
      setAvailability({ status: 'unknown' });
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setAvailability({ status: 'checking' });

    const params = new URLSearchParams({ date: selectedDate, time: startTime, timezone: selectedTimezone });
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
    }, 300); // debounce rapid input changes

    return () => clearTimeout(timeout);
  }, [selectedDate, startTime, durationMinutes, isValidRange, selectedTimezone, meetingTypeId, isPast]);

  // Editing the range again after applying un-does the "Applied" state.
  useEffect(() => {
    setApplied(false);
  }, [selectedDate, startTime, endTime]);

  const isBlocked = isPast || !isValidRange || availability.status === 'blocked';

  const handleApply = () => {
    if (isBlocked) return;
    const formattedTime = formatTimeLabel(startTime);
    onSelectTime({
      id: `custom-${selectedDate}-${startTime}-${endTime}`,
      time: startTime,
      formattedTime,
      isoString,
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

  const rangeSummary = selectedDate
    ? `${formatDateLabel(selectedDate)} · ${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`
    : 'Select date and time';

  const availabilityReadout = (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-gray-500 font-medium">{durationLabel}</span>
      {!isValidRange ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold text-center">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          End time must be after start time
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

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-left transition-colors cursor-pointer border ${
          isOpen ? 'bg-blue-50 border-[#0b5cff]/50' : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-[#0b5cff] shrink-0" />
        <span className="text-[15px] font-semibold text-gray-900 flex-1 truncate">{rangeSummary}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-3.5 bg-[#FAFAFA] border border-gray-200 rounded-xl p-5">
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={getTodayStr()}
              onChange={(e) => onSelectDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] focus:border-transparent cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] focus:border-transparent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] focus:border-transparent cursor-pointer"
              />
            </div>
          </div>

          <div className="mb-4">{availabilityReadout}</div>

          <button
            type="button"
            onClick={handleApply}
            disabled={isBlocked}
            className={`w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-colors ${
              isBlocked
                ? 'bg-gray-300 cursor-not-allowed'
                : applied
                  ? 'bg-green-600 cursor-pointer'
                  : 'bg-[#0b5cff] hover:bg-[#0049d1] cursor-pointer'
            }`}
          >
            {applied ? 'Applied ✓' : 'Apply'}
          </button>
        </div>
      )}

      {!isOpen && <div className="mt-4">{availabilityReadout}</div>}
    </div>
  );
};

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

// A single consolidated field (like MUI X's DateTimeRangePicker) instead of
// three separate inputs - click it to open a popover with the date, start
// time, and end time controls, styled here with plain native inputs rather
// than pulling in @mui/x-date-pickers-pro (which needs a paid license for
// its own range picker). Still backed by the same real availability check
// (/api/availability/check) so the user still sees whether the exact
// date/time range they picked is actually free before confirming.
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
  const [isOpen, setIsOpen] = useState(false);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

  const handleConfirm = () => {
    if (!selectedDate || isPast || !isValidRange || availability.status === 'blocked') return;
    const formattedTime = formatTimeLabel(startTime);
    onSelectTime({
      id: `custom-${selectedDate}-${startTime}-${endTime}`,
      time: startTime,
      formattedTime,
      isoString,
      isAvailable: availability.status !== 'blocked',
    });
  };

  const fieldLabel = selectedDate
    ? `${formatDateLabel(selectedDate)} · ${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`
    : 'Select date and time';

  // Shared live duration + availability readout, rendered both inside the
  // popover (so it's visible in real time while still editing the range,
  // instead of hidden behind the popover) and again once it's collapsed
  // back to the single field, so it stays visible at a glance either way.
  const availabilityReadout = isValidRange && (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-gray-500 font-medium">{durationMinutes} minute meeting</span>
      {isPast ? (
        <p className="text-xs text-red-500 font-medium">This time has already passed.</p>
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
      <div className="pb-4 border-b border-gray-100 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0b5cff]" />
            <h3 className="font-bold text-gray-900 text-lg">Pick time and date</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{formattedDate}</p>
        </div>

        {/* Timezone pill button */}
        <button
          type="button"
          onClick={onChangeTimezone}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Globe className="w-3.5 h-3.5 text-[#0b5cff]" />
          <span className="font-mono text-[11px] truncate max-w-[180px]">
            {selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}
          </span>
          <span className="text-[10px] text-[#0b5cff] font-bold underline">Change</span>
        </button>
      </div>

      {/* Consolidated single field - opens a popover with date + start/end time */}
      <div className="relative" ref={containerRef}>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
          Date &amp; Time Range
        </label>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#F7F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="w-4 h-4 text-[#0b5cff] shrink-0" />
            <span className="truncate">{fieldLabel}</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-2 w-full min-w-[320px] bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={getTodayStr()}
                onChange={(e) => onSelectDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] cursor-pointer"
                />
              </div>
            </div>

            {!isValidRange && (
              <p className="text-xs text-red-500 font-medium">End time must be after the start time.</p>
            )}

            {availabilityReadout}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Same readout, shown here too once the popover is closed so it
          stays visible at a glance */}
      {!isOpen && <div className="mt-4">{availabilityReadout}</div>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selectedDate || isPast || !isValidRange || availability.status === 'blocked'}
        className="mt-4 w-full py-3 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
      >
        Confirm This Date & Time
      </button>
    </div>
  );
};

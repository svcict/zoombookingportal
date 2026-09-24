import React, { useEffect, useRef, useState } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { zonedTimeToUtc } from '../utils/timezone';
import { TimeSlot } from '../types';

interface TimePickerProps {
  formattedDate: string;
  selectedDate: string;
  selectedTimezone: string;
  meetingTypeId?: string;
  duration?: number;
  onSelectTime: (slot: TimeSlot) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, ... 55
const PERIODS: Array<'AM' | 'PM'> = ['AM', 'PM'];

type AvailabilityState =
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'blocked'; reason?: string }
  | { status: 'unknown' };

// Free time entry, not locked to preset 30-minute intervals - but the user
// still needs to know at a glance whether the exact time they're looking at
// is actually free, so every change checks the real server-side conflict
// logic (dual rotating Zoom accounts + M365 calendars) via
// /api/availability/check, same authority the old fixed-slot grid used.
export const TimePicker: React.FC<TimePickerProps> = ({
  formattedDate,
  selectedDate,
  selectedTimezone,
  meetingTypeId,
  duration,
  onSelectTime,
}) => {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'unknown' });

  const hour24 = period === 'AM' ? hour % 12 : (hour % 12) + 12;
  const isoString = zonedTimeToUtc(selectedDate, hour24, minute, selectedTimezone).toISOString();
  const isPast = new Date(isoString).getTime() <= Date.now();

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (isPast) {
      setAvailability({ status: 'unknown' });
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setAvailability({ status: 'checking' });

    const timeStr = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const params = new URLSearchParams({
      date: selectedDate,
      time: timeStr,
      timezone: selectedTimezone,
    });
    if (meetingTypeId) params.set('meetingTypeId', meetingTypeId);
    if (duration) params.set('duration', String(duration));

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
    }, 300); // debounce rapid column clicks

    return () => clearTimeout(timeout);
  }, [hour24, minute, selectedDate, selectedTimezone, meetingTypeId, duration, isPast]);

  const handleConfirm = () => {
    if (isPast || availability.status === 'blocked') return;
    const timeStr = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const formattedTime = `${hour}:${String(minute).padStart(2, '0')} ${period}`;
    onSelectTime({
      id: `custom-${selectedDate}-${timeStr}`,
      time: timeStr,
      formattedTime,
      isoString,
      isAvailable: availability.status !== 'blocked',
    });
  };

  return (
    <div className="flex flex-col h-full p-5 sm:p-6 bg-white">
      <div className="pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0b5cff]" />
          <h3 className="font-bold text-gray-900 text-lg">Pick a Time</h3>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {formattedDate} <span className="text-gray-300">&bull;</span> any time, not just preset slots
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center gap-3">
        <ScrollColumn label="Hour" values={HOURS} value={hour} onChange={setHour} format={(v) => String(v)} />
        <ScrollColumn label="Min" values={MINUTES} value={minute} onChange={setMinute} format={(v) => String(v).padStart(2, '0')} />
        <ScrollColumn label="" values={PERIODS} value={period} onChange={setPeriod} format={(v) => v} />
      </div>

      {/* Live availability readout for the exact time currently dialed in */}
      <div className="mt-4 flex justify-center">
        {isPast ? (
          <p className="text-xs text-red-500 font-medium">This time has already passed today.</p>
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

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPast || availability.status === 'blocked'}
        className="mt-4 w-full py-3 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
      >
        Use {hour}:{String(minute).padStart(2, '0')} {period}
      </button>
    </div>
  );
};

function ScrollColumn<T extends string | number>({
  label,
  values,
  value,
  onChange,
  format,
}: {
  label: string;
  values: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</span>}
      <div className="h-56 w-16 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/70 no-scrollbar">
        {values.map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`w-full py-2 text-sm font-semibold transition-colors cursor-pointer ${
              v === value ? 'bg-[#0b5cff] text-white' : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            {format(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

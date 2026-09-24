import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { zonedTimeToUtc } from '../utils/timezone';
import { TimeSlot } from '../types';

interface TimePickerProps {
  formattedDate: string;
  selectedDate: string;
  selectedTimezone: string;
  onSelectTime: (slot: TimeSlot) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, ... 55
const PERIODS: Array<'AM' | 'PM'> = ['AM', 'PM'];

// Free time entry, not locked to preset 30-minute intervals - real
// availability (dual-account conflicts, M365 busy blocks) is still
// resolved server-side at submit, same as the old fixed-slot flow already
// did for the "both accounts got booked out from under you" case.
export const TimePicker: React.FC<TimePickerProps> = ({ formattedDate, selectedDate, selectedTimezone, onSelectTime }) => {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  const hour24 = period === 'AM' ? hour % 12 : (hour % 12) + 12;
  const isoString = zonedTimeToUtc(selectedDate, hour24, minute, selectedTimezone).toISOString();
  const isPast = new Date(isoString).getTime() <= Date.now();

  const handleConfirm = () => {
    if (isPast) return;
    const timeStr = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const formattedTime = `${hour}:${String(minute).padStart(2, '0')} ${period}`;
    onSelectTime({
      id: `custom-${selectedDate}-${timeStr}`,
      time: timeStr,
      formattedTime,
      isoString,
      isAvailable: true,
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

      {isPast && (
        <p className="text-xs text-red-500 font-medium text-center mt-3">This time has already passed today.</p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPast}
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

import React from 'react';
import { Clock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TimeSlot } from '../types';

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedDate: string;
  formattedDate: string;
  selectedTimezone: string;
  isLoading?: boolean;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  selectedDate,
  formattedDate,
  selectedTimezone,
  isLoading = false,
}) => {
  const availableSlotsCount = slots.filter((s) => s.isAvailable).length;
  const bookedSlotsCount = slots.filter((s) => !s.isAvailable).length;

  return (
    <div className="flex flex-col justify-between h-full p-5 sm:p-6 bg-white">
      
      {/* Grid Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0b5cff]" />
              <h3 className="font-bold text-gray-900 text-lg">Available Times</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {formattedDate} • <span className="text-[#0b5cff] font-semibold">{selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}</span>
            </p>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>{availableSlotsCount} Available</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>{bookedSlotsCount} Blocked</span>
            </div>
          </div>
        </div>

        {/* Slots List Container */}
        <div className="mt-4 overflow-y-auto max-h-[440px] pr-1">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-[#0b5cff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Checking real-time calendar availability...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              No time slots configured for this date.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;

                if (slot.isAvailable) {
                  // GREEN / BLUE SLOT (AVAILABLE FOR BOOKING)
                  if (isSelected) {
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className="bg-green-600 border border-green-600 p-3 rounded-xl flex items-center justify-between ring-4 ring-green-100 transition-all text-left shadow-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-white" />
                          <span className="text-sm font-extrabold text-white tracking-tight">{slot.formattedTime}</span>
                        </div>
                        <span className="text-[10px] text-green-100 uppercase tracking-wider font-bold bg-green-700/60 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onSelectSlot(slot)}
                      className="bg-green-50/80 border border-green-200 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-green-400 hover:bg-green-100/70 hover:shadow-xs transition-all text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-700 group-hover:text-green-800" />
                        <span className="text-sm font-bold text-green-900 tracking-tight">
                          {slot.formattedTime}
                        </span>
                      </div>
                      <span className="text-[10px] text-green-800 uppercase tracking-wider font-bold bg-green-200/70 px-2 py-0.5 rounded-full">
                        Available
                      </span>
                    </button>
                  );
                } else {
                  // UNAVAILABLE / BLOCKED SLOT (RED)
                  return (
                    <div
                      key={slot.id}
                      className="bg-red-50/60 border border-red-200/80 p-3 rounded-xl flex items-center justify-between opacity-80 text-left select-none"
                      title="This time slot is blocked / unavailable due to existing calendar bookings"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-900/80 line-through">
                          {slot.formattedTime}
                        </span>
                      </div>
                      <span className="text-[10px] text-red-700 uppercase tracking-wider font-bold bg-red-100/90 border border-red-200 px-2 py-0.5 rounded-full">
                        Blocked
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Slot Action or Bottom Note */}
      <div>
        {selectedSlot ? (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0b5cff] text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Selected Time</div>
                <div className="text-xs font-bold text-[#0b5cff]">
                  {formattedDate} at {selectedSlot.formattedTime}
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => onSelectSlot(selectedSlot)}
              className="text-xs font-bold px-3.5 py-1.5 bg-[#0b5cff] hover:bg-[#0049d1] text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Next: Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Click any green slot to select your time
            </span>
            <span className="text-gray-400 font-mono text-[10px]">Real-Time</span>
          </div>
        )}
      </div>

    </div>
  );
};

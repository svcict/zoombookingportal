import React from 'react';
import { CalendarX2, X } from 'lucide-react';

interface SlotUnavailableModalProps {
  onChooseAnotherSlot: () => void;
  onClose: () => void;
}

// Shown when a booking attempt is rejected because both rotating Zoom
// accounts already have a meeting at the exact requested time (server's
// 409 "Both rotating Zoom accounts already have a meeting at this time")
// - a real, expected capacity limit, not an error, so it gets its own
// calm modal instead of a raw browser alert() with the server's message.
export const SlotUnavailableModal: React.FC<SlotUnavailableModalProps> = ({ onChooseAnotherSlot, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <CalendarX2 className="w-5.5 h-5.5" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900">Selected Time Slot Unavailable</h3>
        <p className="text-sm text-gray-500 mt-1.5">
          This slot was just booked out from under you. Please choose another slot.
        </p>
      </div>

      <button
        type="button"
        onClick={onChooseAnotherSlot}
        className="w-full px-4 py-2.5 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] text-white text-sm font-bold transition-colors cursor-pointer"
      >
        Choose Another Slot
      </button>
    </div>
  </div>
);

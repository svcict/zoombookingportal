import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  minDate?: string;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  // Initialize view to selected date's month or current month
  const initialDate = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="flex flex-col justify-between h-full p-5 sm:p-6 bg-white">
      
      <div>
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#0b5cff]" />
              <h3 className="font-bold text-gray-900 text-lg">
                {monthNames[month]} <span className="font-normal text-gray-500">{year}</span>
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Select a date on the calendar</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 bg-white border border-gray-200 rounded-lg shadow-xs hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 bg-white border border-gray-200 rounded-lg shadow-xs hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekdays Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2.5">
          {daysOfWeek.map((day, idx) => (
            <div
              key={day}
              className={`text-[11px] font-bold tracking-wider py-1 ${
                idx === 0 || idx === 6 ? 'text-gray-300' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Leading empty days */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-10" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            
            const dayDate = new Date(year, month, dayNum);
            const dayOfWeekNum = dayDate.getDay();
            const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;

            // Check if past
            const isPast = dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

            let btnClasses = 'w-full h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center relative ';

            if (isSelected) {
              btnClasses += 'bg-[#0b5cff] text-white shadow-xs font-bold scale-105 z-10';
            } else if (isPast) {
              btnClasses += 'text-gray-300 cursor-not-allowed opacity-40';
            } else if (isWeekend) {
              btnClasses += 'text-gray-400 hover:bg-gray-50 opacity-60 cursor-pointer';
            } else {
              btnClasses += 'text-gray-700 hover:bg-blue-50 hover:text-[#0b5cff] bg-gray-50/70 border border-transparent cursor-pointer';
            }

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isPast}
                onClick={() => onSelectDate(dateStr)}
                className={btnClasses}
              >
                <span>{dayNum}</span>
                {isToday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0b5cff] absolute bottom-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#0b5cff]" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Available Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-700 font-semibold">Blocked / Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          <span>Past Date</span>
        </div>
      </div>

    </div>
  );
};

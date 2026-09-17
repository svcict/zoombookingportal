import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Clock, 
  Plus, 
  CheckCircle2, 
  ExternalLink, 
  User, 
  Users, 
  Lock,
  Layers,
  Info,
  CalendarCheck,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { Booking, M365CalendarState, M365User } from '../types';

interface SyncedM365Event {
  accountId?: string;
  date: string;
  time: string;
  title: string;
}

interface Office365CalendarDashboardProps {
  authUser?: M365User | null;
  m365State?: M365CalendarState;
  bookings: Booking[];
  syncedEvents?: SyncedM365Event[];
  onNavigateToSchedule?: () => void;
  onScheduleMeeting?: () => void;
  onSelectBookingForDetails: (booking: Booking) => void;
  onRefreshCalendar?: () => Promise<void>;
  selectedTimezone?: string;
  userEmail?: string;
  userName?: string;
  hideWelcomeCard?: boolean;
}

interface DashboardWelcomeCardProps {
  authUser?: M365User | null;
  m365State?: M365CalendarState;
  selectedTimezone?: string;
  userEmail?: string;
  userName?: string;
  onScheduleMeeting?: () => void;
  onNavigateToSchedule?: () => void;
}

// Full-width account/greeting banner, shared between the standalone Dashboard
// header and Office365CalendarDashboard's own layout (see hideWelcomeCard).
export const DashboardWelcomeCard: React.FC<DashboardWelcomeCardProps> = ({
  authUser,
  m365State,
  selectedTimezone = 'UTC+08:00 (Asia/Manila)',
  userEmail,
  userName,
  onScheduleMeeting,
  onNavigateToSchedule,
}) => {
  const accountEmail = authUser?.email || userEmail || m365State?.accountEmail || 'buhatar@gmail.com';
  const accountName = authUser?.name || userName || 'Authorized User';

  const handleSchedule = () => {
    if (onScheduleMeeting) {
      onScheduleMeeting();
    } else if (onNavigateToSchedule) {
      onNavigateToSchedule();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
          <CalendarIcon className="w-6 h-6 text-[#0b5cff]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Welcome, {accountName}!</h1>
          <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-all">Email: <strong>{accountEmail}</strong></span>
            <span className="hidden sm:inline">•</span>
            <span>Timezone: {selectedTimezone}</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-gray-400">Hours: 8:00 AM – 5:00 PM</span>
          </p>
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSchedule}
          className="group flex items-center gap-2 px-4 py-2 bg-[#0b5cff] hover:bg-[#094fd9] active:bg-[#0842b8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 transition-transform duration-500 ease-in-out group-hover:rotate-180" />
          <span>Schedule Meeting</span>
        </button>
      </div>
    </div>
  );
};

export const Office365CalendarDashboard: React.FC<Office365CalendarDashboardProps> = ({
  authUser,
  m365State,
  bookings,
  syncedEvents = [],
  onNavigateToSchedule,
  onScheduleMeeting,
  onSelectBookingForDetails,
  onRefreshCalendar,
  selectedTimezone = 'UTC+08:00 (Asia/Manila)',
  userEmail,
  userName,
  hideWelcomeCard = false,
}) => {
  const accountEmail = authUser?.email || userEmail || m365State?.accountEmail || 'buhatar@gmail.com';
  const accountName = authUser?.name || userName || 'Authorized User';

  const handleSchedule = () => {
    if (onScheduleMeeting) {
      onScheduleMeeting();
    } else if (onNavigateToSchedule) {
      onNavigateToSchedule();
    }
  };

  // Calendar view mode: 'week' (DEFAULT), 'day', 'month'
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  
  // Current anchor date (default to today / current week)
  const [currentAnchorDate, setCurrentAnchorDate] = useState<Date>(() => {
    // Current date: Sep 15, 2026 based on system metadata, or today's real date
    const d = new Date();
    // If system is in 2026, set to current system date
    return d;
  });

  // Parse date to YYYY-MM-DD string
  const toDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = toDateKey(new Date());

  // Week calculation (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentAnchorDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
    // Adjust to Monday as start: Monday is 0 offset, Sunday is 6 offset
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const days: Array<{ date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean }> = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = toDateKey(d);
      days.push({
        date: d,
        dateStr: str,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isToday: str === todayKey,
      });
    }
    return days;
  }, [currentAnchorDate, todayKey]);

  // Month calculation
  const monthInfo = useMemo(() => {
    const year = currentAnchorDate.getFullYear();
    const month = currentAnchorDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    // Previous month filler days
    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Fill previous days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const str = toDateKey(prevDate);
      days.push({
        dateStr: str,
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: str === todayKey,
      });
    }

    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      const curDate = new Date(year, month, i);
      const str = toDateKey(curDate);
      days.push({
        dateStr: str,
        dayNum: i,
        isCurrentMonth: true,
        isToday: str === todayKey,
      });
    }

    // Fill next month days to complete 35 or 42 grid
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const str = toDateKey(nextDate);
      days.push({
        dateStr: str,
        dayNum: i,
        isCurrentMonth: false,
        isToday: str === todayKey,
      });
    }

    return {
      monthName: currentAnchorDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      days,
    };
  }, [currentAnchorDate, todayKey]);

  // Hours displayed on calendar grid: 8 AM to 5 PM
  const businessHours = [
    { hour24: 8, label: '08:00 AM' },
    { hour24: 9, label: '09:00 AM' },
    { hour24: 10, label: '10:00 AM' },
    { hour24: 11, label: '11:00 AM' },
    { hour24: 12, label: '12:00 PM' },
    { hour24: 13, label: '01:00 PM' },
    { hour24: 14, label: '02:00 PM' },
    { hour24: 15, label: '03:00 PM' },
    { hour24: 16, label: '04:00 PM' },
    { hour24: 17, label: '05:00 PM' },
  ];

  // Group events by date and hour
  // Combines bookings and M365 synced busy events
  const calendarEventsMap = useMemo(() => {
    const map: Record<string, Array<{
      id: string;
      title: string;
      time: string;
      duration?: number;
      type: 'zoom_booking' | 'm365_sync';
      booking?: Booking;
      attendees?: string;
      meetingId?: string;
      passcode?: string;
      joinUrl?: string;
    }>> = {};

    // 1. Add Bookings
    bookings.forEach((b) => {
      if (b.status === 'cancelled') return;
      const key = b.date;
      if (!map[key]) map[key] = [];

      // Extract time in 24-hr format like "10:00"
      let timeKey = '09:00';
      if (b.timeSlot) {
        const m = b.timeSlot.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
        if (m) {
          let hr = parseInt(m[1], 10);
          const min = m[2];
          const ampm = m[3]?.toUpperCase();
          if (ampm === 'PM' && hr < 12) hr += 12;
          if (ampm === 'AM' && hr === 12) hr = 0;
          timeKey = `${String(hr).padStart(2, '0')}:${min}`;
        }
      }

      map[key].push({
        id: b.id,
        title: b.meetingTitle || 'Zoom Video Meeting',
        time: timeKey,
        duration: b.duration || 30,
        type: 'zoom_booking',
        booking: b,
        attendees: b.participantName,
        meetingId: b.zoomDetails?.formattedMeetingId || b.zoomDetails?.meetingId,
        passcode: b.zoomDetails?.passcode,
        joinUrl: b.zoomDetails?.joinUrl,
      });
    });

    // 2. Add Synced M365 Events
    syncedEvents.forEach((evt, idx) => {
      const key = evt.date;
      if (!map[key]) map[key] = [];
      map[key].push({
        id: `m365-${key}-${evt.time}-${idx}`,
        title: evt.title,
        time: evt.time,
        duration: 45,
        type: 'm365_sync',
        attendees: accountName,
      });
    });

    return map;
  }, [bookings, syncedEvents, accountName]);

  // Navigate dates
  const handlePrev = () => {
    const d = new Date(currentAnchorDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentAnchorDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentAnchorDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentAnchorDate(d);
  };

  const handleToday = () => {
    setCurrentAnchorDate(new Date());
  };

  // Header Title Range
  const rangeHeaderTitle = useMemo(() => {
    if (viewMode === 'day') {
      return currentAnchorDate.toLocaleDateString('default', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } else if (viewMode === 'week') {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      const firstMonth = first.toLocaleDateString('default', { month: 'short' });
      const lastMonth = last.toLocaleDateString('default', { month: 'short' });
      if (firstMonth === lastMonth) {
        return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
      }
      return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
    } else {
      return monthInfo.monthName;
    }
  }, [viewMode, currentAnchorDate, weekDays, monthInfo]);

  return (
    <div className="space-y-6">
      
      {/* 1. Office 365 Exchange Account Hub Card (skipped when the caller renders it full-width itself) */}
      {!hideWelcomeCard && (
        <DashboardWelcomeCard
          authUser={authUser}
          m365State={m365State}
          selectedTimezone={selectedTimezone}
          userEmail={userEmail}
          userName={userName}
          onScheduleMeeting={onScheduleMeeting}
          onNavigateToSchedule={onNavigateToSchedule}
        />
      )}

      {/* 2. Main Calendar Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Calendar Navigation & View Mode Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Navigation Controls: Today, Prev, Next, Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToday}
              className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 transition-colors cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-gray-300" />
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 pl-1">
              {rangeHeaderTitle}
            </h2>
          </div>

          {/* View Mode Toggle: Day | Week (Default) | Month */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-[#0b5cff] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Day</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-[#0b5cff] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Week (Default)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-[#0b5cff] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: WEEKLY VIEW (DEFAULT)                                 */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              
              {/* Day Header Row */}
              <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 sticky top-0 z-10">
                <div className="p-3 text-center border-r border-gray-200 text-gray-400 font-mono text-[11px]">
                  TIME
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                      day.isToday ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                      {day.dayName}
                    </div>
                    <div className="mt-1 flex items-center justify-center">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                          day.isToday
                            ? 'bg-[#0b5cff] text-white shadow-xs'
                            : 'text-gray-900'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slots Grid (8 AM to 5 PM) */}
              <div className="divide-y divide-gray-100">
                {businessHours.map((slot) => {
                  const hourStr = String(slot.hour24).padStart(2, '0');

                  return (
                    <div key={slot.hour24} className="grid grid-cols-8 min-h-[64px]">
                      
                      {/* Hour Label */}
                      <div className="p-2.5 text-[11px] font-mono font-medium text-gray-500 border-r border-gray-200 bg-[#fafafa] flex items-center justify-center select-none">
                        {slot.label}
                      </div>

                      {/* 7 Days Columns for this Hour */}
                      {weekDays.map((day) => {
                        const dayEvents = calendarEventsMap[day.dateStr] || [];
                        // Filter events matching this hour
                        const matchingEvents = dayEvents.filter((e) => {
                          const eventHour = e.time.split(':')[0];
                          return eventHour === hourStr;
                        });

                        return (
                          <div
                            key={day.dateStr}
                            className={`p-1 border-r border-gray-100 last:border-r-0 relative group transition-colors ${
                              day.isToday ? 'bg-blue-50/20' : 'hover:bg-gray-50/70'
                            }`}
                          >
                            {matchingEvents.length > 0 ? (
                              <div className="space-y-1">
                                {matchingEvents.map((evt) => {
                                  const isZoom = evt.type === 'zoom_booking';
                                  return (
                                    <div
                                      key={evt.id}
                                      onClick={() => {
                                        if (evt.booking) {
                                          onSelectBookingForDetails(evt.booking);
                                        }
                                      }}
                                      className={`p-1.5 rounded-lg text-xs leading-tight border transition-all cursor-pointer shadow-2xs hover:shadow-sm ${
                                        isZoom
                                          ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/80'
                                          : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80'
                                      }`}
                                      title={isZoom ? 'Click to view/edit Zoom Meeting Details' : 'Microsoft 365 Exchange Event'}
                                    >
                                      <div className="flex items-center gap-1 font-bold truncate">
                                        {isZoom ? (
                                          <Video className="w-3 h-3 text-[#0b5cff] shrink-0" />
                                        ) : (
                                          <CalendarIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                                        )}
                                        <span className="truncate">{evt.title}</span>
                                      </div>
                                      <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center justify-between">
                                        <span>{evt.time}</span>
                                        {isZoom && (
                                          <span className="text-[9px] px-1 rounded bg-[#0b5cff] text-white font-bold">
                                            Zoom
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Empty Slot: Click to schedule at this hour */
                              <button
                                type="button"
                                onClick={handleSchedule}
                                className="w-full h-full min-h-[48px] rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#0b5cff] bg-blue-50/50 hover:bg-blue-100/80 border border-dashed border-blue-300 transition-all cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Book</span>
                              </button>
                            )}
                          </div>
                        );
                      })}

                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: DAILY VIEW                                            */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'day' && (
          <div className="p-4 sm:p-6 space-y-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">
              Daily Office 365 Timeline • Showing appointments from 8:00 AM to 5:00 PM
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {businessHours.map((slot) => {
                const hourStr = String(slot.hour24).padStart(2, '0');
                const dateKey = toDateKey(currentAnchorDate);
                const dayEvents = calendarEventsMap[dateKey] || [];
                const matching = dayEvents.filter((e) => e.time.split(':')[0] === hourStr);

                return (
                  <div
                    key={slot.hour24}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-24 text-xs font-mono font-bold text-gray-600 shrink-0">
                      {slot.label}
                    </div>

                    <div className="flex-1">
                      {matching.length > 0 ? (
                        <div className="space-y-2">
                          {matching.map((evt) => {
                            const isZoom = evt.type === 'zoom_booking';
                            return (
                              <div
                                key={evt.id}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isZoom
                                    ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    {isZoom ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0b5cff] text-white">
                                        Zoom Meeting
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                        Outlook 365
                                      </span>
                                    )}
                                    <h4 className="text-sm font-bold text-gray-900">{evt.title}</h4>
                                  </div>
                                  <div className="text-xs text-gray-600 flex items-center gap-2">
                                    <span>Time: {evt.time}</span>
                                    <span>•</span>
                                    <span>Duration: {evt.duration || 30} mins</span>
                                    {evt.attendees && (
                                      <>
                                        <span>•</span>
                                        <span>Attendee: {evt.attendees}</span>
                                      </>
                                    )}
                                  </div>
                                  {isZoom && evt.meetingId && (
                                    <div className="text-xs font-mono text-gray-500 pt-1">
                                      Meeting ID: {evt.meetingId} | Passcode: {evt.passcode || 'Protected'}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {isZoom && evt.booking && (
                                    <button
                                      type="button"
                                      onClick={() => onSelectBookingForDetails(evt.booking!)}
                                      className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 transition-colors cursor-pointer"
                                    >
                                      Meeting Details
                                    </button>
                                  )}
                                  {isZoom && evt.joinUrl && (
                                    <a
                                      href={evt.joinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 bg-[#0b5cff] hover:bg-[#094fd9] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <span>Join Zoom</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">
                          No scheduled appointments. Slot open for booking.
                        </div>
                      )}
                    </div>

                    {matching.length === 0 && (
                      <button
                        type="button"
                        onClick={handleSchedule}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-[#0b5cff] rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        + Book this Slot
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: MONTHLY VIEW                                          */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'month' && (
          <div className="p-4 sm:p-5">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 pb-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-7 border-t border-l border-gray-200 divide-x divide-y divide-gray-200 mt-2">
              {monthInfo.days.map((d, idx) => {
                const dayEvents = calendarEventsMap[d.dateStr] || [];

                return (
                  <div
                    key={idx}
                    className={`min-h-[90px] p-2 transition-colors ${
                      d.isCurrentMonth ? 'bg-white' : 'bg-gray-50/50 text-gray-400'
                    } ${d.isToday ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          d.isToday
                            ? 'bg-[#0b5cff] text-white shadow-xs'
                            : d.isCurrentMonth
                            ? 'text-gray-800'
                            : 'text-gray-400'
                        }`}
                      >
                        {d.dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-[#0b5cff]">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event chips */}
                    <div className="mt-1.5 space-y-1">
                      {dayEvents.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => {
                            if (evt.booking) {
                              onSelectBookingForDetails(evt.booking);
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border cursor-pointer ${
                            evt.type === 'zoom_booking'
                              ? 'bg-blue-50 border-blue-200 text-[#0b5cff]'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}
                          title={evt.title}
                        >
                          {evt.time} {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-500 font-medium pl-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

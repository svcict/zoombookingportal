import React, { useState } from 'react';
import {
  Video,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Archive,
  PlayCircle
} from 'lucide-react';
import { Booking, MeetingType } from '../types';

interface HostBookingsViewProps {
  bookings: Booking[];
  meetingTypes?: MeetingType[];
  isAdmin?: boolean;
  currentUserEmail?: string;
  onCancelBooking: (id: string) => Promise<void>;
  onCancelAllMine?: () => Promise<void>;
  onNavigateToSchedule?: () => void;
}

interface BookingCardProps {
  booking: Booking;
  isExpanded: boolean;
  onToggleExpand: () => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onCancelBooking: (id: string) => Promise<void>;
  getQuestionLabel: (booking: Booking, questionId: string) => string;
}

// One meeting's card, shared by both the active list and the collapsible
// "Canceled Meetings" section below it, so the two stay visually
// identical instead of drifting apart as separate copies.
const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isExpanded,
  onToggleExpand,
  copiedId,
  onCopy,
  onCancelBooking,
  getQuestionLabel,
}) => (
  <div
    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
      booking.status === 'cancelled'
        ? 'border-gray-200 opacity-70 bg-[#F7F9FA]'
        : 'border-gray-200 shadow-xs hover:border-[#0b5cff]/40'
    }`}
  >
    {/* Meeting Card Header Strip */}
    <div className="p-5 flex flex-col justify-between gap-4">

      {/* Left: Time, Date & Title */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b5cff] flex flex-col items-center justify-center border border-blue-100 shrink-0">
          <span className="text-[10px] font-bold uppercase text-[#0b5cff]">
            {new Date(booking.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-base font-extrabold text-gray-900 leading-none">
            {new Date(booking.date + 'T12:00:00').getDate()}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base">{booking.meetingTitle}</h3>
            {booking.status === 'confirmed' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Confirmed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Cancelled
              </span>
            )}
            {booking.liveStatus === 'started' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
            )}
            <span className="text-xs text-gray-500">• {booking.duration} mins</span>
          </div>

          <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-600 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-[#0b5cff]">
              <Clock className="w-3.5 h-3.5" />
              {booking.timeSlot} ({booking.timezone.split('/')[1]?.replace('_', ' ') || booking.timezone})
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Video className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-500">Hosted by</span>
              <span className="font-medium text-gray-900">{booking.hostName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Actions: Direct Zoom Launch & Copy Link */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <a
          href={booking.zoomDetails.joinUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Video className="w-3.5 h-3.5" />
          <span>Join Zoom Meeting</span>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </a>

        <button
          onClick={() => onCopy(booking.zoomDetails.joinUrl, booking.id)}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
          title="Copy Zoom Join URL"
        >
          {copiedId === booking.id ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleExpand}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
          title="Toggle Details & Passcode"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>

    {/* Expanded Details Strip */}
    {isExpanded && (
      <div className="px-5 pb-5 pt-3 border-t border-gray-100 bg-[#F7F9FA] space-y-4 text-xs animate-in fade-in duration-150">

        {/* Booker Info */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-1.5">
          <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Booked By</span>
          <div className="flex items-start flex-wrap gap-x-1.5 gap-y-1 text-gray-900">
            <span className="flex items-center gap-1 shrink-0 font-medium">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {booking.participantName}
            </span>
            <span className="text-gray-500 break-all">({booking.participantEmail})</span>
          </div>
          {booking.participantCompany && (
            <div className="flex items-center gap-1 text-gray-500">
              <Building className="w-3.5 h-3.5 text-gray-400" />
              {booking.participantCompany}
            </div>
          )}
        </div>

        {/* Zoom Meeting Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
          <div>
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Zoom Meeting ID:</span>
            <div className="font-mono font-bold text-gray-900 mt-0.5">{booking.zoomDetails.meetingId}</div>
          </div>
          <div>
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Zoom Passcode:</span>
            <div className="font-mono font-bold text-gray-900 mt-0.5">{booking.zoomDetails.passcode}</div>
          </div>
        </div>

        {booking.zoomDetails.recordingUrl && (
          <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100">
            <a
              href={booking.zoomDetails.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[#0b5cff] hover:underline font-semibold cursor-pointer"
            >
              <PlayCircle className="w-4 h-4" />
              View Cloud Recording
            </a>
          </div>
        )}

        {/* Custom Intake Form Answers */}
        {booking.answers && Object.keys(booking.answers).length > 0 && (
          <div>
            <div className="space-y-2">
              {Object.entries(booking.answers).map(([qKey, ans]) => (
                <div key={qKey} className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                    {getQuestionLabel(booking, qKey)}
                  </div>
                  <span className="text-gray-900">{String(ans)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Action */}
        {booking.status === 'confirmed' && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                if (confirm('Cancel this meeting and free up the slot in Microsoft 365 calendar?')) {
                  onCancelBooking(booking.id);
                }
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel Meeting</span>
            </button>
          </div>
        )}

      </div>
    )}
  </div>
);

export const HostBookingsView: React.FC<HostBookingsViewProps> = ({
  bookings,
  meetingTypes = [],
  isAdmin = false,
  currentUserEmail,
  onCancelBooking,
  onCancelAllMine,
  onNavigateToSchedule,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [confirmCancelAll, setConfirmCancelAll] = useState(false);
  const [showCancelledSection, setShowCancelledSection] = useState(false);

  // "Cancel All My Bookings" only ever cancels the caller's own bookings
  // server-side (matched by participantEmail), regardless of admin status -
  // so its count/label must reflect that too, not the admin's full-system
  // `bookings` list, or the confirm dialog would misstate how many meetings
  // are actually about to be cancelled.
  const normalizedCurrentUserEmail = (currentUserEmail || '').toLowerCase().trim();
  const myActiveCount = bookings.filter(
    (b) => b.status !== 'cancelled' && (b.participantEmail || '').toLowerCase().trim() === normalizedCurrentUserEmail
  ).length;

  const handleCancelAllMine = async () => {
    if (!onCancelAllMine) return;
    if (!confirmCancelAll) {
      setConfirmCancelAll(true);
      return;
    }
    setIsCancellingAll(true);
    try {
      await onCancelAllMine();
    } finally {
      setIsCancellingAll(false);
      setConfirmCancelAll(false);
    }
  };

  const getQuestionLabel = (booking: Booking, questionId: string): string => {
    const meetingType = meetingTypes.find((m) => m.id === booking.meetingTypeId);
    return meetingType?.customQuestions.find((q) => q.id === questionId)?.label || questionId;
  };

  const matchesSearch = (b: Booking) =>
    b.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.participantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.meetingTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.zoomDetails.meetingId.includes(searchTerm);

  // Cancelled meetings are archived out of the main list into their own
  // collapsible section below, instead of cluttering the active schedule -
  // both lists still honor the search box.
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled' && matchesSearch(b));
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled' && matchesSearch(b));

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">
                {isAdmin ? 'All Scheduled Zoom Meetings' : 'My Booked Meetings'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 bg-blue-50 text-[#0b5cff] border border-blue-100">
                {bookings.length} {isAdmin ? 'Total System' : 'Booked'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isAdmin
                ? 'Admin directory view: Complete organizational visibility across all hosts, attendees, and M365 Exchange calendars.'
                : 'Your personal meeting schedule. Only meetings booked under your account are displayed here.'}
            </p>
          </div>

          {onCancelAllMine && myActiveCount > 0 && (
            <button
              type="button"
              onClick={handleCancelAllMine}
              disabled={isCancellingAll}
              onBlur={() => setConfirmCancelAll(false)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
                confirmCancelAll
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isCancellingAll
                  ? 'Cancelling...'
                  : confirmCancelAll
                  ? `Confirm: cancel all ${myActiveCount}?`
                  : `Cancel All My Bookings (${myActiveCount})`}
              </span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isAdmin ? "Search attendee, host, ID..." : "Search title or meeting ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 bg-[#F0F2F4] border-none rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
          />
        </div>
      </div>

      {/* Active Bookings List */}
      {activeBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">
            {searchTerm ? 'No matching meetings found' : isAdmin ? 'No scheduled meetings in system' : 'You have no booked meetings yet'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Try adjusting your search criteria or filter options.'
              : isAdmin
                ? 'No Zoom sessions have been booked across the organization yet.'
                : 'When you book a session using the Schedule tab, your meeting details and Zoom join links will appear here.'}
          </p>
          {onNavigateToSchedule && !searchTerm && (
            <button
              onClick={onNavigateToSchedule}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Go to Schedule</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {activeBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isExpanded={expandedBookingId === booking.id}
              onToggleExpand={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
              copiedId={copiedId}
              onCopy={handleCopy}
              onCancelBooking={onCancelBooking}
              getQuestionLabel={getQuestionLabel}
            />
          ))}
        </div>
      )}

      {/* Canceled Meetings - archived out of the way, collapsed by default */}
      {cancelledBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCancelledSection((v) => !v)}
            className="w-full flex items-center justify-between gap-3 p-5 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                <Archive className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-bold text-gray-900 text-sm">Canceled Meetings</span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                  {cancelledBookings.length}
                </span>
              </div>
            </div>
            {showCancelledSection ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {showCancelledSection && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
              {cancelledBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isExpanded={expandedBookingId === booking.id}
                  onToggleExpand={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onCancelBooking={onCancelBooking}
                  getQuestionLabel={getQuestionLabel}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { CalendarX2, Clock, Users, Video, CalendarMinus, AlertTriangle, Loader2, X } from 'lucide-react';
import { Booking } from '../types';

interface CancelMeetingDialogProps {
  booking: Booking;
  // Rejects with an Error whose message is shown inline, so a failed
  // cancellation keeps the dialog open instead of vanishing behind an alert().
  onConfirm: (bookingId: string) => Promise<void>;
  onClose: () => void;
}

// Replaces the browser's bare confirm() for cancelling a meeting: shows
// which meeting is about to go, spells out what cancelling actually does
// (Zoom meeting deleted, Outlook event removed), and keeps "Keep meeting"
// as the safe default so a stray Enter doesn't cancel anything.
export const CancelMeetingDialog: React.FC<CancelMeetingDialogProps> = ({ booking, onConfirm, onClose }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCancelling) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCancelling, onClose]);

  const handleConfirm = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      await onConfirm(booking.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while cancelling the meeting.');
      setIsCancelling(false);
    }
  };

  const dateLabel = new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timezoneLabel = booking.timezone.split('/')[1]?.replace('_', ' ') || booking.timezone;
  const inviteeCount = booking.guestEmails?.length || 0;
  const isOnOutlook = booking.m365SyncStatus === 'synced';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={() => !isCancelling && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-meeting-title"
        aria-describedby="cancel-meeting-description"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <CalendarX2 className="w-5.5 h-5.5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            aria-label="Close"
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 id="cancel-meeting-title" className="text-base font-bold text-gray-900">
            Cancel this meeting?
          </h3>
          <p id="cancel-meeting-description" className="text-sm text-gray-500 mt-1.5">
            This can&apos;t be undone. You&apos;ll need to book a new meeting if you change your mind.
          </p>
        </div>

        {/* The meeting being cancelled */}
        <div className="rounded-xl border border-gray-200 bg-[#F7F9FA] p-4 space-y-2">
          <div className="font-bold text-gray-900 text-sm">{booking.meetingTitle}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span>
              {dateLabel} · {booking.timeSlot} ({timezoneLabel}) · {booking.duration} mins
            </span>
          </div>
          {inviteeCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Users className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>
                {inviteeCount} {inviteeCount === 1 ? 'invitee' : 'invitees'}
              </span>
            </div>
          )}
        </div>

        {/* What cancelling actually does */}
        <ul className="space-y-2 text-xs text-gray-600">
          <li className="flex items-start gap-2">
            <Video className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
            <span>The Zoom meeting is deleted and its join link stops working.</span>
          </li>
          {isOnOutlook && (
            <li className="flex items-start gap-2">
              <CalendarMinus className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
              <span>The event is removed from the Microsoft 365 calendar, freeing up the time slot.</span>
            </li>
          )}
        </ul>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <button
            ref={keepButtonRef}
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-sm font-bold transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0433FF]/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep meeting
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isCancelling}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cancelling&hellip;
              </>
            ) : error ? (
              'Try again'
            ) : (
              'Cancel meeting'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

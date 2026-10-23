import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import {
  CheckCircle2,
  Video,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Phone,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  CalendarPlus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Bell,
  BellOff,
  PlayCircle,
  CalendarX2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Booking, ZoomMeetingConfig } from '../types';
import { downloadIcsFile, getOutlookWebCalendarUrl, getM365EnterpriseCalendarUrl, getGoogleCalendarUrl } from '../utils/calendar';
import { enablePushNotifications, disablePushNotifications } from '../utils/pushSubscription';
import { CancelMeetingDialog } from './CancelMeetingDialog';
import { AppleIcon, GoogleCalendarIcon, MicrosoftOutlookIcon } from './CalendarProviderIcons';
import { useResetTimer } from '../utils/useResetTimer';

// Only opened on demand (a meeting's settings), so loaded on first open
// rather than shipped in the initial bundle.
const ZoomMeetingDetailsModal = lazy(() =>
  import('./ZoomMeetingDetailsModal').then((m) => ({ default: m.ZoomMeetingDetailsModal }))
);

interface BookingConfirmationProps {
  booking: Booking;
  onBookAnother: () => void;
  onViewMeetings?: () => void;
  onCancelMeeting?: (bookingId: string) => Promise<void>;
  // savedBooking is the server's full copy after the PATCH (invitees, host
  // key etc. included), so the parent can store it instead of re-patching only
  // zoomConfig onto its stale copy - which this component would then sync back.
  onUpdateBookingConfig?: (updatedConfig: ZoomMeetingConfig, savedBooking?: Booking) => Promise<void> | void;
  authHeaders?: Record<string, string>;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onBookAnother,
  onViewMeetings,
  onCancelMeeting,
  onUpdateBookingConfig,
  authHeaders = {},
}) => {
  const [currentBooking, setCurrentBooking] = useState<Booking>(booking);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const scheduleCopiedReset = useResetTimer();
  const [showDialIn, setShowDialIn] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [showHostKey, setShowHostKey] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [pushState, setPushState] = useState<'idle' | 'enabling' | 'enabled' | 'error'>('idle');
  const [pushError, setPushError] = useState<string | null>(null);
  const [showAddToCalendarMenu, setShowAddToCalendarMenu] = useState(false);
  const addToCalendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddToCalendarMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addToCalendarRef.current && !addToCalendarRef.current.contains(e.target as Node)) {
        setShowAddToCalendarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddToCalendarMenu]);

  useEffect(() => {
    setCurrentBooking(booking);
  }, [booking]);

  // Fire celebration confetti once, when the confirmation first appears -
  // not again every time the booking object changes (saving settings,
  // cancelling the meeting).
  useEffect(() => {
    // Loaded on demand - it's only ever used here, once per booking.
    import('canvas-confetti')
      .then(({ default: confetti }) => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }))
      .catch(() => {
        // ignore - purely decorative
      });
  }, []);

  useEffect(() => {
    // Countdown calculation
    const calcCountdown = () => {
      const start = new Date(booking.startTimeIso).getTime();
      const now = Date.now();
      const diff = start - now;

      if (diff <= 0) {
        setCountdown('Meeting starting now or in progress!');
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${days > 0 ? `${days}d ` : ''}${hours}h ${mins}m`);
      }
    };

    calcCountdown();
    const interval = setInterval(calcCountdown, 30000);
    return () => clearInterval(interval);
  }, [booking.startTimeIso]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    scheduleCopiedReset(() => setCopiedField(null), 2000);
  };

  const handleSaveConfig = async (updatedConfig: ZoomMeetingConfig, sendHostKey: boolean) => {
    try {
      const res = await fetch(`/api/bookings/${currentBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          zoomConfig: updatedConfig,
          guestEmails: updatedConfig.invitees,
          sendHostKey,
        }),
      });
      let savedBooking: Booking | undefined;
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          savedBooking = data.data;
          setCurrentBooking(data.data);
        }
      }
      if (onUpdateBookingConfig) {
        await onUpdateBookingConfig(updatedConfig, savedBooking);
      }
      setIsEditModalOpen(false);
    } catch (e) {
      console.error('Failed to update booking config:', e);
    }
  };

  // Org members (same email domain as the host) get a direct deep link into
  // the organization's own Outlook/Exchange calendar (outlook.office.com);
  // everyone else gets the generic public Outlook Web compose link instead.
  const participantDomain = currentBooking.participantEmail.split('@')[1]?.toLowerCase();
  const hostDomain = currentBooking.hostEmail.split('@')[1]?.toLowerCase();
  const isOrgMember = Boolean(participantDomain && hostDomain && participantDomain === hostDomain);
  const outlookCalendarUrl = isOrgMember
    ? getM365EnterpriseCalendarUrl(currentBooking)
    : getOutlookWebCalendarUrl(currentBooking);

  const handleEnablePush = async () => {
    setPushState('enabling');
    setPushError(null);
    const result = await enablePushNotifications(currentBooking.participantEmail, authHeaders);
    if (result.status === 'subscribed') {
      setPushState('enabled');
    } else {
      setPushState('error');
      setPushError(
        result.status === 'unsupported'
          ? 'Your browser does not support push notifications.'
          : result.status === 'permission_denied'
          ? 'Notification permission was denied.'
          : result.status === 'not_configured'
          ? 'Push notifications are not configured on this server.'
          : result.message
      );
    }
  };

  const handleDisablePush = async () => {
    await disablePushNotifications(authHeaders);
    setPushState('idle');
  };

  const copyInvitation = () => {
    const cfg = currentBooking.zoomConfig;
    const lines = [
      `${currentBooking.hostName} is inviting you to a scheduled Zoom meeting.`,
      '',
      `Topic: ${currentBooking.meetingTitle}`,
      `Time: ${currentBooking.date} ${currentBooking.timeSlot} (${currentBooking.timezone})`,
      '',
      `Join Zoom Meeting`,
      currentBooking.zoomDetails.joinUrl,
      '',
      `Meeting ID: ${currentBooking.zoomDetails.formattedMeetingId}`,
      cfg?.passcodeEnabled !== false ? `Passcode: ${currentBooking.zoomDetails.passcode}` : undefined,
    ].filter(Boolean);
    copyToClipboard(lines.join('\n'), 'invitation');
  };

  const isCancelled = currentBooking.status === 'cancelled';
  const emailFailed = !currentBooking.reminders?.emailSent;
  const outlookFailed = currentBooking.m365SyncStatus === 'failed';
  // The raw reasons, once each - the two confirmation emails often fail for
  // the same reason, and the Outlook event usually shares it too.
  const failureDetails = Array.from(
    new Set(
      [emailFailed ? currentBooking.reminders?.emailError : undefined, outlookFailed ? currentBooking.m365SyncError : undefined]
        .flatMap((msg) => (msg ? msg.split(/(?<=\.)\s+/) : []))
        .map((msg) => msg.trim())
        .filter(Boolean)
    )
  ).join(' ');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Banner - success, or the cancelled state once the meeting is gone */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8 text-center relative overflow-hidden">
        {isCancelled ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
              <CalendarX2 className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold mb-2">
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancelled</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Meeting cancelled
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-lg mx-auto">
              The Zoom meeting was deleted, so its join link no longer works. Book a new meeting if you still need one.
            </p>
          </>
        ) : (
          <>
        <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 border border-green-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>You are scheduled!</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Zoom Meeting Confirmed
        </h1>

        {currentBooking.reminders?.emailSent && (
          <p className="text-sm text-gray-600 mt-2 max-w-lg mx-auto">
            A confirmation email with your join link, meeting ID, and passcode has been sent to{' '}
            <strong className="text-gray-900">{booking.participantEmail}</strong>.
          </p>
        )}

        {/* What didn't go out, each with its own way to recover - the Zoom
            meeting itself exists either way. */}
        {(emailFailed || outlookFailed) && (
          <div role="status" className="mt-4 max-w-lg mx-auto text-left rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {emailFailed && outlookFailed
                  ? "Your meeting is booked, but nobody has been notified yet"
                  : emailFailed
                    ? "Your meeting is booked, but the confirmation email wasn't sent"
                    : "Your meeting is booked, but the Outlook invite wasn't created"}
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {emailFailed && (
                <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-gray-700">
                    <strong className="text-gray-900">Confirmation email not sent.</strong> Copy the invitation and send it to your invitees yourself.
                  </span>
                  <button
                    type="button"
                    onClick={copyInvitation}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {copiedField === 'invitation' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'invitation' ? 'Copied' : 'Copy invitation'}</span>
                  </button>
                </li>
              )}
              {outlookFailed && (
                <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-gray-700">
                    <strong className="text-gray-900">Outlook invite not created.</strong> It isn't on your calendar or your invitees' yet. Add it to Outlook and invite them from there.
                  </span>
                  <a
                    href={outlookCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Add to Outlook</span>
                  </a>
                </li>
              )}
            </ul>
            {failureDetails && (
              <p className="mt-3 pt-3 border-t border-amber-200 text-[11px] text-gray-500">
                Details for ICT: {failureDetails}
              </p>
            )}
          </div>
        )}

        {currentBooking.zoomConfig?.alternativeHosts === currentBooking.participantEmail && (
          <p className="text-xs text-gray-500 mt-1.5">
            You've been set as an alternative host on this meeting - if you have a licensed seat on
            this Zoom account, you can start or manage it directly. If not, this has no effect.
          </p>
        )}

        {currentBooking.zoomConfig?.alternativeHosts &&
          currentBooking.zoomConfig.alternativeHosts !== currentBooking.participantEmail && (
            <p className="text-xs text-gray-500 mt-1.5">
              <strong>{currentBooking.zoomConfig.alternativeHosts}</strong> was nominated as this
              meeting's host - they've been added to the invitees below and sent the confirmation
              email (with the Host Key, if Zoom won't let them start it directly).
            </p>
          )}

        {/* Meeting Countdown Bar */}
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#0433FF] border border-blue-200 rounded-full text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Meeting countdown: {countdown}</span>
        </div>

        {/* Real Push Notification Opt-in */}
        <div className="mt-4">
          {pushState === 'enabled' ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications enabled for this browser</span>
              <button
                type="button"
                onClick={handleDisablePush}
                className="ml-1 pl-2 border-l border-green-300 text-green-600 hover:text-green-800 hover:underline cursor-pointer"
              >
                Turn off
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushState === 'enabling'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {pushState === 'enabling' ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Get a browser notification before this meeting</span>
                </>
              )}
            </button>
          )}
          {pushState === 'error' && pushError && (
            <p className="text-xs text-red-500 mt-1.5">{pushError}</p>
          )}
        </div>
          </>
        )}
      </div>

      {/* Main Zoom Join & Credentials Hub */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Zoom Blue Ribbon */}
        <div className={`${isCancelled ? 'bg-gray-500' : 'bg-[#0433FF]'} text-white px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{currentBooking.meetingTitle}</h2>
              <p className={`text-xs ${isCancelled ? 'text-gray-100' : 'text-blue-100'}`}>
                {isCancelled ? 'Cancelled' : `Hosted by ${currentBooking.hostName}`} • {currentBooking.duration} Minutes
              </p>
            </div>
          </div>

          {/* Quick Launch Zoom Action */}
          {!isCancelled && (
          <div className="flex items-center gap-2">
            <a
              href={currentBooking.zoomDetails.joinUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-white text-[#0433FF] font-bold text-xs hover:bg-blue-50 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Join Zoom Meeting</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          )}
        </div>

        {/* Read-only Manage Meeting summary - matches Zoom's own post-schedule view */}
        <div className="divide-y divide-gray-100">

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Topic</span>
            <span className="text-gray-900 font-semibold">{currentBooking.meetingTitle}</span>
          </div>

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Time</span>
            <span className="text-gray-900">
              {currentBooking.date} {currentBooking.timeSlot} <span className="text-gray-500">({currentBooking.timezone})</span>
            </span>
          </div>

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Meeting ID</span>
            <span className="text-gray-900 font-mono">{currentBooking.zoomDetails.formattedMeetingId}</span>
          </div>

          {currentBooking.zoomDetails.hostKey && (
            <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm bg-amber-50/60">
              <span className="text-gray-500 font-medium">Host Key</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-900">
                  <span className="font-mono">{showHostKey ? currentBooking.zoomDetails.hostKey : '•'.repeat(currentBooking.zoomDetails.hostKey.length)}</span>
                  <button
                    type="button"
                    onClick={() => setShowHostKey(!showHostKey)}
                    className="text-[#0433FF] hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {showHostKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showHostKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-amber-800">
                  If nobody has host controls yet, use Participants → Claim Host in Zoom and enter this key. Works regardless of your Zoom license.
                </p>
              </div>
            </div>
          )}

          {currentBooking.zoomDetails.recordingUrl && (
            <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm bg-blue-50/60">
              <span className="text-gray-500 font-medium">Recording</span>
              <a
                href={currentBooking.zoomDetails.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 w-fit text-[#0433FF] hover:underline font-semibold cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                View Cloud Recording
              </a>
            </div>
          )}

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Security</span>
            <div className="space-y-1.5">
              {currentBooking.zoomConfig?.passcodeEnabled !== false && (
                <div className="flex items-center gap-2 text-gray-900">
                  <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span>Passcode</span>
                  <span className="font-mono">{showPasscode ? currentBooking.zoomDetails.passcode : '•'.repeat(currentBooking.zoomDetails.passcode.length)}</span>
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="text-[#0433FF] hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPasscode ? 'Hide' : 'Show'}
                  </button>
                </div>
              )}
              {currentBooking.zoomConfig?.waitingRoom !== false && (
                <div className="flex items-center gap-2 text-gray-900">
                  <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span>Everyone goes into the waiting room</span>
                </div>
              )}
              {currentBooking.zoomConfig?.requireAuth && (
                <div className="flex items-center gap-2 text-gray-900">
                  <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span>Only authenticated users can join: Sign in to Zoom</span>
                </div>
              )}
            </div>
          </div>

          {currentBooking.zoomConfig?.alternativeHosts &&
            currentBooking.zoomConfig.alternativeHosts !== currentBooking.participantEmail && (
              <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
                <span className="text-gray-500 font-medium">Meeting Host</span>
                <span className="text-gray-900">{currentBooking.zoomConfig.alternativeHosts}</span>
              </div>
            )}

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Invitees</span>
            <span className="text-gray-900">
              {currentBooking.guestEmails.length > 0 ? currentBooking.guestEmails.join(', ') : <span className="text-gray-500">None</span>}
            </span>
          </div>

          {!isCancelled && (
          <>
          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Invite Link</span>
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={currentBooking.zoomDetails.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#0433FF] hover:underline font-mono text-xs truncate"
              >
                {currentBooking.zoomDetails.joinUrl}
              </a>
              <button
                onClick={() => copyToClipboard(currentBooking.zoomDetails.joinUrl, 'joinUrl')}
                className="text-gray-500 hover:text-gray-700 shrink-0 cursor-pointer"
                title="Copy invite link"
              >
                {copiedField === 'joinUrl' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Add to</span>
            <div className="relative inline-block" ref={addToCalendarRef}>
              <button
                type="button"
                onClick={() => setShowAddToCalendarMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-800 cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-gray-600" />
                <span>Add to Calendar</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showAddToCalendarMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAddToCalendarMenu && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                  <button
                    type="button"
                    onClick={() => {
                      downloadIcsFile(currentBooking);
                      setShowAddToCalendarMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-left cursor-pointer"
                  >
                    <div className="w-5 h-5 text-gray-900 flex items-center justify-center shrink-0">
                      <AppleIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-gray-800">Apple Calendar</span>
                  </button>
                  <a
                    href={getGoogleCalendarUrl(currentBooking)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowAddToCalendarMenu(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-left cursor-pointer border-t border-gray-100"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <GoogleCalendarIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-800">Google Calendar</span>
                  </a>
                  <a
                    href={outlookCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowAddToCalendarMenu(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-left cursor-pointer border-t border-gray-100"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <MicrosoftOutlookIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-800">
                      Microsoft 365 {isOrgMember && <span className="text-[#0433FF]">(Organization)</span>}
                    </span>
                  </a>
                </div>
              )}
            </div>
          </div>
          </>
          )}

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Encryption</span>
            <span className="text-green-700 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {currentBooking.zoomDetails.encryption}
            </span>
          </div>

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Video</span>
            <span className="text-gray-900">
              Host <span className="font-semibold">{currentBooking.zoomConfig?.hostVideo === false ? 'off' : 'on'}</span>
              {', '}Participant <span className="font-semibold">{currentBooking.zoomConfig?.participantVideo === false ? 'off' : 'on'}</span>
            </span>
          </div>

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Audio</span>
            <span className="text-gray-900">
              {{
                telephone: 'Telephone',
                computer: 'Computer Audio',
                both: 'Telephone and Computer Audio',
                third_party: '3rd Party Audio',
              }[currentBooking.zoomConfig?.audioOption || 'both']}
            </span>
          </div>

          {(currentBooking.zoomConfig?.joinAnytime ||
            currentBooking.zoomConfig?.muteOnEntry ||
            currentBooking.zoomConfig?.autoRecord) && (
            <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
              <span className="text-gray-500 font-medium">Options</span>
              <div className="space-y-1 text-gray-900">
                {currentBooking.zoomConfig?.joinAnytime && <div>Allow participants to join anytime</div>}
                {currentBooking.zoomConfig?.muteOnEntry && <div>Mute participants upon entry</div>}
                {currentBooking.zoomConfig?.autoRecord && <div>Automatically record meeting to the cloud</div>}
              </div>
            </div>
          )}

          {/* Dial-in numbers collapsible */}
          <div>
            <button
              onClick={() => setShowDialIn(!showDialIn)}
              className="w-full px-6 sm:px-8 py-3.5 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs font-bold text-gray-700 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0433FF]" />
                International Phone Dial-in &amp; SIP/H.323 System Addresses
              </span>
              {showDialIn ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDialIn && (
              <div className="p-4 sm:px-8 bg-white text-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentBooking.zoomDetails.dialInNumbers.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">{d.city} ({d.country})</span>
                      <span className="font-mono text-gray-900">{d.number}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg text-gray-700 font-mono text-[11px] space-y-1">
                  <div><strong>SIP:</strong> {currentBooking.zoomDetails.sipAddress}</div>
                  <div><strong>H.323:</strong> {currentBooking.zoomDetails.h323Address}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar. Joining lives in the ribbon above (there's no
            separate "Start": non-hosts can't start a meeting, and it opened
            the same join link), so these are the booker's management actions. */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isCancelled && (
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2.5">
            <button
              onClick={copyInvitation}
              className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedField === 'invitation' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'invitation' ? 'Copied' : 'Copy Invitation'}</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            {onCancelMeeting && (
              <button
                onClick={() => setIsCancelDialogOpen(true)}
                className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel meeting</span>
              </button>
            )}
          </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={onBookAnother}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isCancelled
                  ? 'bg-[#0433FF] hover:bg-[#0320AF] text-white shadow-xs'
                  : 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-800'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCancelled ? 'text-white' : 'text-gray-600'}`} />
              <span>Book another meeting</span>
            </button>

            {onViewMeetings && (
              <button
                onClick={onViewMeetings}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isCancelled
                    ? 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-800'
                    : 'bg-[#0433FF] hover:bg-[#0320AF] text-white shadow-xs'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View my meetings</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {isEditModalOpen && (
        <Suspense fallback={null}>
          <ZoomMeetingDetailsModal
            booking={currentBooking}
            initialConfig={currentBooking.zoomConfig}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveConfig}
          />
        </Suspense>
      )}

      {isCancelDialogOpen && onCancelMeeting && (
        <CancelMeetingDialog
          booking={currentBooking}
          onConfirm={onCancelMeeting}
          onClose={() => setIsCancelDialogOpen(false)}
        />
      )}

    </div>
  );
};

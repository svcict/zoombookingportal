import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Video,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Download,
  Phone,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Bell,
  BellOff
} from 'lucide-react';
import { Booking, ZoomMeetingConfig } from '../types';
import { downloadIcsFile, getOutlookWebCalendarUrl, getM365EnterpriseCalendarUrl, getGoogleCalendarUrl } from '../utils/calendar';
import { enablePushNotifications } from '../utils/pushSubscription';
import { ZoomMeetingDetailsModal } from './ZoomMeetingDetailsModal';

interface BookingConfirmationProps {
  booking: Booking;
  onBookAnother: () => void;
  onViewMeetings?: () => void;
  onCancelMeeting?: (bookingId: string) => void;
  onUpdateBookingConfig?: (updatedConfig: ZoomMeetingConfig) => Promise<void> | void;
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
  const [showDialIn, setShowDialIn] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [showHostKey, setShowHostKey] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [pushState, setPushState] = useState<'idle' | 'enabling' | 'enabled' | 'error'>('idle');
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentBooking(booking);
  }, [booking]);

  useEffect(() => {
    // Fire celebration confetti on initial render
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

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
  }, [booking]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveConfig = async (updatedConfig: ZoomMeetingConfig) => {
    try {
      const res = await fetch(`/api/bookings/${currentBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ zoomConfig: updatedConfig, guestEmails: updatedConfig.invitees }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setCurrentBooking(data.data);
        }
      }
      if (onUpdateBookingConfig) {
        await onUpdateBookingConfig(updatedConfig);
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
    const result = await enablePushNotifications(currentBooking.participantEmail);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Success Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8 text-center relative overflow-hidden">
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

        <p className="text-sm text-gray-600 mt-2 max-w-lg mx-auto">
          {currentBooking.reminders?.emailSent ? (
            <>
              A confirmation email with your join link, meeting ID, and passcode has been sent to{' '}
              <strong className="text-gray-900">{booking.participantEmail}</strong>.
            </>
          ) : (
            <span className="text-amber-700">
              The confirmation email to <strong>{booking.participantEmail}</strong> could not be sent
              {currentBooking.reminders?.emailError ? `: ${currentBooking.reminders.emailError}` : '.'} Please share the join details below directly.
            </span>
          )}
        </p>

        {currentBooking.m365SyncStatus === 'failed' && (
          <p className="text-xs text-amber-700 mt-1.5">
            The Outlook calendar invite could not be created{currentBooking.m365SyncError ? `: ${currentBooking.m365SyncError}` : '.'}
          </p>
        )}

        {currentBooking.zoomConfig?.alternativeHosts === currentBooking.participantEmail && (
          <p className="text-xs text-gray-500 mt-1.5">
            You've been set as an alternative host on this meeting - if you have a licensed seat on
            this Zoom account, you can start or manage it directly. If not, this has no effect.
          </p>
        )}

        {/* Meeting Countdown Bar */}
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#0b5cff] border border-blue-200 rounded-full text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Meeting countdown: {countdown}</span>
        </div>

        {/* Real Push Notification Opt-in */}
        <div className="mt-4">
          {pushState === 'enabled' ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications enabled for this browser</span>
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
      </div>

      {/* Main Zoom Join & Credentials Hub */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Zoom Blue Ribbon */}
        <div className="bg-[#0b5cff] text-white px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{currentBooking.meetingTitle}</h2>
              <p className="text-xs text-blue-100">
                Hosted by {currentBooking.hostName} • {currentBooking.duration} Minutes
              </p>
            </div>
          </div>

          {/* Quick Launch Zoom Action */}
          <div className="flex items-center gap-2">
            <a
              href={currentBooking.zoomDetails.joinUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-white text-[#0b5cff] font-bold text-xs hover:bg-blue-50 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Join Zoom Meeting</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
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
                    className="text-[#0b5cff] hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
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
                    className="text-[#0b5cff] hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
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

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Invitees</span>
            <span className="text-gray-900">
              {currentBooking.guestEmails.length > 0 ? currentBooking.guestEmails.join(', ') : <span className="text-gray-400">None</span>}
            </span>
          </div>

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Invite Link</span>
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={currentBooking.zoomDetails.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#0b5cff] hover:underline font-mono text-xs truncate"
              >
                {currentBooking.zoomDetails.joinUrl}
              </a>
              <button
                onClick={() => copyToClipboard(currentBooking.zoomDetails.joinUrl, 'joinUrl')}
                className="text-gray-400 hover:text-gray-700 shrink-0 cursor-pointer"
                title="Copy invite link"
              >
                {copiedField === 'joinUrl' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 text-sm">
            <span className="text-gray-500 font-medium">Add to</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={outlookCalendarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg text-xs font-semibold text-gray-800 cursor-pointer"
              >
                <div className="w-4 h-4 rounded bg-[#0078D4] text-white flex items-center justify-center text-[9px] font-bold">O</div>
                <span>Outlook Calendar {isOrgMember && <span className="text-[#0b5cff]">(Organization)</span>}</span>
              </a>
              <a
                href={getGoogleCalendarUrl(currentBooking)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg text-xs font-semibold text-gray-800 cursor-pointer"
              >
                <div className="w-4 h-4 rounded bg-red-500 text-white flex items-center justify-center text-[9px] font-bold">G</div>
                <span>Google Calendar</span>
              </a>
              <button
                onClick={() => downloadIcsFile(currentBooking)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg text-xs font-semibold text-gray-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                <span>Other (.ics)</span>
              </button>
            </div>
          </div>

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
                {currentBooking.zoomConfig?.autoRecord && <div>Automatically record meeting on the local computer</div>}
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
                <Phone className="w-4 h-4 text-[#0b5cff]" />
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

        {/* Bottom Actions Bar - matches Zoom's Start / Copy Invitation / Edit / Delete */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <a
              href={currentBooking.zoomDetails.joinUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start</span>
            </a>
            <button
              onClick={copyInvitation}
              className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedField === 'invitation' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'invitation' ? 'Copied' : 'Copy Invitation'}</span>
            </button>
            {currentBooking.status !== 'cancelled' && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {onCancelMeeting && currentBooking.status !== 'cancelled' && (
              <button
                onClick={() => onCancelMeeting(currentBooking.id)}
                className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={onBookAnother}
              className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
              <span>Schedule Another Meeting</span>
            </button>

            {onViewMeetings && (
              <button
                onClick={onViewMeetings}
                className="px-5 py-2.5 bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View My Scheduled Meetings</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {isEditModalOpen && (
        <ZoomMeetingDetailsModal
          booking={currentBooking}
          initialConfig={currentBooking.zoomConfig}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveConfig}
        />
      )}

    </div>
  );
};

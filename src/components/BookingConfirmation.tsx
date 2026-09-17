import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Video, 
  Calendar, 
  Clock, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  Mail, 
  Bell, 
  BellRing, 
  Download, 
  Phone, 
  ShieldCheck, 
  Share2, 
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { Booking, ZoomMeetingConfig } from '../types';
import { downloadIcsFile, getOutlookWebCalendarUrl, getM365EnterpriseCalendarUrl, getGoogleCalendarUrl } from '../utils/calendar';
import { sendBrowserPushNotification, playZoomNotificationSound, requestPushPermission } from '../utils/notifications';
import { ZoomMeetingDetailsModal } from './ZoomMeetingDetailsModal';

interface BookingConfirmationProps {
  booking: Booking;
  onBookAnother: () => void;
  onViewMeetings?: () => void;
  onCancelMeeting?: (bookingId: string) => void;
  onUpdateBookingConfig?: (updatedConfig: ZoomMeetingConfig) => Promise<void> | void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onBookAnother,
  onViewMeetings,
  onCancelMeeting,
  onUpdateBookingConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'credentials'>('details');
  const [currentBooking, setCurrentBooking] = useState<Booking>(booking);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showDialIn, setShowDialIn] = useState(false);
  const [reminderFired, setReminderFired] = useState(false);
  const [countdown, setCountdown] = useState<string>('');

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

  const handleTestPushReminder = async () => {
    const permission = await requestPushPermission();
    if (permission === 'granted') {
      sendBrowserPushNotification(`Zoom Meeting in 15 Minutes: ${booking.meetingTitle}`, {
        body: `Host: ${booking.hostName} • ID: ${booking.zoomDetails.meetingId}\nClick to join directly.`,
      });
      setReminderFired(true);
      setTimeout(() => setReminderFired(false), 5000);
    } else {
      // In-app alert fallback
      playZoomNotificationSound('chime');
      setReminderFired(true);
      setTimeout(() => setReminderFired(false), 5000);
    }
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
          An automated confirmation email and Microsoft 365 calendar invite have been dispatched to{' '}
          <strong className="text-gray-900">{booking.participantEmail}</strong>.
        </p>

        {/* Meeting Countdown Bar */}
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#0b5cff] border border-blue-200 rounded-full text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Meeting countdown: {countdown}</span>
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

        {/* View Tabs: Zoom Meeting Details (Replicating User Images) vs Quick Access */}
        <div className="flex border-b border-gray-200 bg-[#f8fafc] px-6 sm:px-8 pt-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'details'
                ? 'border-[#0b5cff] text-[#0b5cff]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Meeting Details (Zoom Web UI)</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-[#0b5cff] text-[10px] font-bold">
              Configured
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'credentials'
                ? 'border-[#0b5cff] text-[#0b5cff]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Join Credentials &amp; Calendars</span>
          </button>
        </div>

        {/* TAB 1: Zoom Meeting Details (Replicated Exactly from Images 1-4) */}
        {activeTab === 'details' ? (
          <div className="p-4 sm:p-6 bg-white">
            <ZoomMeetingDetailsModal
              isInlineCard={true}
              booking={currentBooking}
              initialConfig={currentBooking.zoomConfig}
              onSave={async (updatedConfig) => {
                try {
                  const res = await fetch(`/api/bookings/${currentBooking.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zoomConfig: updatedConfig }),
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
                } catch (e) {
                  console.error('Failed to update booking config:', e);
                }
              }}
            />
          </div>
        ) : (
          /* TAB 2: Quick Credentials & Calendar Links */
          <div className="p-6 sm:p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-gray-100 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Date &amp; Time</div>
                  <div className="font-bold text-gray-900">{currentBooking.date}</div>
                  <div className="text-xs text-[#0b5cff] font-bold">{currentBooking.timeSlot}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Time Zone</div>
                  <div className="font-bold text-gray-900 truncate max-w-[170px]">
                    {currentBooking.timezone}
                  </div>
                  <div className="text-xs text-gray-500">Auto-converted seamlessly</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Microsoft 365 Sync</div>
                  <div className="font-bold text-green-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Synced with Exchange
                  </div>
                  <div className="text-xs text-gray-500">Conflicts actively blocked</div>
                </div>
              </div>
            </div>

            {/* Zoom Meeting Credentials Box */}
            <div className="bg-[#F7F9FA] rounded-2xl p-5 border border-gray-200 space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Zoom Video Access Credentials
                </span>
                <span className="text-xs text-green-700 bg-green-100/80 px-2.5 py-0.5 rounded-full font-semibold">
                  {currentBooking.zoomDetails.encryption}
                </span>
              </div>

              {/* Direct 1-Click Join URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  One-Click Direct Join URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-gray-800 truncate select-all">
                    {currentBooking.zoomDetails.joinUrl}
                  </div>
                  <button
                    onClick={() => copyToClipboard(currentBooking.zoomDetails.joinUrl, 'joinUrl')}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedField === 'joinUrl' ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={currentBooking.zoomDetails.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>Launch Zoom</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Meeting ID & Passcode Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-gray-500 font-medium">Meeting ID</div>
                    <div className="font-mono font-bold text-base text-gray-900 tracking-wider">
                      {currentBooking.zoomDetails.formattedMeetingId}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(currentBooking.zoomDetails.meetingId, 'meetingId')}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    {copiedField === 'meetingId' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-gray-500 font-medium">Passcode (Encrypted)</div>
                    <div className="font-mono font-bold text-base text-gray-900 tracking-wider">
                      {currentBooking.zoomDetails.passcode}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(currentBooking.zoomDetails.passcode, 'passcode')}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    {copiedField === 'passcode' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Add to Calendar Actions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Add to your Calendar
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={getOutlookWebCalendarUrl(currentBooking)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-xl flex items-center gap-2.5 transition-all text-xs font-semibold text-gray-800 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#0078D4] text-white flex items-center justify-center text-[10px] font-bold">
                    O
                  </div>
                  <span>Outlook 365 Web</span>
                </a>

                <a
                  href={getGoogleCalendarUrl(currentBooking)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-xl flex items-center gap-2.5 transition-all text-xs font-semibold text-gray-800 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">
                    G
                  </div>
                  <span>Google Calendar</span>
                </a>

                <button
                  onClick={() => downloadIcsFile(currentBooking)}
                  className="p-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-xl flex items-center gap-2.5 transition-all text-xs font-semibold text-gray-800 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                  <span>Download .ICS File</span>
                </button>
              </div>
            </div>

            {/* Dial-in numbers collapsible */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDialIn(!showDialIn)}
                className="w-full p-3.5 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs font-bold text-gray-700 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0b5cff]" />
                  International Phone Dial-in &amp; SIP/H.323 System Addresses
                </span>
                {showDialIn ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDialIn && (
                <div className="p-4 bg-white border-t border-gray-200 text-xs space-y-3">
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
        )}

        {/* Bottom Actions Bar */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onBookAnother}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
            <span>Schedule Another Meeting</span>
          </button>

          {onViewMeetings && (
            <button
              onClick={onViewMeetings}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#0b5cff] hover:bg-[#0049d1] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>View My Scheduled Meetings</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
};

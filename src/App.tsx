import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { M365AuthGate } from './components/M365AuthGate';
import { SimpleDateTimePicker } from './components/SimpleDateTimePicker';
import { MeetingAgendaQuestions } from './components/MeetingAgendaQuestions';
import { ZoomIntakeForm } from './components/ZoomIntakeForm';
import { BookingConfirmation } from './components/BookingConfirmation';
import { HostBookingsView } from './components/HostBookingsView';
import { TimezoneSelector } from './components/TimezoneSelector';
import { Office365CalendarDashboard, DashboardWelcomeCard } from './components/Office365CalendarDashboard';
import { SlotUnavailableModal } from './components/SlotUnavailableModal';
import { MeetingType, TimeSlot, Booking, M365CalendarState, M365User } from './types';
import { INITIAL_MEETING_TYPES, INITIAL_M365_STATE } from './data/initialData';
import { getDetectedTimezone, formatDateInTimezone } from './utils/timezone';
import { playZoomNotificationSound, sendBrowserPushNotification } from './utils/notifications';
import { buildAuthHeaders } from './utils/auth';
import { saveBookingEdit } from './utils/saveBookingEdit';
import { Video, Sparkles, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

// Only opened on demand (a meeting's settings), so loaded on first open
// rather than shipped in the initial bundle.
const ZoomMeetingDetailsModal = lazy(() =>
  import('./components/ZoomMeetingDetailsModal').then((m) => ({ default: m.ZoomMeetingDetailsModal }))
);

type BannerTone = 'success' | 'neutral' | 'error';

export default function App() {
  // 1. M365 Authentication State
  const [authUser, setAuthUser] = useState<M365User | null>(() => {
    try {
      const cached = localStorage.getItem('m365_auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Role check: Admin vs Standard User - trusts only the server-verified
  // flag issued at login (see resolveIdentity/isGrantedAdminEmail in
  // server.ts), never a guess from the email or role string.
  const isAdmin = useMemo(() => Boolean(authUser?.isAdmin), [authUser]);

  // Identity headers sent with every API request - Authorization carries the
  // session token (Supabase, M365 SSO or demo) the server verifies itself.
  const authHeaders = useMemo(() => buildAuthHeaders(authUser), [authUser]);

  // Navigation View State - Defaults to Office365 Dashboard when user logs in.
  // Admin tools (Zoom API, M365 sync, login audits, admin grants) are not
  // part of this app at all - they live on the separate /admin portal (see
  // AdminPortal.tsx and main.tsx), so this component only ever needs these
  // two regular-staff views.
  const [currentView, setCurrentView] = useState<'dashboard' | 'booking'>('dashboard');

  // Selected Booking for Detailed Modal inspection
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

  // Core Data initialized with complete default seed dataset
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>(INITIAL_MEETING_TYPES);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(INITIAL_MEETING_TYPES[0]);
  // No preset duration selection anymore - the user just picks a start and
  // end time in SimpleDateTimePicker, and this is the resulting length,
  // used everywhere a meeting's duration is needed instead of a fixed
  // meeting-type duration.
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(30);
  const [meetingTopic, setMeetingTopic] = useState<string>('');
  const [topicError, setTopicError] = useState(false);
  const [meetingAnswers, setMeetingAnswers] = useState<Record<string, any>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [m365State, setM365State] = useState<M365CalendarState>(INITIAL_M365_STATE);

  // Scheduling State
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getDetectedTimezone());
  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);

  // Initialize selected date to today - SimpleDateTimePicker then suggests
  // the next open half-hour from the current time (rolling over to tomorrow
  // late at night) instead of a fixed time on a fixed day.
  const today = new Date();
  const initialDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [selectedDate, setSelectedDate] = useState<string>(initialDateStr);

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  // The slot the intake form was last opened for. The form stays mounted
  // (just hidden) while the booker goes Back to change the time, so their
  // invitees, Host Key choice and settings survive; clearing this starts a
  // genuinely new booking with an empty form.
  const [intakeSlot, setIntakeSlot] = useState<TimeSlot | null>(null);
  // Set when the booker comes Back from the intake form, so the time picker
  // takes keyboard focus instead of leaving it on the page body.
  const [focusPickerOnReturn, setFocusPickerOnReturn] = useState(false);
  const [bookingStep, setBookingStep] = useState<'slots' | 'intake' | 'confirmed'>('slots');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isSlotUnavailableModalOpen, setIsSlotUnavailableModalOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ message: string; tone: BannerTone } | null>(null);
  // Why the last booking submit failed, shown inline on the intake form.
  const [bookingError, setBookingError] = useState<string | null>(null);
  // One shared hide-timer, reset on each new notice - otherwise an earlier
  // notice's timer hides a newer one early.
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // tone: 'success' for completed actions, 'neutral' for outcomes that
  // aren't a celebration (a cancellation), 'error' for failures.
  const showBanner = (message: string, durationMs = 4000, tone: BannerTone = 'success') => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    setBannerNotice({ message, tone });
    bannerTimeoutRef.current = setTimeout(() => setBannerNotice(null), durationMs);
  };
  useEffect(() => () => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
  }, []);

  // Without this, navigating to a new view/step (e.g. the intake form to
  // the confirmation screen, or dashboard to booking) kept whatever scroll
  // position the previous, often-taller screen was left at - landing the
  // user partway down the new page instead of at its top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [bookingStep, currentView]);

  // Initial Load: Fetch Meeting Types, Bookings, M365 status gracefully
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const results = await Promise.allSettled([
          fetch('/api/meeting-types').then((r) => (r.ok ? r.json() : null)),
          authUser?.email
            ? fetch('/api/bookings', { headers: authHeaders }).then((r) =>
                r.ok ? r.json() : null
              )
            : Promise.resolve(null),
          fetch('/api/m365/status').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (!isMounted) return;

        const [typesResult, bookingsResult, m365Result] = results;

        // 1. Meeting Types
        if (typesResult.status === 'fulfilled' && typesResult.value?.success && typesResult.value.data?.length > 0) {
          const freshTypes: MeetingType[] = typesResult.value.data;
          setMeetingTypes(freshTypes);
          // Swap in the freshly-fetched version of whatever's currently
          // selected (initially the hardcoded placeholder from
          // INITIAL_MEETING_TYPES) so it doesn't stay stuck showing
          // pre-fetch data (e.g. outdated custom questions) forever.
          setSelectedMeetingType((curr) => freshTypes.find((m) => m.id === curr?.id) || freshTypes[0]);
        }

        // 2. Bookings
        if (bookingsResult.status === 'fulfilled' && bookingsResult.value?.success && Array.isArray(bookingsResult.value.data)) {
          setBookings(bookingsResult.value.data);
        }

        // 3. M365 State
        if (m365Result.status === 'fulfilled' && m365Result.value?.success && m365Result.value.data) {
          setM365State(m365Result.value.data);
        }
      } catch (err) {
        // Fallback already initialized in state
      }
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [authUser?.email]);

  // Periodically refresh bookings so live-meeting status (set by the Zoom
  // webhook listener on the server) shows up without a manual reload.
  // Skipped while the tab is hidden, and a response identical to what's
  // already shown keeps the same array so the calendar and lists don't
  // re-render for nothing. Re-subscribes when authHeaders change (e.g. a
  // refreshed session token) so it never keeps polling with a stale one.
  useEffect(() => {
    if (!authUser?.email) return;
    const headers = authHeaders;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/bookings', { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const fresh = JSON.stringify(data.data);
          setBookings((prev) => (JSON.stringify(prev) === fresh ? prev : data.data));
        }
      } catch {
        // Ignore transient network errors; next poll will retry
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [authUser?.email, authHeaders]);

  // Filter visible bookings according to RBAC:
  // Admin sees all organization meetings.
  // Standard user only sees their own booked meetings (by email or name or guest email).
  const visibleBookings = useMemo(() => {
    if (isAdmin) return bookings;
    if (!authUser) return [];

    const userEmail = (authUser.email || '').toLowerCase().trim();
    const userName = (authUser.name || '').toLowerCase().trim();

    return bookings.filter((b) => {
      const bEmail = (b.participantEmail || '').toLowerCase().trim();
      const bName = (b.participantName || '').toLowerCase().trim();
      const isGuest = b.guestEmails?.some((g) => g.toLowerCase().trim() === userEmail);

      return bEmail === userEmail || bName === userName || isGuest;
    });
  }, [bookings, isAdmin, authUser]);


  // Handle Sign Out
  const handleSignOut = () => {
    localStorage.removeItem('m365_auth_user');
    setAuthUser(null);
    setCurrentView('booking');
  };

  // Handle slot selection -> proceed to Zoom intake form
  // A fresh booking: back to the time picker with no slot and an empty form.
  const startNewBooking = () => {
    setBookingStep('slots');
    setSelectedSlot(null);
    setIntakeSlot(null);
    setBookingError(null);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    if (!meetingTopic.trim()) {
      setTopicError(true);
      document.getElementById('meeting-topic-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setTopicError(false);

    const newAnswerErrors: Record<string, string> = {};
    (selectedMeetingType?.customQuestions || []).forEach((q) => {
      if (q.required && (!meetingAnswers[q.id] || String(meetingAnswers[q.id]).trim() === '')) {
        newAnswerErrors[q.id] = `${q.label} is required`;
      }
    });
    if (Object.keys(newAnswerErrors).length > 0) {
      setAnswerErrors(newAnswerErrors);
      document.getElementById('meeting-agenda-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAnswerErrors({});

    setSelectedSlot(slot);
    setIntakeSlot(slot);
    setFocusPickerOnReturn(false);
    setBookingStep('intake');
  };

  const handleAnswerChange = (questionId: string, val: any) => {
    setMeetingAnswers((prev) => ({ ...prev, [questionId]: val }));
    if (answerErrors[questionId]) {
      setAnswerErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Submit Zoom Intake Form -> One-Click Schedule
  const handleSubmitBooking = async (formData: {
    participantName: string;
    participantEmail: string;
    guestEmails: string[];
    answers: Record<string, any>;
    notes?: string;
    sendHostKey?: boolean;
    zoomConfig?: Record<string, any>;
  }) => {
    if (!selectedMeetingType || !selectedSlot) return;
    setIsSubmittingBooking(true);
    setBookingError(null);

    try {
      const assignedHostId = selectedSlot.assignedHost?.id || (selectedAccountId !== 'all' ? selectedAccountId : 'host-1');

      const payload = {
        meetingTypeId: selectedMeetingType.id,
        meetingTopic: (meetingTopic || selectedMeetingType.title).trim(),
        topic: (meetingTopic || selectedMeetingType.title).trim(),
        date: selectedDate,
        timeSlot: selectedSlot.formattedTime,
        duration: customDurationMinutes,
        timezone: selectedTimezone,
        hostAccountId: assignedHostId,
        ...formData,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setConfirmedBooking(data.data);
        setBookings((prev) => [data.data, ...prev]);
        setIntakeSlot(null);
        setBookingStep('confirmed');
        playZoomNotificationSound('chime');

        // Trigger simulated browser notification
        sendBrowserPushNotification(`Zoom Scheduled: ${data.data.meetingTitle || selectedMeetingType.title}`, {
          body: `Date: ${selectedDate} at ${selectedSlot.formattedTime}\nMeeting ID: ${data.data.zoomDetails.meetingId}`,
        });
      } else if (res.status === 409) {
        // Both rotating Zoom accounts got booked out from under this
        // slot between page load and submit - a real, expected capacity
        // limit, not an error, so it gets a calm modal instead of a raw
        // browser alert() with the server's internal wording.
        setIsSlotUnavailableModalOpen(true);
      } else {
        setBookingError(data.error || data.message || 'The server rejected the booking.');
      }
    } catch (err) {
      console.error('Error submitting booking', err);
      setBookingError("We couldn't reach the server. Check your connection.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Cancel Booking - throws on failure so CancelMeetingDialog can show the
  // error inline and let the user retry, instead of a browser alert().
  const handleCancelBooking = async (bookingId: string) => {
    let data: any;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: authHeaders,
      });
      data = await res.json();
    } catch (e) {
      console.error(e);
      throw new Error('A connection error occurred while cancelling the meeting. Please try again.');
    }
    if (!data.success) {
      throw new Error(data.error || data.message || 'Failed to cancel the meeting.');
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );
    if (confirmedBooking?.id === bookingId) {
      setConfirmedBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    }
    showBanner(data.message || 'Meeting cancelled.', 4000, 'neutral');
  };

  // Cancel every one of the caller's own bookings for real (Zoom + Outlook)
  const handleCancelAllMine = async () => {
    try {
      const res = await fetch('/api/bookings/cancel-mine', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        const cancelledIds = new Set((data.results || []).filter((r: any) => r.success).map((r: any) => r.id));
        setBookings((prev) =>
          prev.map((b) => (cancelledIds.has(b.id) ? { ...b, status: 'cancelled' } : b))
        );
        showBanner(data.message, 4000, 'neutral');
      } else {
        showBanner(data.error || data.message || "Your meetings couldn't be cancelled. Please try again.", 6000, 'error');
      }
    } catch (e) {
      console.error(e);
      showBanner("Your meetings couldn't be cancelled because the server couldn't be reached. Please try again.", 6000, 'error');
    }
  };

  // If user is not authenticated with Microsoft 365, show Auth Gate
  if (!authUser) {
    return <M365AuthGate onAuthenticated={(user) => setAuthUser(user)} />;
  }

  const formattedDateStr = formatDateInTimezone(`${selectedDate}T12:00:00`, selectedTimezone);

  // The fixed meeting-type record still supplies host, Zoom style, and
  // custom questions - only its duration is overridden with whatever
  // length the user actually picked in SimpleDateTimePicker.
  // Memoized so typing in the Topic box doesn't hand the agenda questions and
  // picker a brand-new object (and a re-render) on every keystroke.
  const effectiveMeetingType = useMemo(
    () => (selectedMeetingType ? { ...selectedMeetingType, duration: customDurationMinutes } : null),
    [selectedMeetingType, customDurationMinutes]
  );

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#2D2E33] font-sans flex flex-col selection:bg-blue-100 selection:text-[#0433FF]">
      
      {/* Header with RBAC Navigation */}
      <Header
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'booking' && bookingStep === 'confirmed') {
            startNewBooking();
          }
        }}
        authUser={authUser}
        onSignOut={handleSignOut}
        selectedTimezone={selectedTimezone}
        onOpenTimezoneModal={() => setIsTimezoneModalOpen(true)}
      />

      {/* Floating System Notice Toast */}
      {bannerNotice && (
        <div
          role={bannerNotice.tone === 'error' ? 'alert' : 'status'}
          className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
        >
          {bannerNotice.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : bannerNotice.tone === 'neutral' ? (
            <Info className="w-4 h-4 text-gray-300 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          )}
          <span>{bannerNotice.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 0: OFFICE 365 CALENDAR DASHBOARD (Default view on initial login) */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Full-width greeting banner shared by both columns below */}
            <DashboardWelcomeCard
              authUser={authUser}
              m365State={m365State}
              selectedTimezone={selectedTimezone}
              userEmail={authUser?.email}
              userName={authUser?.name || 'Authorized User'}
              onScheduleMeeting={() => {
                setCurrentView('booking');
                startNewBooking();
              }}
            />

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
              <div className="xl:col-span-3">
                <Office365CalendarDashboard
                  authUser={authUser}
                  m365State={m365State}
                  bookings={visibleBookings}
                  hideWelcomeCard
                  onScheduleMeeting={() => {
                    setCurrentView('booking');
                    startNewBooking();
                  }}
                  onSelectBookingForDetails={(booking) => {
                    setSelectedBookingForDetails(booking);
                  }}
                  userEmail={authUser?.email}
                  userName={authUser?.name || 'Authorized User'}
                  selectedTimezone={selectedTimezone}
                />
              </div>

              {/* Scheduled Meetings (User sees own meetings; Admin sees all) */}
              <div className="xl:col-span-2 xl:sticky xl:top-24 xl:self-start">
                <HostBookingsView
                  bookings={visibleBookings}
                  meetingTypes={meetingTypes}
                  isAdmin={isAdmin}
                  currentUserEmail={authUser?.email}
                  onCancelBooking={handleCancelBooking}
                  onCancelAllMine={handleCancelAllMine}
                  onNavigateToSchedule={() => setCurrentView('booking')}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 1: BOOKING SCHEDULER FLOW */}
        {currentView === 'booking' && (
          <div>
            {bookingStep === 'slots' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* Left column: Topic + Meeting Agenda */}
                <div className="space-y-6">

                  {/* Meeting Topic / Name Input Card */}
                  <div
                    id="meeting-topic-card"
                    className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 shadow-xs"
                  >
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="meeting-topic-input" className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                          <Video className="w-4 h-4 text-[#0433FF]" />
                          <span>Topic <span className="text-red-600" aria-hidden="true">*</span></span>
                        </label>
                      </div>

                      <div className="relative">
                        <input
                          id="meeting-topic-input"
                          type="text"
                          value={meetingTopic}
                          onChange={(e) => {
                            setMeetingTopic(e.target.value);
                            if (e.target.value.trim()) setTopicError(false);
                          }}
                          placeholder="e.g. Ayala Foundation Operations Strategy & Partner Sync"
                          aria-required="true"
                          aria-invalid={topicError}
                          aria-describedby={topicError ? 'meeting-topic-error' : undefined}
                          className={`w-full px-4 py-3.5 bg-[#F7F9FA] hover:bg-gray-100/70 focus:bg-white border rounded-xl text-base font-semibold text-gray-900 placeholder:font-normal focus:outline-none focus:ring-4 transition-all shadow-2xs ${
                            topicError
                              ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                              : 'border-gray-200 focus:border-[#0433FF] focus:ring-[#0433FF]/10'
                          }`}
                        />
                        {meetingTopic && (
                          <button
                            type="button"
                            onClick={() => setMeetingTopic('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Clear topic"
                            aria-label="Clear topic"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {topicError && (
                        <p id="meeting-topic-error" role="alert" className="text-xs text-red-600 font-medium">Enter a topic for the meeting.</p>
                      )}
                    </div>
                  </div>

                  {/* Meeting Agenda / custom questions for the selected meeting type -
                      answered here, right below Topic, instead of later in the intake form */}
                  {effectiveMeetingType && (
                    <MeetingAgendaQuestions
                      meetingType={effectiveMeetingType}
                      answers={meetingAnswers}
                      errors={answerErrors}
                      onAnswerChange={handleAnswerChange}
                    />
                  )}
                </div>

                {/* Right column: Simple native date + time picker - the only
                    scheduling step, no separate preset-duration selection */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs">
                  <SimpleDateTimePicker
                    selectedDate={selectedDate}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                    formattedDate={formattedDateStr}
                    selectedTimezone={selectedTimezone}
                    onChangeTimezone={() => setIsTimezoneModalOpen(true)}
                    meetingTypeId={selectedMeetingType?.id}
                    onDurationChange={setCustomDurationMinutes}
                    onSelectTime={handleSelectSlot}
                    appliedSlot={selectedSlot}
                    appliedDurationMinutes={customDurationMinutes}
                    autoFocusField={focusPickerOnReturn}
                  />
                </div>

              </div>
            )}

            {/* STEP 2: CUSTOM ZOOM INTAKE FORM */}
            {(bookingStep === 'intake' || bookingStep === 'slots') && effectiveMeetingType && intakeSlot && (
              <div hidden={bookingStep !== 'intake'}>
              <ZoomIntakeForm
                meetingType={effectiveMeetingType}
                meetingTopic={meetingTopic || effectiveMeetingType.title}
                formattedDate={formattedDateStr}
                selectedSlot={intakeSlot}
                selectedTimezone={selectedTimezone}
                authUser={authUser}
                answers={meetingAnswers}
                onBack={() => {
                  setBookingError(null);
                  setFocusPickerOnReturn(true);
                  setBookingStep('slots');
                }}
                onSubmit={handleSubmitBooking}
                isSubmitting={isSubmittingBooking}
                submitError={bookingError}
                isActive={bookingStep === 'intake'}
              />
              </div>
            )}

            {/* STEP 3: ZOOM CONFIRMATION HUB */}
            {bookingStep === 'confirmed' && confirmedBooking && (
              <BookingConfirmation
                booking={confirmedBooking}
                authHeaders={authHeaders}
                onBookAnother={() => {
                  startNewBooking();
                  setConfirmedBooking(null);
                }}
                onViewMeetings={() => setCurrentView('dashboard')}
                onCancelMeeting={handleCancelBooking}
                onUpdateBookingConfig={async (updatedConfig, savedBooking, message) => {
                  setBookings((prev) =>
                    prev.map((b) => (b.id === confirmedBooking.id ? savedBooking ?? { ...b, zoomConfig: updatedConfig } : b))
                  );
                  setConfirmedBooking((prev) => (prev ? savedBooking ?? { ...prev, zoomConfig: updatedConfig } : null));
                  showBanner(message || 'Meeting updated.');
                }}
              />
            )}

          </div>
        )}

      </main>

      {/* Zoom Meeting Details Modal (When user clicks meeting on Dashboard or list) */}
      {selectedBookingForDetails && (
        <Suspense fallback={null}>
          <ZoomMeetingDetailsModal
            booking={selectedBookingForDetails}
            initialConfig={selectedBookingForDetails.zoomConfig}
            onClose={() => setSelectedBookingForDetails(null)}
            onSave={async (updatedConfig, sendHostKey) => {
              // Throws on failure, so the Edit window keeps the changes and
              // shows why; the notice only appears once the server saved.
              const { booking: saved, message } = await saveBookingEdit(
                selectedBookingForDetails.id,
                updatedConfig,
                sendHostKey,
                authHeaders
              );
              setBookings((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
              showBanner(message, 5000);
            }}
          />
        </Suspense>
      )}

      {/* Slot Unavailable Modal (both rotating Zoom accounts got booked first) */}
      {isSlotUnavailableModalOpen && (
        <SlotUnavailableModal
          onClose={() => setIsSlotUnavailableModalOpen(false)}
          onChooseAnotherSlot={() => {
            setIsSlotUnavailableModalOpen(false);
            setSelectedSlot(null);
            setBookingStep('slots');
          }}
        />
      )}

      {/* Timezone Selector Modal */}
      <TimezoneSelector
        isOpen={isTimezoneModalOpen}
        onClose={() => setIsTimezoneModalOpen(false)}
        selectedTimezone={selectedTimezone}
        onSelectTimezone={(tz) => setSelectedTimezone(tz)}
      />

      {/* Subtle Zoom Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12 text-center text-xs text-gray-500">
        <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#0433FF] text-white flex items-center justify-center text-[10px] font-bold">
            Z
          </div>
          <span className="font-semibold text-gray-800">Ayala Foundation Zoom Booking Portal</span>
        </div>
      </footer>

    </div>
  );
}

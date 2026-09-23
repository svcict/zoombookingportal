import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { M365AuthGate } from './components/M365AuthGate';
import { MeetingTypeSelector } from './components/MeetingTypeSelector';
import { CalendarPicker } from './components/CalendarPicker';
import { TimeSlotGrid } from './components/TimeSlotGrid';
import { ZoomIntakeForm } from './components/ZoomIntakeForm';
import { BookingConfirmation } from './components/BookingConfirmation';
import { HostBookingsView } from './components/HostBookingsView';
import { TimezoneSelector } from './components/TimezoneSelector';
import { Office365CalendarDashboard, DashboardWelcomeCard } from './components/Office365CalendarDashboard';
import { ZoomMeetingDetailsModal } from './components/ZoomMeetingDetailsModal';
import { MeetingType, TimeSlot, Booking, M365CalendarState, M365User, HostAccount } from './types';
import { INITIAL_MEETING_TYPES, INITIAL_HOST_ACCOUNTS, INITIAL_M365_STATE } from './data/initialData';
import { generateLocalAvailabilitySlots } from './utils/availability';
import { getDetectedTimezone, formatDateInTimezone } from './utils/timezone';
import { playZoomNotificationSound, sendBrowserPushNotification } from './utils/notifications';
import { buildAuthHeaders } from './utils/auth';
import { Video, Sparkles } from 'lucide-react';

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
  // Supabase session token the server actually verifies; X-User-Email is
  // only a fallback the server uses when it has no Supabase configured.
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
  const [meetingTopic, setMeetingTopic] = useState<string>('');
  const [topicError, setTopicError] = useState(false);
  const [hostAccounts, setHostAccounts] = useState<HostAccount[]>(INITIAL_HOST_ACCOUNTS);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [m365State, setM365State] = useState<M365CalendarState>(INITIAL_M365_STATE);

  // Scheduling State
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getDetectedTimezone());
  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);

  // Initialize selected date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const initialDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  
  const [selectedDate, setSelectedDate] = useState<string>(initialDateStr);
  
  // Initial local slots calculated instantly
  const [slots, setSlots] = useState<TimeSlot[]>(() => {
    const initial = generateLocalAvailabilitySlots({
      meetingType: INITIAL_MEETING_TYPES[0],
      date: initialDateStr,
      selectedAccountId: 'all',
      bookings: [],
      timezone: selectedTimezone
    });
    return initial.slots;
  });

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingStep, setBookingStep] = useState<'slots' | 'intake' | 'confirmed'>('slots');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Without this, navigating to a new view/step (e.g. the intake form to
  // the confirmation screen, or dashboard to booking) kept whatever scroll
  // position the previous, often-taller screen was left at - landing the
  // user partway down the new page instead of at its top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [bookingStep, currentView]);

  // Initial Load: Fetch Meeting Types, Bookings, M365 status, Hosts gracefully
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
          fetch('/api/auth/m365/accounts').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (!isMounted) return;

        const [typesResult, bookingsResult, m365Result, accountsResult] = results;

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

        // 4. Host Accounts
        if (accountsResult.status === 'fulfilled' && accountsResult.value?.success && Array.isArray(accountsResult.value.data)) {
          setHostAccounts(accountsResult.value.data);
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
  useEffect(() => {
    if (!authUser?.email) return;
    const headers = authHeaders;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/bookings', { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setBookings(data.data);
        }
      } catch {
        // Ignore transient network errors; next poll will retry
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [authUser?.email]);

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

  // Fetch Availability Slots with instant local fallback
  const fetchAvailability = useCallback(async () => {
    if (!selectedMeetingType || !selectedDate) return;
    
    // Ensure we have local slots immediately available
    const localResult = generateLocalAvailabilitySlots({
      meetingType: selectedMeetingType,
      date: selectedDate,
      selectedAccountId,
      bookings,
      timezone: selectedTimezone
    });

    try {
      const accountParam = selectedAccountId && selectedAccountId !== 'all' ? `&accountId=${selectedAccountId}` : '';
      const durationParam = selectedMeetingType.duration ? `&duration=${selectedMeetingType.duration}` : '';
      const res = await fetch(
        `/api/availability?meetingTypeId=${selectedMeetingType.id}&date=${selectedDate}&timezone=${encodeURIComponent(selectedTimezone)}${accountParam}${durationParam}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.slots) && data.slots.length > 0) {
          setSlots(data.slots);
          if (data.hostAccountsSummary) {
            setHostAccounts(data.hostAccountsSummary);
          }
          return;
        }
      }
      // If server returned unsuccessful response, apply local slots
      setSlots(localResult.slots);
      setHostAccounts(localResult.hostAccountsSummary);
    } catch {
      // Seamlessly apply local slots on any network error
      setSlots(localResult.slots);
      setHostAccounts(localResult.hostAccountsSummary);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedMeetingType, selectedDate, selectedTimezone, selectedAccountId, bookings, m365State.syncEnabled]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability, m365State.lastCheckedAt]);

  // Handle Sign Out
  const handleSignOut = () => {
    localStorage.removeItem('m365_auth_user');
    setAuthUser(null);
    setCurrentView('booking');
  };

  // Handle slot selection -> proceed to Zoom intake form
  const handleSelectSlot = (slot: TimeSlot) => {
    if (!meetingTopic.trim()) {
      setTopicError(true);
      document.getElementById('meeting-topic-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setTopicError(false);
    setSelectedSlot(slot);
    setBookingStep('intake');
  };

  // Submit Zoom Intake Form -> One-Click Schedule
  const handleSubmitBooking = async (formData: {
    participantName: string;
    participantEmail: string;
    guestEmails: string[];
    answers: Record<string, any>;
    notes?: string;
    zoomConfig?: Record<string, any>;
  }) => {
    if (!selectedMeetingType || !selectedSlot) return;
    setIsSubmittingBooking(true);

    try {
      const assignedHostId = selectedSlot.assignedHost?.id || (selectedAccountId !== 'all' ? selectedAccountId : 'host-1');

      const payload = {
        meetingTypeId: selectedMeetingType.id,
        meetingTopic: (meetingTopic || selectedMeetingType.title).trim(),
        topic: (meetingTopic || selectedMeetingType.title).trim(),
        date: selectedDate,
        timeSlot: selectedSlot.formattedTime,
        timezone: selectedTimezone,
        hostAccountId: assignedHostId,
        ...formData,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setConfirmedBooking(data.data);
        setBookings((prev) => [data.data, ...prev]);
        setBookingStep('confirmed');
        playZoomNotificationSound('chime');
        
        // Trigger simulated browser notification
        sendBrowserPushNotification(`Zoom Scheduled: ${data.data.meetingTitle || selectedMeetingType.title}`, {
          body: `Date: ${selectedDate} at ${selectedSlot.formattedTime}\nMeeting ID: ${data.data.zoomDetails.meetingId}`,
        });
      } else {
        alert(data.error || 'Failed to schedule booking');
      }
    } catch (err) {
      console.error('Error submitting booking', err);
      alert('An error occurred while scheduling your Zoom session.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
        );
        if (confirmedBooking?.id === bookingId) {
          setConfirmedBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        }
        setBannerNotice(data.message || 'Meeting cancelled.');
        setTimeout(() => setBannerNotice(null), 4000);
      } else {
        alert(data.error || data.message || 'Failed to cancel the meeting.');
      }
    } catch (e) {
      console.error(e);
      alert('A connection error occurred while cancelling the meeting.');
    }
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
        setBannerNotice(data.message);
        setTimeout(() => setBannerNotice(null), 4000);
      } else {
        alert(data.error || data.message || 'Failed to cancel bookings.');
      }
    } catch (e) {
      console.error(e);
      alert('A connection error occurred while cancelling bookings.');
    }
  };

  // If user is not authenticated with Microsoft 365, show Auth Gate
  if (!authUser) {
    return <M365AuthGate onAuthenticated={(user) => setAuthUser(user)} />;
  }

  const formattedDateStr = formatDateInTimezone(`${selectedDate}T12:00:00`, selectedTimezone);

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#2D2E33] font-sans flex flex-col selection:bg-blue-100 selection:text-[#0b5cff]">
      
      {/* Header with RBAC Navigation */}
      <Header
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'booking' && bookingStep === 'confirmed') {
            setBookingStep('slots');
            setSelectedSlot(null);
          }
        }}
        authUser={authUser}
        onSignOut={handleSignOut}
        selectedTimezone={selectedTimezone}
        onOpenTimezoneModal={() => setIsTimezoneModalOpen(true)}
      />

      {/* Floating System Notice Toast */}
      {bannerNotice && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-green-400" />
          <span>{bannerNotice}</span>
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
              userEmail={authUser?.email || 'buhatar@gmail.com'}
              userName={authUser?.name || 'Authorized User'}
              onScheduleMeeting={() => {
                setCurrentView('booking');
                setBookingStep('slots');
                setSelectedSlot(null);
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
                    setBookingStep('slots');
                    setSelectedSlot(null);
                  }}
                  onSelectBookingForDetails={(booking) => {
                    setSelectedBookingForDetails(booking);
                  }}
                  userEmail={authUser?.email || 'buhatar@gmail.com'}
                  userName={authUser?.name || 'Authorized User'}
                  selectedTimezone={selectedTimezone}
                />
              </div>

              {/* Scheduled Meetings (User sees own meetings; Admin sees all) */}
              <div className="xl:col-span-2 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
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
              <div className="space-y-6">
                
                {/* Meeting Topic / Name Input Card */}
                <div
                  id="meeting-topic-card"
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 shadow-xs"
                >
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="meeting-topic-input" className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#0b5cff]" />
                        <span>Topic <span className="text-red-500">*</span></span>
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                        Auto-generates Zoom &amp; Outlook title
                      </span>
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
                        className={`w-full px-4 py-3.5 bg-[#F7F9FA] hover:bg-gray-100/70 focus:bg-white border rounded-xl text-base font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-4 transition-all shadow-2xs ${
                          topicError
                            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                            : 'border-gray-200 focus:border-[#0b5cff] focus:ring-[#0b5cff]/10'
                        }`}
                      />
                      {meetingTopic && (
                        <button
                          type="button"
                          onClick={() => setMeetingTopic('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-1.5 py-0.5 text-xs font-bold bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                          title="Clear topic"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {topicError && (
                      <p className="text-xs text-red-500 font-medium">Topic is required.</p>
                    )}
                  </div>
                </div>

                {/* Step 1: Meeting Type & Timezone Selector */}
                <MeetingTypeSelector
                  meetingTypes={meetingTypes}
                  selectedMeetingType={selectedMeetingType || meetingTypes[0]}
                  onSelectMeetingType={(type) => {
                    setSelectedMeetingType(type);
                    setSelectedSlot(null);
                  }}
                  selectedTimezone={selectedTimezone}
                  onChangeTimezone={() => setIsTimezoneModalOpen(true)}
                />

                {/* Step 2: Side-by-Side Calendar & Available Time Slots */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 items-stretch">
                  
                  {/* Left Column: Interactive Monthly Calendar */}
                  <div className="flex flex-col h-full">
                    <CalendarPicker
                      selectedDate={selectedDate}
                      onSelectDate={(date) => {
                        setSelectedDate(date);
                        setSelectedSlot(null);
                      }}
                    />
                  </div>

                  {/* Right Column: Available Time Slots Grid */}
                  <div className="flex flex-col h-full bg-[#FAFAFA]/50">
                    <TimeSlotGrid
                      slots={slots}
                      selectedSlot={selectedSlot}
                      onSelectSlot={handleSelectSlot}
                      formattedDate={formattedDateStr}
                      selectedTimezone={selectedTimezone}
                      isLoading={isLoadingSlots}
                    />
                  </div>

                </div>

              </div>
            )}

            {/* STEP 2: CUSTOM ZOOM INTAKE FORM */}
            {bookingStep === 'intake' && selectedMeetingType && selectedSlot && (
              <ZoomIntakeForm
                meetingType={selectedMeetingType}
                meetingTopic={meetingTopic || selectedMeetingType.title}
                formattedDate={formattedDateStr}
                selectedSlot={selectedSlot}
                selectedTimezone={selectedTimezone}
                authUser={authUser}
                onBack={() => setBookingStep('slots')}
                onSubmit={handleSubmitBooking}
                isSubmitting={isSubmittingBooking}
              />
            )}

            {/* STEP 3: ZOOM CONFIRMATION HUB */}
            {bookingStep === 'confirmed' && confirmedBooking && (
              <BookingConfirmation
                booking={confirmedBooking}
                authHeaders={authHeaders}
                onBookAnother={() => {
                  setBookingStep('slots');
                  setSelectedSlot(null);
                  setConfirmedBooking(null);
                }}
                onViewMeetings={() => setCurrentView('dashboard')}
                onCancelMeeting={handleCancelBooking}
                onUpdateBookingConfig={async (updatedConfig) => {
                  setBookings((prev) =>
                    prev.map((b) => (b.id === confirmedBooking.id ? { ...b, zoomConfig: updatedConfig } : b))
                  );
                  setConfirmedBooking((prev) => (prev ? { ...prev, zoomConfig: updatedConfig } : null));
                  setBannerNotice('Zoom meeting details updated and synced to Office 365 Exchange.');
                  setTimeout(() => setBannerNotice(null), 4000);
                }}
              />
            )}

          </div>
        )}

      </main>

      {/* Zoom Meeting Details Modal (When user clicks meeting on Dashboard or list) */}
      {selectedBookingForDetails && (
        <ZoomMeetingDetailsModal
          booking={selectedBookingForDetails}
          initialConfig={selectedBookingForDetails.zoomConfig}
          onClose={() => setSelectedBookingForDetails(null)}
          onSave={async (updatedConfig) => {
            try {
              const res = await fetch(`/api/bookings/${selectedBookingForDetails.id}`, {
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
                  setBookings((prev) => prev.map((b) => (b.id === data.data.id ? data.data : b)));
                }
              }
              setBannerNotice('Zoom meeting settings saved and synced with Microsoft 365 Exchange.');
              setTimeout(() => setBannerNotice(null), 4000);
            } catch (e) {
              console.error('Failed to update booking:', e);
            }
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
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#0b5cff] text-white flex items-center justify-center text-[10px] font-bold">
              Z
            </div>
            <span className="font-semibold text-gray-800">Zoom Scheduling Portal</span>
            <span>• Powered by Microsoft 365 Graph Sync</span>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            <span>Enhanced AES-256 Encryption</span>
            <span>•</span>
            <span>Automated Email &amp; Push Reminders</span>
            <span>•</span>
            <span>Seamless Timezone Engine</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

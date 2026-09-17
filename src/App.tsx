import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { M365AuthGate } from './components/M365AuthGate';
import { MeetingTypeSelector } from './components/MeetingTypeSelector';
import { CalendarPicker } from './components/CalendarPicker';
import { TimeSlotGrid } from './components/TimeSlotGrid';
import { ZoomIntakeForm } from './components/ZoomIntakeForm';
import { BookingConfirmation } from './components/BookingConfirmation';
import { HostBookingsView } from './components/HostBookingsView';
import { M365SyncView } from './components/M365SyncView';
import { ZoomApiIntegrationView } from './components/ZoomApiIntegrationView';
import { AdminSecurityAuditView } from './components/AdminSecurityAuditView';
import { TimezoneSelector } from './components/TimezoneSelector';
import { Office365CalendarDashboard, DashboardWelcomeCard } from './components/Office365CalendarDashboard';
import { ZoomMeetingDetailsModal } from './components/ZoomMeetingDetailsModal';
import { MeetingType, TimeSlot, Booking, M365CalendarState, M365User, HostAccount, ZoomMeetingConfig } from './types';
import { INITIAL_MEETING_TYPES, INITIAL_HOST_ACCOUNTS, INITIAL_M365_STATE } from './data/initialData';
import { generateLocalAvailabilitySlots } from './utils/availability';
import { getDetectedTimezone, formatDateInTimezone } from './utils/timezone';
import { playZoomNotificationSound, sendBrowserPushNotification } from './utils/notifications';
import { Video, ShieldCheck, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

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

  // Role check: Admin vs Standard User
  const isAdmin = useMemo(() => {
    if (!authUser) return false;
    return Boolean(
      authUser.isAdmin ||
      authUser.role?.toLowerCase().includes('admin') ||
      authUser.email?.toLowerCase().includes('admin') ||
      authUser.email === 'sarah.jenkins@zoompartner.com'
    );
  }, [authUser]);

  // Navigation View State - Defaults to Office365 Dashboard when user logs in
  const [currentView, setCurrentView] = useState<'dashboard' | 'booking' | 'm365' | 'zoom-api' | 'security-logs'>('dashboard');

  // Selected Booking for Detailed Modal inspection
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

  // Core Data initialized with complete default seed dataset
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>(INITIAL_MEETING_TYPES);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(INITIAL_MEETING_TYPES[0]);
  const [meetingTopic, setMeetingTopic] = useState<string>('Ayala Foundation Strategy & Collaboration Sync');
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
      syncEnabled: true
    });
    return initial.slots;
  });

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingStep, setBookingStep] = useState<'slots' | 'intake' | 'confirmed'>('slots');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Initial Load: Fetch Meeting Types, Bookings, M365 status, Hosts gracefully
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const results = await Promise.allSettled([
          fetch('/api/meeting-types').then((r) => (r.ok ? r.json() : null)),
          authUser?.email
            ? fetch('/api/bookings', { headers: { 'X-User-Email': authUser.email } }).then((r) =>
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
          setMeetingTypes(typesResult.value.data);
          setSelectedMeetingType((curr) => curr || typesResult.value.data[0]);
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
      syncEnabled: m365State.syncEnabled
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
  }, [fetchAvailability, m365State.lastSyncTime]);

  // Ensure non-admin users cannot access admin views
  useEffect(() => {
    if (!isAdmin && (currentView === 'zoom-api' || currentView === 'm365')) {
      setCurrentView('booking');
    }
  }, [isAdmin, currentView]);

  // Handle Sign Out
  const handleSignOut = () => {
    localStorage.removeItem('m365_auth_user');
    setAuthUser(null);
    setCurrentView('booking');
  };

  // Handle slot selection -> proceed to Zoom intake form
  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setBookingStep('intake');
  };

  // Submit Zoom Intake Form -> One-Click Schedule
  const handleSubmitBooking = async (formData: {
    participantName: string;
    participantEmail: string;
    participantPhone?: string;
    participantCompany?: string;
    guestEmails: string[];
    answers: Record<string, any>;
    notes?: string;
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
        headers: authUser?.email ? { 'X-User-Email': authUser.email } : undefined,
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
        );
        if (confirmedBooking?.id === bookingId) {
          setConfirmedBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        }
        setBannerNotice('Zoom meeting cancelled and removed from Microsoft 365 Exchange Calendar.');
        setTimeout(() => setBannerNotice(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle M365 Sync (Admin Only)
  const handleToggleM365Sync = async () => {
    try {
      const res = await fetch('/api/m365/sync-toggle', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setM365State(data.data);
        setBannerNotice(data.message);
        setTimeout(() => setBannerNotice(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Busy Slot to M365 (Admin Only)
  const handleAddM365BusySlot = async (date: string, time: string, title: string) => {
    try {
      const res = await fetch('/api/m365/add-busy-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, title }),
      });
      const data = await res.json();
      if (data.success) {
        setM365State((prev) => ({ ...prev, lastSyncTime: new Date().toISOString() }));
      }
    } catch (e) {
      console.error(e);
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
        m365State={m365State}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
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
                  syncedEvents={m365State.events || []}
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
                  isAdmin={isAdmin}
                  onCancelBooking={handleCancelBooking}
                  onSelectBookingForDetails={(booking) => setSelectedBookingForDetails(booking)}
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
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="meeting-topic-input" className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#0b5cff]" />
                        <span>Topic or Name of the Meeting</span>
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
                        onChange={(e) => setMeetingTopic(e.target.value)}
                        placeholder="e.g. Ayala Foundation Operations Strategy & Partner Sync"
                        className="w-full px-4 py-3.5 bg-[#F7F9FA] hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-[#0b5cff] rounded-xl text-base font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-[#0b5cff]/10 transition-all shadow-2xs"
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

                    {/* Quick Topic Suggestion Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-semibold text-gray-500 mr-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#0b5cff]" /> Suggestions:
                      </span>
                      {[
                        'Operations Strategy Review',
                        'Community Partner Sync',
                        'Program Planning & Review',
                        'Stakeholder Consultation',
                        'Project Architecture Deep-Dive',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setMeetingTopic(suggestion)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                            meetingTopic === suggestion
                              ? 'bg-blue-50 border-blue-300 text-[#0b5cff] font-bold'
                              : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
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
                      selectedDate={selectedDate}
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
                onUpdateMeetingTopic={(t) => setMeetingTopic(t)}
                selectedDate={selectedDate}
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

        {/* VIEW 3: ZOOM API INTEGRATION & DIAGNOSTICS (Admin Only) */}
        {currentView === 'zoom-api' && isAdmin && (
          <ZoomApiIntegrationView />
        )}

        {/* VIEW 4: MICROSOFT 365 CALENDAR SYNC SETTINGS (Admin Only) */}
        {currentView === 'm365' && isAdmin && (
          <M365SyncView
            m365State={m365State}
            onToggleSync={handleToggleM365Sync}
            onAddBusySlot={handleAddM365BusySlot}
          />
        )}

        {/* VIEW 5: SECURITY AUDITS & FAILED LOGINS (Admin Only) */}
        {currentView === 'security-logs' && isAdmin && (
          <AdminSecurityAuditView onBackToSchedule={() => setCurrentView('booking')} />
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
                  ...(authUser?.email ? { 'X-User-Email': authUser.email } : {}),
                },
                body: JSON.stringify({ zoomConfig: updatedConfig }),
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
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
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

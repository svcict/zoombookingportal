import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  Clock,
  Calendar,
  Globe,
  User,
  Mail,
  Users,
  Plus,
  X,
  ArrowLeft,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { MeetingType, TimeSlot, M365User, ZoomMeetingConfig } from '../types';
import { Switch } from './Switch';
import { ZoomSettingsFields, ZoomSettingsValue, DEFAULT_ZOOM_SETTINGS } from './ZoomSettingsFields';

// Only the settings that actually map to a real Zoom API meeting.settings
// field (see src/lib/zoomApi.ts) are collected here - Template, Whiteboard,
// Docs, Workflow, Encryption type, My Notes, and Meeting chat from Zoom's
// own Schedule Meeting page are host-account/enterprise features with no
// per-booking API equivalent, so they're left out.
type IntakeZoomConfig = Pick<
  ZoomMeetingConfig,
  | 'passcodeEnabled'
  | 'passcode'
  | 'waitingRoom'
  | 'requireAuth'
  | 'hostVideo'
  | 'participantVideo'
  | 'audioOption'
  | 'joinAnytime'
  | 'muteOnEntry'
  | 'autoRecord'
  | 'alternativeHosts'
>;

// 10 characters: Zoom's meeting password field caps out at 10 characters,
// and some accounts enforce a minimum length policy up to that same limit
// (e.g. "must be at least 10 characters") - generating exactly 10 satisfies
// both the general max and the strictest real-world minimum policy.
function generateDefaultPasscode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

interface ZoomIntakeFormProps {
  meetingType: MeetingType;
  meetingTopic?: string;
  formattedDate: string;
  selectedSlot: TimeSlot;
  selectedTimezone: string;
  authUser?: M365User | null;
  answers: Record<string, any>;
  onBack: () => void;
  onSubmit: (formData: {
    participantName: string;
    participantEmail: string;
    guestEmails: string[];
    answers: Record<string, any>;
    notes?: string;
    meetingTopic?: string;
    sendHostKey: boolean;
    zoomConfig: IntakeZoomConfig;
  }) => Promise<void>;
  isSubmitting?: boolean;
  // Why the last submit failed (shown inline above the buttons, in place of
  // a browser alert), so the form and everything typed into it stay put.
  submitError?: string | null;
  // True while this step is on screen. The form stays mounted (hidden) while
  // the booker changes the time, so this - not mounting - is when keyboard
  // and screen-reader focus should move to the form's heading.
  isActive?: boolean;
}

// Error key -> the field to send focus to when that check fails.
const FIELD_IDS = {
  fullName: 'intake-booking-as',
  email: 'intake-booking-as',
  guestEmails: 'intake-invitees',
  hostOnBehalfEmail: 'intake-meeting-host',
} as const;

export const ZoomIntakeForm: React.FC<ZoomIntakeFormProps> = ({
  meetingType,
  meetingTopic,
  formattedDate,
  selectedSlot,
  selectedTimezone,
  authUser,
  answers,
  onBack,
  onSubmit,
  isSubmitting = false,
  submitError = null,
  isActive = true,
}) => {
  const topic = meetingTopic || meetingType.title || 'Zoom Video Meeting';
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (isActive) headingRef.current?.focus({ preventScroll: true });
  }, [isActive]);
  // "2:00 – 3:00 PM": the end comes from the picked start plus the length.
  const timeRangeLabel = (() => {
    try {
      const start = new Date(selectedSlot.isoString);
      const end = new Date(start.getTime() + meetingType.duration * 60000);
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: selectedTimezone, hour: 'numeric', minute: '2-digit' });
      return `${fmt.format(start)} – ${fmt.format(end)}`;
    } catch {
      return selectedSlot.formattedTime;
    }
  })();
  const fullName = authUser?.name || '';
  const email = authUser?.email || '';
  const [guestEmailInput, setGuestEmailInput] = useState('');
  const [guestEmails, setGuestEmails] = useState<string[]>([]);
  // Azure AD / Entra ID directory typeahead for Invitees - real org users
  // matched via GET /api/directory/users, backed by Microsoft Graph. Falls
  // back silently to plain free-text email entry if directory search isn't
  // configured (empty results, no error shown).
  const [directoryResults, setDirectoryResults] = useState<
    { id: string; name: string; email: string; jobTitle?: string }[]
  >([]);
  const [showDirectoryResults, setShowDirectoryResults] = useState(false);
  const directoryRequestId = useRef(0);
  // Cancels a pending "hide on blur" timeout if focus comes back before it
  // fires (e.g. clicking Add then immediately clicking back into the input
  // to add another invitee) - otherwise that stale timeout closes the
  // freshly-reopened dropdown a moment later, with nothing left to reopen it.
  const guestBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = guestEmailInput.trim();
    if (query.length < 2) {
      // Invalidate any search still in flight, or its late response would
      // repopulate the dropdown under the now-cleared input.
      directoryRequestId.current++;
      setDirectoryResults([]);
      return;
    }
    const thisRequestId = ++directoryRequestId.current;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/directory/users?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (thisRequestId !== directoryRequestId.current) return; // a newer search superseded this one
        setDirectoryResults(data.success ? data.data : []);
      } catch {
        if (thisRequestId === directoryRequestId.current) setDirectoryResults([]);
      }
    }, 250); // debounce as-you-type
    return () => clearTimeout(timeout);
  }, [guestEmailInput]);
  // Off by default. Sending the Host Key is this app's chosen way to hand
  // real host privileges to whoever needs them, not a fallback only needed
  // when someone happens to lack a Zoom license - so it's the entry point
  // for the section below, and the Meeting Host field only appears once
  // it's on.
  const [sendHostKey, setSendHostKey] = useState(false);
  // Optional: when booking on someone else's behalf, this person becomes
  // the meeting's designated host (technically Zoom's Alternative Host
  // field, instead of defaulting to the booker) and is added to the
  // invitee list so they also receive the confirmation email.
  const [hostOnBehalfEmail, setHostOnBehalfEmail] = useState('');
  // Same Azure AD / Entra ID directory typeahead as Invitees, kept as its
  // own state since this field holds a single value rather than a list -
  // an external guest with no directory match can still just type their
  // email directly, same fallback as Invitees.
  const [hostDirectoryResults, setHostDirectoryResults] = useState<
    { id: string; name: string; email: string; jobTitle?: string }[]
  >([]);
  const [showHostDirectoryResults, setShowHostDirectoryResults] = useState(false);
  const hostDirectoryRequestId = useRef(0);
  const hostBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = hostOnBehalfEmail.trim();
    if (query.length < 2) {
      // Invalidate any search still in flight, or its late response would
      // repopulate the dropdown under the now-cleared input.
      hostDirectoryRequestId.current++;
      setHostDirectoryResults([]);
      return;
    }
    const thisRequestId = ++hostDirectoryRequestId.current;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/directory/users?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (thisRequestId !== hostDirectoryRequestId.current) return; // a newer search superseded this one
        setHostDirectoryResults(data.success ? data.data : []);
      } catch {
        if (thisRequestId === hostDirectoryRequestId.current) setHostDirectoryResults([]);
      }
    }, 250); // debounce as-you-type
    return () => clearTimeout(timeout);
  }, [hostOnBehalfEmail]);

  const handleSelectHostFromDirectory = (selectedEmail: string) => {
    setHostOnBehalfEmail(selectedEmail);
    setHostDirectoryResults([]);
    setShowHostDirectoryResults(false);
    if (errors.hostOnBehalfEmail) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.hostOnBehalfEmail;
        return next;
      });
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Zoom meeting settings - set here at booking time so the meeting is
  // created with these already applied, instead of a separate settings
  // step after confirmation.
  // Passcode is always on and auto-generated, not booker-configurable -
  // the booker isn't the meeting host (one of the two rotating Zoom
  // accounts is), so choosing meeting security isn't theirs to set.
  const [passcode] = useState(() => generateDefaultPasscode());
  // Same settings block, defaults and wording as the Edit window.
  const [zoomSettings, setZoomSettings] = useState<ZoomSettingsValue>(DEFAULT_ZOOM_SETTINGS);

  const handleAddGuest = () => {
    if (!guestEmailInput.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmailInput.trim())) {
      setErrors((prev) => ({ ...prev, guestEmails: 'Enter a full email address, like name@example.org' }));
      return;
    }
    if (!guestEmails.includes(guestEmailInput.trim())) {
      setGuestEmails([...guestEmails, guestEmailInput.trim()]);
    }
    setGuestEmailInput('');
    if (errors.guestEmails) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.guestEmails;
        return next;
      });
    }
  };

  const handleRemoveGuest = (emailToRemove: string) => {
    setGuestEmails(guestEmails.filter((e) => e !== emailToRemove));
  };

  const handleAddGuestFromDirectory = (selectedEmail: string) => {
    if (!guestEmails.includes(selectedEmail)) {
      setGuestEmails([...guestEmails, selectedEmail]);
    }
    setGuestEmailInput('');
    setDirectoryResults([]);
    setShowDirectoryResults(false);
    if (errors.guestEmails) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.guestEmails;
        return next;
      });
    }
  };

  const validate = (invitees: string[]) => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid work email is required';
    if (invitees.length === 0) newErrors.guestEmails = 'Add at least one invitee';
    if (hostOnBehalfEmail.trim() && !hostOnBehalfEmail.includes('@')) {
      newErrors.hostOnBehalfEmail = 'Enter a valid email address';
    }
    // Custom questions (e.g. Meeting Agenda) are answered - and validated -
    // on the scheduling step now, before the user ever reaches this form.

    setErrors(newErrors);

    // Take the booker straight to the first problem - on a phone the field
    // can be a long way above the submit button.
    const firstInvalidId = (['fullName', 'email', 'guestEmails', 'hostOnBehalfEmail'] as const)
      .filter((key) => newErrors[key])
      .map((key) => FIELD_IDS[key])[0];
    if (firstInvalidId) {
      requestAnimationFrame(() => {
        const field = document.getElementById(firstInvalidId);
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field?.focus({ preventScroll: true });
      });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // An email typed into the invitee box but not yet added counts - nobody
    // expects to be told "add at least one invitee" with one sitting there.
    const pendingInvitee = guestEmailInput.trim();
    const invitees =
      pendingInvitee.includes('@') && !guestEmails.some((g) => g.toLowerCase() === pendingInvitee.toLowerCase())
        ? [...guestEmails, pendingInvitee]
        : guestEmails;
    if (invitees !== guestEmails) {
      setGuestEmails(invitees);
      setGuestEmailInput('');
    }
    if (!validate(invitees)) return;

    const trimmedHostOnBehalf = hostOnBehalfEmail.trim();
    const finalGuestEmails =
      trimmedHostOnBehalf && !invitees.some((g) => g.toLowerCase() === trimmedHostOnBehalf.toLowerCase())
        ? [...invitees, trimmedHostOnBehalf]
        : invitees;

    await onSubmit({
      participantName: fullName.trim(),
      participantEmail: email.trim(),
      guestEmails: finalGuestEmails,
      answers,
      notes: `Registered for Zoom session via Zoom Scheduler Portal. Host: ${meetingType.hostName}`,
      meetingTopic: topic.trim() || meetingType.title,
      sendHostKey,
      zoomConfig: {
        passcodeEnabled: true,
        passcode,
        ...zoomSettings,
        ...(trimmedHostOnBehalf ? { alternativeHosts: trimmedHostOnBehalf } : {}),
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
      
      {/* Zoom Form Top Header Banner */}
      <div className="bg-[#2D2E33] text-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Change time"
              aria-label="Change time"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 ref={headingRef} tabIndex={-1} className="text-xl sm:text-2xl font-bold text-white tracking-tight outline-none">
                {topic || meetingType.title}
              </h2>
            </div>
          </div>

        </div>

        {/* Meeting Details Strip */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0433FF] shrink-0" />
            <span className="text-white">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0433FF] shrink-0" />
            <span className="font-bold text-white">{timeRangeLabel} ({meetingType.duration} mins)</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0433FF] shrink-0" />
            <span className="truncate text-white">{selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}</span>
          </div>
        </div>
      </div>

      {/* Main Intake Form Fields (Sleek UI) */}
      <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-6">
        
        {/* Who's booking - from the signed-in account, nothing to fill in */}
        <div id="intake-booking-as" tabIndex={-1} className="outline-none">
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 text-gray-500 shrink-0" />
            <span>
              Booking as <strong className="text-gray-900">{fullName || 'your account'}</strong>
              {email && <span className="text-gray-500"> ({email})</span>}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1 ml-6">Your join link and passcode are emailed here.</p>
          {(errors.fullName || errors.email) && (
            <p role="alert" className="text-xs text-red-600 mt-1 ml-6">
              Your account is missing a name or email address. Sign out and sign in again, then retry.
            </p>
          )}
        </div>

        {/* Section: Add Guests / Multi-Participant */}
        <div className="pt-4 border-t border-gray-100">
          <label htmlFor="intake-invitees" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Invitees <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <p id="intake-invitees-help" className="text-xs text-gray-500 mb-2">
            At least one invitee is required. They&apos;ll receive an email with the Zoom join link, meeting ID, and passcode.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Users className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="intake-invitees"
                type="email"
                value={guestEmailInput}
                aria-required="true"
                aria-invalid={Boolean(errors.guestEmails)}
                aria-describedby={`intake-invitees-help${errors.guestEmails ? ' intake-invitees-error' : ''}`}
                onChange={(e) => {
                  setGuestEmailInput(e.target.value);
                  // Picking a directory match hides the dropdown but keeps focus
                  // in this input, so onFocus won't fire again for the next
                  // invitee - reopen it as soon as they start typing instead.
                  setShowDirectoryResults(true);
                }}
                onFocus={() => {
                  if (guestBlurTimeoutRef.current) {
                    clearTimeout(guestBlurTimeoutRef.current);
                    guestBlurTimeoutRef.current = null;
                  }
                  setShowDirectoryResults(true);
                }}
                onBlur={() => {
                  guestBlurTimeoutRef.current = setTimeout(() => setShowDirectoryResults(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGuest();
                  }
                }}
                placeholder="colleague@company.com or search by name"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#0433FF] focus:ring-2 focus:ring-[#0433FF]/25"
              />

              {/* Azure AD / Entra ID directory matches - click to add directly */}
              {showDirectoryResults && directoryResults.length > 0 && (
                <div className="absolute z-10 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {directoryResults.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep focus so onBlur doesn't close this before the click registers
                        handleAddGuestFromDirectory(person.email);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0433FF] flex items-center justify-center text-xs font-bold shrink-0">
                        {person.name ? person.name.charAt(0).toUpperCase() : person.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{person.name || person.email}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {person.email}{person.jobTitle ? ` · ${person.jobTitle}` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddGuest}
              className="px-4 min-h-11 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {guestEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {guestEmails.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-[#0433FF] font-medium"
                >
                  <Mail className="w-3 h-3" />
                  {g}
                  <button
                    type="button"
                    onClick={() => handleRemoveGuest(g)}
                    aria-label={`Remove ${g}`}
                    className="hover:text-red-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.guestEmails && <p id="intake-invitees-error" role="alert" className="text-red-600 text-xs mt-2">{errors.guestEmails}</p>}
        </div>

        {/* Section: Send Host Key, and (once enabled) booking on someone
            else's behalf. Styled with the AFI brand palette (orange accent,
            primary blue toggle) and darker body text than the rest of the
            form's muted gray-500, since this toggle controls a real
            security/access decision and was getting missed at a glance. */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-start gap-3 p-4 bg-[#FCEDD9]/60 border border-[#FF7B00]/40 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-[#FF7B00] text-white flex items-center justify-center shrink-0 shadow-xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="mt-0.5">
              <Switch
                checked={sendHostKey}
                onChange={(next) => {
                  setSendHostKey(next);
                  // Hiding the Meeting Host field below also clears it, so a
                  // nomination never lingers unnoticed while its field is gone.
                  if (!next) setHostOnBehalfEmail('');
                }}
                labelledBy="intake-host-key-label"
                describedBy="intake-host-key-help"
              />
            </div>
            <div>
              <p id="intake-host-key-label" className="text-sm font-bold text-[#0320AF]">Send Host Key</p>
              <p id="intake-host-key-help" className="text-xs text-gray-700 mt-0.5">
                Turn on to send the Host Key, which lets the host claim host privileges such as
                recording the meeting.
              </p>
              <p className="text-xs text-gray-700 mt-1">
                Note: The Host Key will be included in your confirmation email and shown here
                immediately once the meeting is booked.
              </p>
            </div>
          </div>

          {sendHostKey && (
            <div className="mt-4">
              <label htmlFor="intake-meeting-host" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Meeting Host <span className="text-gray-500 normal-case font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Booking on someone else&apos;s behalf? Enter their email and they&apos;ll be set as the
                designated host and included on the confirmation email with the Host Key.
              </p>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="intake-meeting-host"
                  type="email"
                  value={hostOnBehalfEmail}
                  aria-invalid={Boolean(errors.hostOnBehalfEmail)}
                  aria-describedby={errors.hostOnBehalfEmail ? 'intake-meeting-host-error' : undefined}
                  onChange={(e) => {
                    setHostOnBehalfEmail(e.target.value);
                    setShowHostDirectoryResults(true); // same reason as the Invitees input above
                    if (errors.hostOnBehalfEmail) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.hostOnBehalfEmail;
                        return next;
                      });
                    }
                  }}
                  onFocus={() => {
                    if (hostBlurTimeoutRef.current) {
                      clearTimeout(hostBlurTimeoutRef.current);
                      hostBlurTimeoutRef.current = null;
                    }
                    setShowHostDirectoryResults(true);
                  }}
                  onBlur={() => {
                    hostBlurTimeoutRef.current = setTimeout(() => setShowHostDirectoryResults(false), 150);
                  }}
                  placeholder="delacruz.j@ayalafoundation.org or search by name"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#0433FF] focus:ring-2 focus:ring-[#0433FF]/25"
                />

                {/* Azure AD / Entra ID directory matches - click to select directly */}
                {showHostDirectoryResults && hostDirectoryResults.length > 0 && (
                  <div className="absolute z-10 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                    {hostDirectoryResults.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // keep focus so onBlur doesn't close this before the click registers
                          handleSelectHostFromDirectory(person.email);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0433FF] flex items-center justify-center text-xs font-bold shrink-0">
                          {person.name ? person.name.charAt(0).toUpperCase() : person.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{person.name || person.email}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {person.email}{person.jobTitle ? ` · ${person.jobTitle}` : ''}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.hostOnBehalfEmail && <p id="intake-meeting-host-error" role="alert" className="text-red-600 text-xs mt-2">{errors.hostOnBehalfEmail}</p>}
            </div>
          )}
        </div>

        {/* Section: Zoom Meeting Settings (set now, applied when the meeting is created) */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Video className="w-4 h-4 text-[#0433FF]" />
            Zoom Meeting Settings
          </h3>
          <ZoomSettingsFields value={zoomSettings} onChange={setZoomSettings} idPrefix="intake" />
        </div>

        {Object.keys(errors).length > 0 && !isSubmitting && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {Object.keys(errors).length === 1
              ? 'One field above needs attention before you can book.'
              : `${Object.keys(errors).length} fields above need attention before you can book.`}
          </p>
        )}

        {submitError && !isSubmitting && (
          <div role="alert" className="flex items-start gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 mt-px shrink-0" />
            <span>
              <strong className="font-bold">The meeting wasn't booked.</strong> {submitError.replace(/\.?$/, '.')} Your details are still here, so you can try again.
            </span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Change time
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0433FF] hover:bg-[#0320AF] text-white text-sm font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Scheduling Zoom Meeting &amp; Syncing M365...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Confirm &amp; Generate Zoom Link</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

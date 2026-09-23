import React, { useState } from 'react';
import {
  Video,
  Clock,
  Calendar,
  Globe,
  ShieldCheck,
  User,
  Mail,
  Users,
  Plus,
  X,
  ArrowLeft,
} from 'lucide-react';
import { MeetingType, TimeSlot, M365User, ZoomMeetingConfig } from '../types';

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
  onBack: () => void;
  onSubmit: (formData: {
    participantName: string;
    participantEmail: string;
    guestEmails: string[];
    answers: Record<string, any>;
    notes?: string;
    meetingTopic?: string;
    zoomConfig: IntakeZoomConfig;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const ZoomIntakeForm: React.FC<ZoomIntakeFormProps> = ({
  meetingType,
  meetingTopic,
  formattedDate,
  selectedSlot,
  selectedTimezone,
  authUser,
  onBack,
  onSubmit,
  isSubmitting = false,
}) => {
  const topic = meetingTopic || meetingType.title || 'Zoom Video Meeting';
  const fullName = authUser?.name || '';
  const email = authUser?.email || '';
  const [guestEmailInput, setGuestEmailInput] = useState('');
  const [guestEmails, setGuestEmails] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Zoom meeting settings - set here at booking time so the meeting is
  // created with these already applied, instead of a separate settings
  // step after confirmation.
  // Passcode is always on and auto-generated, not booker-configurable -
  // the booker isn't the meeting host (one of the two rotating Zoom
  // accounts is), so choosing meeting security isn't theirs to set.
  const [passcode] = useState(() => generateDefaultPasscode());
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [requireAuth, setRequireAuth] = useState(false);
  const [hostVideo, setHostVideo] = useState(true);
  const [participantVideo, setParticipantVideo] = useState(true);
  const [audioOption, setAudioOption] = useState<'telephone' | 'computer' | 'both' | 'third_party'>('both');
  const [joinAnytime, setJoinAnytime] = useState(false);
  const [muteOnEntry, setMuteOnEntry] = useState(true);
  const [autoRecord, setAutoRecord] = useState(false);

  const handleAddGuest = () => {
    if (!guestEmailInput.trim() || !guestEmailInput.includes('@')) return;
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

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid work email is required';
    if (guestEmails.length === 0) newErrors.guestEmails = 'At least one invitee is required';

    // Validate required custom questions
    meetingType.customQuestions.forEach((q) => {
      if (q.required && (!answers[q.id] || String(answers[q.id]).trim() === '')) {
        newErrors[q.id] = `${q.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      participantName: fullName.trim(),
      participantEmail: email.trim(),
      guestEmails,
      answers,
      notes: `Registered for Zoom session via Zoom Scheduler Portal. Host: ${meetingType.hostName}`,
      meetingTopic: topic.trim() || meetingType.title,
      zoomConfig: {
        passcodeEnabled: true,
        passcode,
        waitingRoom,
        requireAuth,
        hostVideo,
        participantVideo,
        audioOption,
        joinAnytime,
        muteOnEntry,
        autoRecord,
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
              title="Back to slot picker"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0b5cff] text-white">
                  Zoom Registration
                </span>
                <span className="text-xs text-gray-300 hidden sm:inline">
                  • 1-Click Secure Scheduling
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
                {topic || meetingType.title}
              </h2>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div className="text-left text-xs">
              <div className="font-semibold text-white">Zoom Verified</div>
              <div className="text-gray-300 text-[10px]">AES-256 Encryption</div>
            </div>
          </div>
        </div>

        {/* Meeting Details Strip */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0b5cff] shrink-0" />
            <span className="text-white">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0b5cff] shrink-0" />
            <span className="font-bold text-white">{selectedSlot.formattedTime} ({meetingType.duration} mins)</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0b5cff] shrink-0" />
            <span className="truncate text-white">{selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}</span>
          </div>
        </div>
      </div>

      {/* Meeting Details Bar */}
      <div className="bg-[#F7F9FA] px-6 sm:px-8 py-3.5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0b5cff] text-white flex items-center justify-center shadow-xs">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>{topic || meetingType.title}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-[#0b5cff] rounded-full">
                {meetingType.duration} mins
              </span>
            </div>
            <p className="text-xs text-gray-500">Zoom Enterprise Video Conference • Microsoft 365 Connected</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Instant Confirmation
          </span>
        </div>
      </div>

      {/* Main Intake Form Fields (Sleek UI) */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        
        {/* Section: Participant Credentials */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#0b5cff]" />
            Your Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name - read-only, from the signed-in account */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                readOnly
                placeholder="e.g. Alex Morgan"
                className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm text-gray-600 cursor-not-allowed"
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Email - read-only, from the signed-in account */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Work Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  placeholder="alex.morgan@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl text-sm text-gray-600 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">Matches your signed-in account. Your Zoom join link, meeting ID, and passcode will be emailed here.</p>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>
        </div>

        {/* Section: Add Guests / Multi-Participant */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Invitees <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">
            At least one invitee is required. They&apos;ll receive an email with the Zoom join link, meeting ID, and passcode.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Users className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={guestEmailInput}
                onChange={(e) => setGuestEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGuest();
                  }
                }}
                placeholder="colleague@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff]"
              />
            </div>
            <button
              type="button"
              onClick={handleAddGuest}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-[#0b5cff] font-medium"
                >
                  <Mail className="w-3 h-3" />
                  {g}
                  <button
                    type="button"
                    onClick={() => handleRemoveGuest(g)}
                    className="hover:text-red-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.guestEmails && <p className="text-red-500 text-xs mt-2">{errors.guestEmails}</p>}
        </div>

        {/* Section: Custom Host Intake Questions */}
        {meetingType.customQuestions.length > 0 && (
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Video className="w-4 h-4 text-[#0b5cff]" />
              Meeting Preparation Questions
            </h3>

            {meetingType.customQuestions.map((q) => {
              const val = answers[q.id] || '';
              const hasError = errors[q.id];

              return (
                <div key={q.id} className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                    {q.label} {q.required && <span className="text-red-500">*</span>}
                  </label>
                  {q.helpText && <p className="text-[11px] text-gray-400 mb-1">{q.helpText}</p>}

                  {/* Textarea */}
                  {q.type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={val}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={q.placeholder || 'Your response...'}
                      className={`w-full px-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all ${
                        hasError ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                      }`}
                    />
                  )}

                  {/* Text or Phone */}
                  {(q.type === 'text' || q.type === 'phone') && (
                    <input
                      type={q.type}
                      value={val}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={q.placeholder || ''}
                      className={`w-full px-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all ${
                        hasError ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                      }`}
                    />
                  )}

                  {/* Select */}
                  {q.type === 'select' && (
                    <select
                      value={val}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className={`w-full px-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] ${
                        hasError ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                      }`}
                    >
                      <option value="">-- Please select an option --</option>
                      {q.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Radio */}
                  {q.type === 'radio' && (
                    <div className="space-y-2 mt-1">
                      {q.options?.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F0F2F4] hover:bg-gray-200/70 cursor-pointer text-xs text-gray-700 font-medium transition-colors"
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={val === opt}
                            onChange={() => handleAnswerChange(q.id, opt)}
                            className="w-4 h-4 text-[#0b5cff] focus:ring-[#0b5cff]"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {hasError && <p className="text-red-500 text-xs mt-1">{hasError}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Section: Zoom Meeting Settings (set now, applied when the meeting is created) */}
        <div className="pt-4 border-t border-gray-100 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Video className="w-4 h-4 text-[#0b5cff]" />
            Zoom Meeting Settings
          </h3>

          {/* Security */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Security</label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-800">
              <input
                type="checkbox"
                checked={waitingRoom}
                onChange={(e) => setWaitingRoom(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Waiting Room</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-800">
              <input
                type="checkbox"
                checked={requireAuth}
                onChange={(e) => setRequireAuth(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Only authenticated users can join: Sign in to Zoom</span>
            </label>
          </div>

          {/* Video */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Video</label>
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-800">Host:</span>
                <button
                  type="button"
                  onClick={() => setHostVideo(!hostVideo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    hostVideo ? 'bg-[#0b5cff]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hostVideo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-gray-600">{hostVideo ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-800">Participant:</span>
                <button
                  type="button"
                  onClick={() => setParticipantVideo(!participantVideo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    participantVideo ? 'bg-[#0b5cff]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      participantVideo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-gray-600">{participantVideo ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          {/* Audio */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Audio</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([
                ['telephone', 'Telephone'],
                ['computer', 'Computer Audio'],
                ['both', 'Telephone and Computer Audio'],
                ['third_party', '3rd Party Audio'],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-800">
                  <input
                    type="radio"
                    name="intakeAudioOption"
                    checked={audioOption === value}
                    onChange={() => setAudioOption(value)}
                    className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Advanced</label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-gray-800">
              <input
                type="checkbox"
                checked={joinAnytime}
                onChange={(e) => setJoinAnytime(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Allow participants to join anytime</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-gray-800">
              <input
                type="checkbox"
                checked={muteOnEntry}
                onChange={(e) => setMuteOnEntry(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Mute participants upon entry</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-gray-800">
              <input
                type="checkbox"
                checked={autoRecord}
                onChange={(e) => setAutoRecord(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Automatically record meeting to the cloud</span>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel &amp; Change Time
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0b5cff] hover:bg-[#0049d1] text-white text-sm font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Scheduling Zoom Meeting &amp; Syncing M365...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Confirm &amp; Generate Zoom Link (One-Click)</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

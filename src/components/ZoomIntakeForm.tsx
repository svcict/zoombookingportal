import React, { useState } from 'react';
import {
  Video,
  Clock,
  Calendar,
  Globe,
  ShieldCheck,
  User,
  Mail,
  Building,
  Phone,
  Users,
  Plus,
  X,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mic,
  Monitor,
  SlidersHorizontal,
  KeyRound
} from 'lucide-react';
import { MeetingType, TimeSlot, M365User } from '../types';

interface ZoomIntakeFormProps {
  meetingType: MeetingType;
  meetingTopic?: string;
  onUpdateMeetingTopic?: (topic: string) => void;
  selectedDate: string;
  formattedDate: string;
  selectedSlot: TimeSlot;
  selectedTimezone: string;
  authUser?: M365User | null;
  onBack: () => void;
  onSubmit: (formData: {
    participantName: string;
    participantEmail: string;
    participantPhone?: string;
    participantCompany?: string;
    guestEmails: string[];
    answers: Record<string, any>;
    notes?: string;
    meetingTopic?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const ZoomIntakeForm: React.FC<ZoomIntakeFormProps> = ({
  meetingType,
  meetingTopic,
  onUpdateMeetingTopic,
  selectedDate,
  formattedDate,
  selectedSlot,
  selectedTimezone,
  authUser,
  onBack,
  onSubmit,
  isSubmitting = false,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'credentials'>('details');
  const [topic, setTopic] = useState(meetingTopic || meetingType.title || 'Zoom Video Meeting');
  const initialNames = authUser?.name ? authUser.name.split(' ') : ['', ''];
  const [firstName, setFirstName] = useState(initialNames[0] || '');
  const [lastName, setLastName] = useState(initialNames.slice(1).join(' ') || (initialNames[0] ? 'User' : ''));
  const [email, setEmail] = useState(authUser?.email || '');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(authUser?.tenantName?.split(' ')[0] || authUser?.department || '');
  const [guestEmailInput, setGuestEmailInput] = useState('');
  const [guestEmails, setGuestEmails] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddGuest = () => {
    if (!guestEmailInput.trim() || !guestEmailInput.includes('@')) return;
    if (!guestEmails.includes(guestEmailInput.trim())) {
      setGuestEmails([...guestEmails, guestEmailInput.trim()]);
    }
    setGuestEmailInput('');
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
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid work email is required';

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
      participantName: `${firstName.trim()} ${lastName.trim()}`,
      participantEmail: email.trim(),
      participantPhone: phone.trim() || undefined,
      participantCompany: company.trim() || undefined,
      guestEmails,
      answers,
      notes: `Registered for Zoom session via Zoom Scheduler Portal. Host: ${meetingType.hostName}`,
      meetingTopic: topic.trim() || meetingType.title,
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

      {/* View Tabs: Zoom Meeting Details (host-configured) vs Join Credentials (issued after registering) */}
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
          <KeyRound className="w-3.5 h-3.5" />
          <span>Join Credentials &amp; Calendars</span>
        </button>
      </div>

      {/* TAB 1: Meeting Details already configured by the host via the Zoom API */}
      {activeTab === 'details' && (
        <div className="p-6 sm:p-8 bg-white border-b border-gray-100 space-y-3">
          <p className="text-xs text-gray-500">
            These settings are already configured on the Zoom meeting by the host and will apply
            once you register &mdash; they can't be changed from this form.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-gray-200">
              <span className="text-gray-500 font-medium">Meeting Type</span>
              <span className="font-bold text-gray-900 capitalize">{meetingType.zoomMeetingType}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-gray-200">
              <span className="text-gray-500 font-medium">Registration Approval</span>
              <span className="font-bold text-gray-900">
                {meetingType.requiresApproval ? 'Manually approved by host' : 'Automatic'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-gray-200">
              <span className="text-gray-500 font-medium">Waiting Room</span>
              <span className="font-bold text-gray-900">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-gray-200">
              <span className="text-gray-500 font-medium">Passcode</span>
              <span className="font-bold text-gray-900">Required (auto-generated)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-gray-200">
              <span className="text-gray-500 font-medium">Host / Participant Video</span>
              <span className="font-bold text-gray-900">On</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-gray-200">
              <span className="text-gray-500 font-medium">Encryption</span>
              <span className="font-bold text-gray-900">Enhanced (AES-256)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Join credentials - locked until registration completes, matching Zoom's actual registration flow */}
      {activeTab === 'credentials' && (
        <div className="p-6 sm:p-8 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 p-5 bg-[#F7F9FA] rounded-2xl border border-dashed border-gray-300">
            <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-2 w-full">
              <p className="text-xs font-bold text-gray-700">Join link, Meeting ID &amp; passcode are locked</p>
              <p className="text-[11px] text-gray-500">
                Just like registering for a real Zoom meeting, your join credentials and calendar
                invite are generated only after you submit this registration below &mdash; then
                sent to your email instantly.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {['Meeting ID', 'Passcode', 'Join URL'].map((label) => (
                  <div key={label} className="p-2.5 bg-white rounded-lg border border-gray-200">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
                    <div className="text-xs font-mono text-gray-300 tracking-widest">•••• •••• ••••</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Intake Form Fields (Sleek UI) */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        
        {/* Section: Participant Credentials */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#0b5cff]" />
            Your Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Alex"
                className={`w-full px-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all ${
                  errors.firstName ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                }`}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Morgan"
                className={`w-full px-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all ${
                  errors.lastName ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                }`}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Work Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.morgan@company.com"
                  className={`w-full pl-10 pr-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all ${
                    errors.email ? 'ring-2 ring-red-400 bg-red-50/50' : ''
                  }`}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">Zoom join links and Microsoft 365 calendar invite sent here.</p>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all"
                />
              </div>
            </div>

            {/* Company */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Organization / Company Name (Optional)
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions"
                  className="w-full pl-10 pr-4 py-3 bg-[#F0F2F4] border-none rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Add Guests / Multi-Participant */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Add Additional Guests / Team Members (Optional)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Guests will automatically receive the Zoom join link, passcode, and calendar invite.
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

        {/* Security / Push Notice Card */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0b5cff] text-white flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Push Notifications &amp; M365 Sync</div>
              <div className="text-[11px] text-gray-500">Includes encrypted Zoom passcodes &amp; Outlook calendar invite</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white text-[#0b5cff] rounded-lg border border-blue-200">
            Enabled
          </span>
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

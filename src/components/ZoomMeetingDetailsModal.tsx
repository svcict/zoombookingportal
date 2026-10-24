import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Plus, KeyRound, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Booking, ZoomMeetingConfig } from '../types';
import { useFocusTrap } from '../utils/useFocusTrap';
import { Switch } from './Switch';
import { ZoomSettingsFields, ZoomSettingsValue, zoomSettingsFrom } from './ZoomSettingsFields';

interface ZoomMeetingDetailsModalProps {
  booking?: Booking | null;
  initialConfig?: Partial<ZoomMeetingConfig>;
  onClose?: () => void;
  // Rejects with an Error (its message shown in the window) when the save
  // fails; the window then stays open with every edit intact. Resolves once
  // the server has actually saved, and the window closes itself.
  onSave?: (updatedConfig: ZoomMeetingConfig, sendHostKey: boolean) => Promise<void> | void;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Edit a booked meeting: the same choices as the booking form (invitees,
// agenda, Host Key / Meeting Host and the shared Zoom settings) and nothing
// that doesn't save. The passcode is shown but, as on the booking form, not
// booker-configurable.
export const ZoomMeetingDetailsModal: React.FC<ZoomMeetingDetailsModalProps> = ({
  booking,
  initialConfig,
  onClose,
  onSave,
}) => {
  const cfg = booking?.zoomConfig ?? initialConfig;

  const [invitees, setInvitees] = useState<string[]>(booking?.guestEmails || []);
  const [inviteeInput, setInviteeInput] = useState('');
  const [inviteeError, setInviteeError] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<string>(cfg?.agenda || '');
  const [settings, setSettings] = useState<ZoomSettingsValue>(() => zoomSettingsFrom(cfg));
  // Off by default, same as the booking form: turning it on emails the
  // Host Key on save; editing anything else never sends it.
  const [sendHostKey, setSendHostKey] = useState(false);
  const [meetingHost, setMeetingHost] = useState<string>(cfg?.alternativeHosts || '');
  const [meetingHostError, setMeetingHostError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useFocusTrap(dialogRef);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSaving, onClose]);

  const addInvitee = () => {
    const email = inviteeInput.trim();
    if (!email) return;
    if (!isEmail(email)) {
      setInviteeError('Enter a full email address, like name@example.org.');
      return;
    }
    if (!invitees.some((i) => i.toLowerCase() === email.toLowerCase())) setInvitees([...invitees, email]);
    setInviteeInput('');
    setInviteeError(null);
  };

  const handleSave = async () => {
    // A typed-but-not-added email counts, same as on the booking form.
    let finalInvitees = invitees;
    const pending = inviteeInput.trim();
    if (pending) {
      if (!isEmail(pending)) {
        setInviteeError('Enter a full email address, like name@example.org.');
        document.getElementById('edit-invitees')?.focus();
        return;
      }
      if (!invitees.some((i) => i.toLowerCase() === pending.toLowerCase())) finalInvitees = [...invitees, pending];
      setInvitees(finalInvitees);
      setInviteeInput('');
    }
    if (finalInvitees.length === 0) {
      setInviteeError('Add at least one invitee.');
      document.getElementById('edit-invitees')?.focus();
      return;
    }
    if (sendHostKey && meetingHost.trim() && !isEmail(meetingHost)) {
      setMeetingHostError('Enter a full email address, like name@example.org.');
      document.getElementById('edit-meeting-host')?.focus();
      return;
    }

    const updatedConfig: ZoomMeetingConfig = {
      // Carry through anything this window doesn't show, unchanged.
      ...(cfg as ZoomMeetingConfig),
      ...settings,
      invitees: finalInvitees,
      hasAgenda: Boolean(agenda.trim()),
      agenda: agenda.trim(),
      passcodeEnabled: cfg?.passcodeEnabled ?? true,
      passcode: cfg?.passcode || booking?.zoomDetails?.passcode || '',
      meetingIdType: cfg?.meetingIdType || 'auto',
      alternativeHosts: sendHostKey ? meetingHost.trim() : cfg?.alternativeHosts || '',
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave?.(updatedConfig, sendHostKey);
      onClose?.();
    } catch (err: any) {
      setSaveError(err?.message || 'Your changes could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const label = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5';
  const input =
    'w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#0433FF] focus:ring-2 focus:ring-[#0433FF]/25';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in"
      onClick={() => !isSaving && onClose?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-meeting-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-gray-200 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="edit-meeting-title" ref={headingRef} tabIndex={-1} className="text-base font-bold text-gray-900 truncate outline-none">
              Edit meeting
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {booking?.meetingTitle}
              {booking?.zoomDetails?.formattedMeetingId ? ` · ID ${booking.zoomDetails.formattedMeetingId}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="w-10 h-10 -mr-2 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Invitees */}
          <div>
            <label htmlFor="edit-invitees" className={label}>Invitees</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-invitees"
                  type="text"
                  inputMode="email"
                  value={inviteeInput}
                  onChange={(e) => {
                    setInviteeInput(e.target.value);
                    if (inviteeError) setInviteeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addInvitee();
                    }
                  }}
                  placeholder="name@example.org"
                  aria-invalid={Boolean(inviteeError)}
                  aria-describedby={inviteeError ? 'edit-invitees-error' : undefined}
                  className={`${input} pl-10`}
                />
              </div>
              <button
                type="button"
                onClick={addInvitee}
                className="px-4 min-h-11 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {inviteeError && (
              <p id="edit-invitees-error" role="alert" className="text-xs text-red-600 mt-1.5">{inviteeError}</p>
            )}
            {invitees.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-2.5" aria-label="Invitees">
                {invitees.map((email) => (
                  <li
                    key={email}
                    className="inline-flex items-center gap-1 pl-3 pr-1 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-[#0433FF] font-medium"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setInvitees(invitees.filter((i) => i !== email))}
                      aria-label={`Remove ${email}`}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-blue-100 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Agenda */}
          <div>
            <label htmlFor="edit-agenda" className={label}>Agenda <span className="normal-case font-normal">(optional)</span></label>
            <textarea
              id="edit-agenda"
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="What the meeting is for, shown to participants in Zoom"
              className={`${input} resize-y`}
            />
          </div>

          {/* Host Key / Meeting Host */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-[#FF7B00] mt-0.5 shrink-0" />
                <div>
                  <div id="edit-host-key" className="text-sm font-medium text-gray-900">Send the Host Key</div>
                  <div id="edit-host-key-help" className="text-xs text-gray-500 mt-0.5">
                    Emails the Host Key when you save, so the host can record and manage the meeting.
                  </div>
                </div>
              </div>
              <Switch
                checked={sendHostKey}
                onChange={setSendHostKey}
                labelledBy="edit-host-key"
                describedBy="edit-host-key-help"
              />
            </div>
            {sendHostKey && (
              <div>
                <label htmlFor="edit-meeting-host" className={label}>
                  Meeting host <span className="normal-case font-normal">(optional, if it isn&apos;t you)</span>
                </label>
                <input
                  id="edit-meeting-host"
                  type="text"
                  inputMode="email"
                  value={meetingHost}
                  onChange={(e) => {
                    setMeetingHost(e.target.value);
                    if (meetingHostError) setMeetingHostError(null);
                  }}
                  placeholder="name@ayalafoundation.org"
                  aria-invalid={Boolean(meetingHostError)}
                  aria-describedby={meetingHostError ? 'edit-meeting-host-error' : undefined}
                  className={input}
                />
                {meetingHostError && (
                  <p id="edit-meeting-host-error" role="alert" className="text-xs text-red-600 mt-1.5">{meetingHostError}</p>
                )}
              </div>
            )}
          </div>

          {/* Zoom settings - the same block as the booking form */}
          <div>
            <h3 className={label}>Zoom meeting settings</h3>
            <ZoomSettingsFields value={settings} onChange={setSettings} idPrefix="edit" />
          </div>

          {/* Passcode - shown, not editable (same as the booking form) */}
          <div className="flex items-center gap-2.5 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {cfg?.passcodeEnabled === false ? 'This meeting has no passcode.' : 'This meeting is passcode-protected.'} The passcode is set automatically and can&apos;t be changed here.
            </span>
          </div>
        </div>

        {/* Footer - always visible, even on a phone */}
        <div className="border-t border-gray-100 px-6 py-4 space-y-3">
          {saveError && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 mt-px shrink-0" />
              <span>
                <strong className="font-bold">Your changes weren&apos;t saved.</strong> {saveError.replace(/\.?$/, '.')} Nothing you entered was lost, so you can try again.
              </span>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-11 px-5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="min-h-11 px-5 rounded-xl bg-[#0433FF] hover:bg-[#0320AF] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-80 disabled:cursor-wait"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving&hellip;
                </>
              ) : saveError ? (
                'Try again'
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

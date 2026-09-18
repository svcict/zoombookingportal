import React, { useState, useEffect } from 'react';
import { 
  X, 
  Info, 
  Plus, 
  Paperclip, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Lock, 
  Video, 
  Mic, 
  Calendar, 
  FileText, 
  ShieldCheck,
  Save,
  CheckCircle2
} from 'lucide-react';
import { Booking, ZoomMeetingConfig } from '../types';

interface ZoomMeetingDetailsModalProps {
  booking?: Booking | null;
  initialConfig?: Partial<ZoomMeetingConfig>;
  isOpen?: boolean;
  isInlineCard?: boolean;
  onClose?: () => void;
  onSave?: (updatedConfig: ZoomMeetingConfig) => Promise<void> | void;
  readOnly?: boolean;
}

export const ZoomMeetingDetailsModal: React.FC<ZoomMeetingDetailsModalProps> = ({
  booking,
  initialConfig,
  isOpen = true,
  isInlineCard = false,
  onClose,
  onSave,
  readOnly = false,
}) => {
  // Extract or generate default config matching the images
  const defaultPasscode = booking?.zoomDetails?.passcode || '7894676141';
  const defaultPmi = '869 563 2911';

  // Invitees is a real Zoom API concern for calendar/access purposes only
  // via the booking's own guestEmails - Zoom's meeting API has no separate
  // "invitees" setting, so this list IS booking.guestEmails, not a second
  // copy of it living only in zoomConfig.
  const [inviteeInput, setInviteeInput] = useState('');
  const [invitees, setInvitees] = useState<string[]>(booking?.guestEmails || []);

  const [meetingIdType, setMeetingIdType] = useState<'auto' | 'pmi'>(
    initialConfig?.meetingIdType || 'auto'
  );
  const [pmiNumber] = useState<string>(initialConfig?.pmiNumber || defaultPmi);

  const [showAgendaInput, setShowAgendaInput] = useState<boolean>(
    Boolean(initialConfig?.hasAgenda || initialConfig?.agenda)
  );
  // Zoom's real agenda field - deliberately not pre-filled from the intake
  // form's custom questions (those vary per meeting type and aren't
  // reliably "the agenda"), so there's exactly one place this comes from.
  const [agenda, setAgenda] = useState<string>(initialConfig?.agenda || '');

  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: string; type?: string }>>(
    initialConfig?.attachments || []
  );

  // Security
  const [passcodeEnabled, setPasscodeEnabled] = useState<boolean>(
    initialConfig?.passcodeEnabled ?? true
  );
  const [passcode, setPasscode] = useState<string>(
    initialConfig?.passcode || defaultPasscode
  );
  const [waitingRoom, setWaitingRoom] = useState<boolean>(
    initialConfig?.waitingRoom ?? false
  );
  const [requireAuth, setRequireAuth] = useState<boolean>(
    initialConfig?.requireAuth ?? false
  );

  // My Notes
  const [allowMyNotesTranscript, setAllowMyNotesTranscript] = useState<boolean>(
    initialConfig?.allowMyNotesTranscript ?? true
  );

  // Meeting Chat
  const [enableContinuousChat, setEnableContinuousChat] = useState<boolean>(
    initialConfig?.enableContinuousChat ?? true
  );

  // Video
  const [hostVideo, setHostVideo] = useState<boolean>(
    initialConfig?.hostVideo ?? true
  );
  const [participantVideo, setParticipantVideo] = useState<boolean>(
    initialConfig?.participantVideo ?? true
  );

  // Audio
  const [audioOption, setAudioOption] = useState<'telephone' | 'computer' | 'both' | 'third_party'>(
    initialConfig?.audioOption || 'both'
  );

  // Calendar
  const [calendarType, setCalendarType] = useState<'outlook' | 'google' | 'other'>(
    initialConfig?.calendarType || 'outlook'
  );

  // Advanced section
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(true);
  const [joinAnytime, setJoinAnytime] = useState<boolean>(
    initialConfig?.joinAnytime ?? false
  );
  const [enableQa, setEnableQa] = useState<boolean>(
    initialConfig?.enableQa ?? false
  );
  const [muteOnEntry, setMuteOnEntry] = useState<boolean>(
    initialConfig?.muteOnEntry ?? true
  );
  const [autoRecord, setAutoRecord] = useState<boolean>(
    initialConfig?.autoRecord ?? false
  );
  const [autoAddCloudRecordingToChannel, setAutoAddCloudRecordingToChannel] = useState<boolean>(
    initialConfig?.autoAddCloudRecordingToChannel ?? false
  );
  const [enableAdditionalDataCenters, setEnableAdditionalDataCenters] = useState<boolean>(
    initialConfig?.enableAdditionalDataCenters ?? false
  );
  const [approveOrBlockRegions, setApproveOrBlockRegions] = useState<boolean>(
    initialConfig?.approveOrBlockRegions ?? false
  );
  const [preventScreenCapture, setPreventScreenCapture] = useState<boolean>(
    initialConfig?.preventScreenCapture ?? false
  );
  const [alternativeHosts, setAlternativeHosts] = useState<string>(
    initialConfig?.alternativeHosts || ''
  );
  const [manageAssetsSummary, setManageAssetsSummary] = useState<boolean>(
    initialConfig?.manageAssetsSummary ?? true
  );
  const [manageAssetsRecording, setManageAssetsRecording] = useState<boolean>(
    initialConfig?.manageAssetsRecording ?? true
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);

  // Sync state if booking changes
  useEffect(() => {
    if (booking) {
      setInvitees(booking.guestEmails || []);
    }
    if (booking?.zoomConfig) {
      const cfg = booking.zoomConfig;
      setMeetingIdType(cfg.meetingIdType || 'auto');
      setAgenda(cfg.agenda || '');
      setShowAgendaInput(Boolean(cfg.agenda));
      setAttachments(cfg.attachments || []);
      setPasscodeEnabled(cfg.passcodeEnabled ?? true);
      setPasscode(cfg.passcode || booking.zoomDetails?.passcode || defaultPasscode);
      setWaitingRoom(cfg.waitingRoom ?? false);
      setRequireAuth(cfg.requireAuth ?? false);
      setAllowMyNotesTranscript(cfg.allowMyNotesTranscript ?? true);
      setEnableContinuousChat(cfg.enableContinuousChat ?? true);
      setHostVideo(cfg.hostVideo ?? true);
      setParticipantVideo(cfg.participantVideo ?? true);
      setAudioOption(cfg.audioOption || 'both');
      setCalendarType(cfg.calendarType || 'outlook');
      setJoinAnytime(cfg.joinAnytime ?? false);
      setEnableQa(cfg.enableQa ?? false);
      setMuteOnEntry(cfg.muteOnEntry ?? true);
      setAutoRecord(cfg.autoRecord ?? false);
      setAutoAddCloudRecordingToChannel(cfg.autoAddCloudRecordingToChannel ?? false);
      setEnableAdditionalDataCenters(cfg.enableAdditionalDataCenters ?? false);
      setApproveOrBlockRegions(cfg.approveOrBlockRegions ?? false);
      setPreventScreenCapture(cfg.preventScreenCapture ?? false);
      setAlternativeHosts(cfg.alternativeHosts || '');
      setManageAssetsSummary(cfg.manageAssetsSummary ?? true);
      setManageAssetsRecording(cfg.manageAssetsRecording ?? true);
    }
  }, [booking]);

  const handleAddInvitee = () => {
    const trimmed = inviteeInput.trim();
    if (!trimmed) return;
    if (!invitees.includes(trimmed)) {
      setInvitees([...invitees, trimmed]);
    }
    setInviteeInput('');
  };

  const handleRemoveInvitee = (indexToRemove: number) => {
    setInvitees(invitees.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddSampleAttachment = () => {
    const sampleFiles = [
      { id: `att-${Date.now()}-1`, name: 'Meeting_Agenda_Ayala_Sync.pdf', size: '342 KB', type: 'application/pdf' },
      { id: `att-${Date.now()}-2`, name: 'Technical_Architecture_Overview.docx', size: '1.2 MB', type: 'application/docx' },
      { id: `att-${Date.now()}-3`, name: 'Q3_Operations_SlideDeck.pptx', size: '4.8 MB', type: 'application/pptx' },
    ];
    const fileToAdd = sampleFiles[attachments.length % sampleFiles.length];
    setAttachments([...attachments, fileToAdd]);
  };

  const handleRemoveAttachment = (idToRemove: string) => {
    setAttachments(attachments.filter((a) => a.id !== idToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updatedConfig: ZoomMeetingConfig = {
      invitees,
      meetingIdType,
      pmiNumber,
      hasAgenda: Boolean(agenda.trim()),
      agenda: agenda.trim(),
      attachments,
      passcodeEnabled,
      passcode,
      waitingRoom,
      requireAuth,
      allowMyNotesTranscript,
      enableContinuousChat,
      hostVideo,
      participantVideo,
      audioOption,
      calendarType,
      joinAnytime,
      enableQa,
      muteOnEntry,
      autoRecord,
      autoAddCloudRecordingToChannel,
      enableAdditionalDataCenters,
      approveOrBlockRegions,
      preventScreenCapture,
      alternativeHosts,
      manageAssetsSummary,
      manageAssetsRecording,
    };

    try {
      if (onSave) {
        await onSave(updatedConfig);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen && !isInlineCard) return null;

  const content = (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 text-[#1a1a1a] font-sans overflow-hidden">
      {/* Top Title Bar (if standalone modal) */}
      {!isInlineCard && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#0b5cff]">Zoom Meeting Settings</span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500 font-mono">
                {booking?.zoomDetails?.formattedMeetingId || 'ID: 869-563-2911'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              {booking?.meetingTitle || 'Meeting Details'}
            </h2>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Main Settings Body - Replicating Image 1, 2, 3, 4 */}
      <div className="p-6 sm:p-8 space-y-7 max-w-2xl text-[14px] leading-relaxed">

        {/* 1. Invitees (Image 1) */}
        <div className="space-y-2">
          <label className="block font-semibold text-gray-900">
            Invitees
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inviteeInput}
              onChange={(e) => setInviteeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddInvitee();
                }
              }}
              placeholder="Add invitees"
              disabled={readOnly}
              className="flex-1 px-3.5 py-2 bg-[#f0f2f5]/60 hover:bg-[#f0f2f5] focus:bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0b5cff] focus:ring-1 focus:ring-[#0b5cff] transition-all"
            />
            {inviteeInput.trim() && (
              <button
                type="button"
                onClick={handleAddInvitee}
                className="px-3 py-2 bg-[#0b5cff] text-white rounded-lg text-xs font-semibold hover:bg-[#094fd9] cursor-pointer"
              >
                Add
              </button>
            )}
          </div>

          {/* Invitee Chips */}
          {invitees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {invitees.map((email, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0b5cff] text-xs font-medium"
                >
                  <span>{email}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInvitee(idx)}
                      className="hover:text-red-600 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2. Meeting ID (Image 1) */}
        <div className="space-y-2.5">
          <label className="block font-semibold text-gray-900">
            Meeting ID
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <label className="flex items-center gap-2.5 cursor-pointer text-gray-800 select-none">
              <input
                type="radio"
                name="meetingIdOption"
                checked={meetingIdType === 'auto'}
                onChange={() => setMeetingIdType('auto')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Generate Automatically</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-gray-800 select-none">
              <input
                type="radio"
                name="meetingIdOption"
                checked={meetingIdType === 'pmi'}
                onChange={() => setMeetingIdType('pmi')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Personal Meeting ID {pmiNumber}</span>
            </label>
          </div>
        </div>

        {/* 3. Meeting agenda (Image 1) */}
        <div className="space-y-2">
          <label className="block font-semibold text-gray-900">
            Meeting agenda
          </label>
          
          {!showAgendaInput && !agenda ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAgendaInput(true)}
                className="text-[#0b5cff] hover:text-[#094fd9] font-medium text-sm hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span>Create agenda</span>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-50 border border-blue-200 text-[#0b5cff] text-[10px] font-bold">
                  NEW
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="Enter meeting agenda items, discussion topics, and target outcomes..."
                rows={3}
                disabled={readOnly}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#0b5cff] focus:ring-1 focus:ring-[#0b5cff]"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1 text-[#0b5cff] font-medium">
                  <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[10px] font-bold">NEW</span>
                  Agenda shared with all attendees in Zoom invite
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setAgenda('');
                      setShowAgendaInput(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Attachments (Image 1) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-gray-900">
            <span>Attachments</span>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-[11px] rounded shadow-lg z-30">
                Attach slides, agendas, or documents visible to participants
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddSampleAttachment}
              disabled={readOnly}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-400 text-gray-800 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add attachments</span>
            </button>
            <span className="text-xs text-gray-500">
              {attachments.length === 0 ? 'No files attached' : `${attachments.length} attachment(s)`}
            </span>
          </div>

          {/* Attachment list */}
          {attachments.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-medium text-gray-800">{file.name}</span>
                    <span className="text-gray-400">({file.size})</span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(file.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Meeting Security (Image 2) */}
        <div className="pt-2 space-y-4">
          <h3 className="font-bold text-base text-gray-900">
            Meeting Security
          </h3>

          {/* Passcode */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={passcodeEnabled}
                  onChange={(e) => setPasscodeEnabled(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span className="font-semibold text-gray-900">Passcode</span>
              </label>

              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={!passcodeEnabled || readOnly}
                className="w-32 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-mono text-gray-800 focus:outline-none focus:border-[#0b5cff] focus:ring-1 focus:ring-[#0b5cff] disabled:opacity-50"
              />

              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-[11px] rounded shadow-lg z-30">
                  Numeric passcode required to join the meeting
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 pl-6">
              Only users who have the invite link or passcode can join the meeting
            </p>
          </div>

          {/* Waiting Room */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={waitingRoom}
                onChange={(e) => setWaitingRoom(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span className="font-semibold text-gray-900">Waiting Room</span>
            </label>
            <p className="text-xs text-gray-500 pl-6">
              Only users admitted by the host can join the meeting
            </p>
          </div>

          {/* Only authenticated users can join */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requireAuth}
                onChange={(e) => setRequireAuth(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span className="text-gray-800">
                Only authenticated users can join: Sign in to Zoom
              </span>
            </label>
          </div>
        </div>

        {/* 6. My Notes (Image 3) */}
        <div className="pt-2 space-y-2">
          <h3 className="font-bold text-gray-900">
            My Notes
          </h3>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowMyNotesTranscript}
              onChange={(e) => setAllowMyNotesTranscript(e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
            />
            <span className="text-gray-800">
              Allow everyone to use the meeting transcript with My Notes
            </span>
          </label>
        </div>

        {/* 7. Meeting chat (Image 3) */}
        <div className="pt-2 space-y-1.5">
          <h3 className="font-bold text-gray-900">
            Meeting chat
          </h3>
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableContinuousChat}
                onChange={(e) => setEnableContinuousChat(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span className="text-gray-800">
                Enable Continuous Meeting Chat
              </span>
            </label>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded shadow-lg z-30">
                Chat persists before, during, and after the meeting in Zoom Team Chat
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 pl-6">
            Added invitees will have access to the Meeting Group Chat before and after the meeting.
          </p>
        </div>

        {/* 8. Video (Image 3) */}
        <div className="pt-2 space-y-2.5">
          <h3 className="font-bold text-gray-900">
            Video
          </h3>
          <div className="flex items-center gap-12">
            {/* Host Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-gray-800">Host:</span>
              <button
                type="button"
                onClick={() => !readOnly && setHostVideo(!hostVideo)}
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
              <span className="text-xs font-semibold text-gray-600">
                {hostVideo ? 'On' : 'Off'}
              </span>
            </div>

            {/* Participant Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-gray-800">Participant:</span>
              <button
                type="button"
                onClick={() => !readOnly && setParticipantVideo(!participantVideo)}
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
              <span className="text-xs font-semibold text-gray-600">
                {participantVideo ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>

        {/* 9. Audio (Image 3) */}
        <div className="pt-2 space-y-2.5">
          <h3 className="font-bold text-gray-900">
            Audio
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-800">
              <input
                type="radio"
                name="audioOption"
                checked={audioOption === 'telephone'}
                onChange={() => setAudioOption('telephone')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Telephone</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-800">
              <input
                type="radio"
                name="audioOption"
                checked={audioOption === 'computer'}
                onChange={() => setAudioOption('computer')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Computer Audio</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-800">
              <input
                type="radio"
                name="audioOption"
                checked={audioOption === 'both'}
                onChange={() => setAudioOption('both')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Telephone and Computer Audio</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-800">
              <input
                type="radio"
                name="audioOption"
                checked={audioOption === 'third_party'}
                onChange={() => setAudioOption('third_party')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>3rd Party Audio</span>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            No dial-in countries/regions available
          </p>
        </div>

        {/* 10. Calendar (Image 3 & 4) */}
        <div className="pt-2 space-y-2.5">
          <h3 className="font-bold text-gray-900">
            Calendar
          </h3>
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-800">
              <input
                type="radio"
                name="calendarOption"
                checked={calendarType === 'outlook'}
                onChange={() => setCalendarType('outlook')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span className="font-semibold text-gray-900">Outlook</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-800">
              <input
                type="radio"
                name="calendarOption"
                checked={calendarType === 'google'}
                onChange={() => setCalendarType('google')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Google Calendar</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-800">
              <input
                type="radio"
                name="calendarOption"
                checked={calendarType === 'other'}
                onChange={() => setCalendarType('other')}
                disabled={readOnly}
                className="w-4 h-4 text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
              />
              <span>Other Calendars</span>
            </label>
          </div>
        </div>

        {/* 11. Advanced (Image 4) */}
        <div className="pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#0b5cff] transition-colors py-1 cursor-pointer w-full text-left"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isAdvancedOpen ? '' : '-rotate-90'}`} />
            <span>Advanced</span>
          </button>

          {isAdvancedOpen && (
            <div className="pt-3 pl-6 space-y-3">
              {/* Allow participants to join anytime */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={joinAnytime}
                  onChange={(e) => setJoinAnytime(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span>Allow participants to join anytime</span>
              </label>

              {/* Q&A */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={enableQa}
                  onChange={(e) => setEnableQa(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span>Q&amp;A</span>
              </label>

              {/* Mute participants upon entry */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={muteOnEntry}
                  onChange={(e) => setMuteOnEntry(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span>Mute participants upon entry</span>
              </label>

              {/* Automatically record meeting */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={autoRecord}
                  onChange={(e) => setAutoRecord(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span>Automatically record meeting</span>
              </label>

              {/* Automatically add the cloud recording to channel in Video Management */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={autoAddCloudRecordingToChannel}
                  onChange={(e) => setAutoAddCloudRecordingToChannel(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span>Automatically add the cloud recording to channel in Video Management</span>
              </label>

              {/* Enable additional data center regions for this meeting */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={enableAdditionalDataCenters}
                  onChange={(e) => setEnableAdditionalDataCenters(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span>Enable additional data center regions for this meeting</span>
              </label>

              {/* Approve or block entry for users from specific countries/regions */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={approveOrBlockRegions}
                  onChange={(e) => setApproveOrBlockRegions(e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                />
                <span>Approve or block entry for users from specific countries/regions</span>
              </label>

              {/* Prevent screen capture of meeting content */}
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-gray-800">
                  <input
                    type="checkbox"
                    checked={preventScreenCapture}
                    onChange={(e) => setPreventScreenCapture(e.target.checked)}
                    disabled={readOnly}
                    className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                  />
                  <span>Prevent screen capture of meeting content</span>
                </label>
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded shadow-lg z-30">
                    Blocks unauthorized screenshots or window captures during the Zoom call
                  </div>
                </div>
              </div>

              {/* Alternative hosts (Image 4) */}
              <div className="pt-2 space-y-2">
                <label className="block text-gray-800">
                  Alternative hosts:
                </label>
                <input
                  type="text"
                  value={alternativeHosts}
                  onChange={(e) => setAlternativeHosts(e.target.value)}
                  placeholder="john@company.com"
                  disabled={readOnly}
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0b5cff] focus:ring-1 focus:ring-[#0b5cff]"
                />
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>Allow the alternative host to manage this meeting&apos;s assets as co-owner.</span>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-pointer" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-[11px] rounded shadow-lg z-30">
                      Co-hosts have full permissions to host, record, and moderate
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 pl-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-gray-500">
                    <input
                      type="checkbox"
                      checked={manageAssetsSummary}
                      onChange={(e) => setManageAssetsSummary(e.target.checked)}
                      disabled={readOnly}
                      className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                    />
                    <span className="text-gray-600 font-medium">Meeting summary</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-gray-500">
                    <input
                      type="checkbox"
                      checked={manageAssetsRecording}
                      onChange={(e) => setManageAssetsRecording(e.target.checked)}
                      disabled={readOnly}
                      className="w-4 h-4 rounded text-[#0b5cff] border-gray-300 focus:ring-[#0b5cff]"
                    />
                    <span className="text-gray-600 font-medium">Meeting cloud recording</span>
                  </label>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Footer matching Image 4 */}
      <div className="px-6 sm:px-8 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowMoreOptionsModal(true)}
          className="text-[#0b5cff] hover:text-[#094fd9] font-medium text-sm hover:underline cursor-pointer"
        >
          More Options
        </button>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs font-bold text-green-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Settings Synced to Exchange!
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || readOnly}
            className="px-6 py-2 bg-[#0b5cff] hover:bg-[#094fd9] active:bg-[#0842b8] text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* More Options Modal Dialog */}
      {showMoreOptionsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Additional Zoom Features</h3>
              <button
                type="button"
                onClick={() => setShowMoreOptionsModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Advanced policy controls configured for this Microsoft 365 Exchange tenant:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-bold text-gray-800">Microsoft Teams Interop</div>
                <div className="text-gray-500">Allow joining from Teams SIP room systems via One-Touch Join.</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-bold text-gray-800">Automatic Live Transcription</div>
                <div className="text-gray-500">Live AI audio-to-text enabled in English, Tagalog, and Spanish.</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-bold text-gray-800">Watermark Timestamp Overlay</div>
                <div className="text-gray-500">Viewer email watermarked onto shared screen to prevent leaks.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMoreOptionsModal(false)}
              className="w-full py-2 bg-[#0b5cff] text-white font-bold rounded-xl text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );

  if (isInlineCard) {
    return content;
  }

  // Render as popup / modal
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-y-auto">
          {content}
        </div>
      </div>
    </div>
  );
};

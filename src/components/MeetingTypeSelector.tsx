import React, { useState } from 'react';
import { Clock, Globe, ChevronRight, Check, X, Timer, Sliders } from 'lucide-react';
import { MeetingType } from '../types';

interface MeetingTypeSelectorProps {
  meetingTypes: MeetingType[];
  selectedMeetingType: MeetingType;
  onSelectMeetingType: (type: MeetingType) => void;
  selectedTimezone: string;
  onChangeTimezone: () => void;
}

export const MeetingTypeSelector: React.FC<MeetingTypeSelectorProps> = ({
  meetingTypes,
  selectedMeetingType,
  onSelectMeetingType,
  selectedTimezone,
  onChangeTimezone,
}) => {
  // Custom duration state for "More than 1 hour"
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customHours, setCustomHours] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(30);

  // Temporary modal selection state
  const [tempHours, setTempHours] = useState(1);
  const [tempMinutes, setTempMinutes] = useState(30);

  // Helper to format custom duration nicely
  const formatDurationText = (hours: number, minutes: number) => {
    const hrText = hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''}` : '';
    const minText = minutes > 0 ? `${minutes} min${minutes > 1 ? 's' : ''}` : '';
    return [hrText, minText].filter(Boolean).join(' ') || '1 hr 30 mins';
  };

  // Find standard meeting types or fallback to safe defaults
  const type30 = meetingTypes.find((m) => m.duration === 30) || meetingTypes[0] || {
    id: 'mt-30',
    title: '30 Minutes',
    duration: 30,
    description: 'Fast, focused strategy consultation with screen-sharing capabilities.',
  };

  const type45 = meetingTypes.find((m) => m.duration === 45) || {
    id: 'mt-45',
    title: '45 Minutes',
    duration: 45,
    description: 'Extended technical breakdown, architecture review, and live demo.',
  };

  const type60 = meetingTypes.find((m) => m.duration === 60) || {
    id: 'mt-60',
    title: '1 Hour',
    duration: 60,
    description: 'Comprehensive consultation, workshop session, and interactive deep dive.',
  };

  const baseCustomType = meetingTypes.find((m) => m.id === 'mt-custom' || m.duration > 60) || {
    id: 'mt-custom',
    title: 'More than 1 hour',
    duration: customHours * 60 + customMinutes,
    description: 'Custom duration session for extended team workshops and reviews.',
  };

  // Check which option is currently active
  const is30Selected = selectedMeetingType.duration === 30 && selectedMeetingType.id === type30.id;
  const is45Selected = selectedMeetingType.duration === 45 && selectedMeetingType.id === type45.id;
  const is60Selected = selectedMeetingType.duration === 60 && selectedMeetingType.id === type60.id;
  const isCustomSelected =
    selectedMeetingType.duration > 60 ||
    selectedMeetingType.id === 'mt-custom' ||
    (!is30Selected && !is45Selected && !is60Selected);

  // Open modal with current custom values
  const handleOpenCustomModal = () => {
    setTempHours(customHours);
    setTempMinutes(customMinutes);
    setIsCustomModalOpen(true);
  };

  // Save custom duration from modal
  const handleApplyCustomDuration = () => {
    setCustomHours(tempHours);
    setCustomMinutes(tempMinutes);
    setIsCustomModalOpen(false);

    const totalMinutes = tempHours * 60 + tempMinutes;
    const durationLabel = formatDurationText(tempHours, tempMinutes);

    const updatedCustomMeeting: MeetingType = {
      ...(baseCustomType as MeetingType),
      id: 'mt-custom',
      title: `More than 1 hour (${durationLabel})`,
      duration: totalMinutes,
      description: `Custom session configured for ${durationLabel} with automated Zoom video room.`,
    };

    onSelectMeetingType(updatedCustomMeeting);
  };

  // Click handler for More than 1 hour card
  const handleCustomCardClick = () => {
    if (!isCustomSelected) {
      // If not yet selected, apply current custom setting or open modal
      const totalMinutes = customHours * 60 + customMinutes;
      const durationLabel = formatDurationText(customHours, customMinutes);

      const updatedCustomMeeting: MeetingType = {
        ...(baseCustomType as MeetingType),
        id: 'mt-custom',
        title: `More than 1 hour (${durationLabel})`,
        duration: totalMinutes,
        description: `Custom session configured for ${durationLabel} with automated Zoom video room.`,
      };

      onSelectMeetingType(updatedCustomMeeting);
    } else {
      // If already selected, clicking it opens the modal to adjust
      handleOpenCustomModal();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Step 1: Meeting Duration
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose the length of your Zoom meeting session
          </p>
        </div>

        {/* Timezone pill button */}
        <button
          type="button"
          onClick={onChangeTimezone}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Globe className="w-3.5 h-3.5 text-[#0b5cff]" />
          <span className="font-mono text-[11px] truncate max-w-[180px]">
            {selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}
          </span>
          <span className="text-[10px] text-[#0b5cff] font-bold underline">Change</span>
        </button>
      </div>

      {/* 4 Meeting Duration Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Option 1: 30 minutes */}
        <button
          type="button"
          onClick={() => onSelectMeetingType(type30 as MeetingType)}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-full group ${
            is30Selected
              ? 'border-[#0b5cff] bg-blue-50/70 ring-2 ring-[#0b5cff]/30 shadow-xs'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  is30Selected
                    ? 'bg-[#0b5cff] text-white'
                    : 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-[#0b5cff]'
                }`}
              >
                <Clock className="w-3 h-3" />
                30 mins
              </span>

              {is30Selected && (
                <span className="w-5 h-5 rounded-full bg-[#0b5cff] text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="font-bold text-gray-900 text-sm tracking-tight mb-1">
              30 minutes
            </div>

            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              Standard 30-minute Zoom session for quick discussions and strategy checkpoints.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-[#0b5cff]">
            <span>Zoom Video Call</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${is30Selected ? 'translate-x-0.5' : ''}`} />
          </div>
        </button>

        {/* Option 2: 45 minutes */}
        <button
          type="button"
          onClick={() => onSelectMeetingType(type45 as MeetingType)}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-full group ${
            is45Selected
              ? 'border-[#0b5cff] bg-blue-50/70 ring-2 ring-[#0b5cff]/30 shadow-xs'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  is45Selected
                    ? 'bg-[#0b5cff] text-white'
                    : 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-[#0b5cff]'
                }`}
              >
                <Clock className="w-3 h-3" />
                45 mins
              </span>

              {is45Selected && (
                <span className="w-5 h-5 rounded-full bg-[#0b5cff] text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="font-bold text-gray-900 text-sm tracking-tight mb-1">
              45 minutes
            </div>

            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              Extended 45-minute technical review, demo, and detailed discussion.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-[#0b5cff]">
            <span>Zoom Video Call</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${is45Selected ? 'translate-x-0.5' : ''}`} />
          </div>
        </button>

        {/* Option 3: 1 hour */}
        <button
          type="button"
          onClick={() => onSelectMeetingType(type60 as MeetingType)}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-full group ${
            is60Selected
              ? 'border-[#0b5cff] bg-blue-50/70 ring-2 ring-[#0b5cff]/30 shadow-xs'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  is60Selected
                    ? 'bg-[#0b5cff] text-white'
                    : 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-[#0b5cff]'
                }`}
              >
                <Clock className="w-3 h-3" />
                1 hour (60 mins)
              </span>

              {is60Selected && (
                <span className="w-5 h-5 rounded-full bg-[#0b5cff] text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="font-bold text-gray-900 text-sm tracking-tight mb-1">
              1 hour
            </div>

            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              Comprehensive 60-minute consultation, architecture workshop, and deep dive.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-[#0b5cff]">
            <span>Zoom Video Call</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${is60Selected ? 'translate-x-0.5' : ''}`} />
          </div>
        </button>

        {/* Option 4: More than 1 hour (Custom Modal Trigger) */}
        <div
          onClick={handleCustomCardClick}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-full group ${
            isCustomSelected
              ? 'border-[#0b5cff] bg-blue-50/70 ring-2 ring-[#0b5cff]/30 shadow-xs'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  isCustomSelected
                    ? 'bg-[#0b5cff] text-white'
                    : 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-[#0b5cff]'
                }`}
              >
                <Clock className="w-3 h-3" />
                {isCustomSelected
                  ? formatDurationText(customHours, customMinutes)
                  : `${formatDurationText(customHours, customMinutes)}+`}
              </span>

              {isCustomSelected && (
                <span className="w-5 h-5 rounded-full bg-[#0b5cff] text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="font-bold text-gray-900 text-sm tracking-tight mb-1 flex items-center justify-between">
              <span>More than 1 hour</span>
            </div>

            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {isCustomSelected ? (
                <span className="text-[#0b5cff] font-medium">
                  Custom duration set: <strong>{formatDurationText(customHours, customMinutes)}</strong> ({customHours * 60 + customMinutes} mins)
                </span>
              ) : (
                'Specify custom hours and minutes for extended workshops and reviews.'
              )}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-[#0b5cff]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCustomModal();
              }}
              className="flex items-center gap-1 text-[#0b5cff] hover:underline font-semibold cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{isCustomSelected ? 'Change duration' : 'Configure time'}</span>
            </button>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isCustomSelected ? 'translate-x-0.5' : ''}`} />
          </div>
        </div>
      </div>

      {/* Modal Popup for "More than 1 hour" Custom Duration */}
      {isCustomModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsCustomModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0b5cff] flex items-center justify-center">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Set Custom Meeting Duration
                  </h3>
                  <p className="text-xs text-gray-500">
                    Select hours and minutes for sessions longer than 1 hour
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Pickers: Hours and Minutes */}
            <div className="grid grid-cols-2 gap-4">
              {/* Hours Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Hours (hr)
                </label>
                <div className="relative">
                  <select
                    value={tempHours}
                    onChange={(e) => setTempHours(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={5}>5 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={7}>7 hours</option>
                    <option value={8}>8 hours (Full Day)</option>
                  </select>
                </div>
              </div>

              {/* Minutes Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Minutes (min)
                </label>
                <div className="relative">
                  <select
                    value={tempMinutes}
                    onChange={(e) => setTempMinutes(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b5cff] focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value={0}>00 mins</option>
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Summary preview callout */}
            <div className="bg-blue-50/80 rounded-xl p-3.5 border border-blue-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-900">
                <Clock className="w-4 h-4 text-[#0b5cff] shrink-0" />
                <span>
                  Calculated Duration:{' '}
                  <strong className="font-bold text-[#0b5cff]">
                    {formatDurationText(tempHours, tempMinutes)}
                  </strong>
                </span>
              </div>
              <span className="font-mono font-bold text-[11px] text-[#0b5cff] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                {tempHours * 60 + tempMinutes} mins total
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDuration}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b5cff] text-white hover:bg-[#0049d1] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Apply Duration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

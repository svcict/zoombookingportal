import React from 'react';
import { ZoomMeetingConfig } from '../types';
import { Switch } from './Switch';

// The Zoom settings a booker can change - only those that map to a real
// Zoom API meeting setting (see src/lib/zoomApi.ts). Shared by the booking
// form and the Edit window so the two always offer the same choices with the
// same defaults and wording.
export type ZoomSettingsValue = Pick<
  ZoomMeetingConfig,
  'waitingRoom' | 'requireAuth' | 'hostVideo' | 'participantVideo' | 'audioOption' | 'joinAnytime' | 'muteOnEntry' | 'autoRecord'
>;

// Defaults for a new booking (and for any setting an older booking lacks).
export const DEFAULT_ZOOM_SETTINGS: ZoomSettingsValue = {
  waitingRoom: false,
  requireAuth: false,
  hostVideo: true,
  participantVideo: true,
  audioOption: 'computer',
  joinAnytime: true,
  muteOnEntry: true,
  autoRecord: true,
};

export const zoomSettingsFrom = (cfg?: Partial<ZoomMeetingConfig> | null): ZoomSettingsValue => ({
  waitingRoom: cfg?.waitingRoom ?? DEFAULT_ZOOM_SETTINGS.waitingRoom,
  requireAuth: cfg?.requireAuth ?? DEFAULT_ZOOM_SETTINGS.requireAuth,
  hostVideo: cfg?.hostVideo ?? DEFAULT_ZOOM_SETTINGS.hostVideo,
  participantVideo: cfg?.participantVideo ?? DEFAULT_ZOOM_SETTINGS.participantVideo,
  audioOption: cfg?.audioOption ?? DEFAULT_ZOOM_SETTINGS.audioOption,
  joinAnytime: cfg?.joinAnytime ?? DEFAULT_ZOOM_SETTINGS.joinAnytime,
  muteOnEntry: cfg?.muteOnEntry ?? DEFAULT_ZOOM_SETTINGS.muteOnEntry,
  autoRecord: cfg?.autoRecord ?? DEFAULT_ZOOM_SETTINGS.autoRecord,
});

const AUDIO_OPTIONS: { value: ZoomSettingsValue['audioOption']; label: string }[] = [
  { value: 'computer', label: 'Computer audio' },
  { value: 'telephone', label: 'Telephone' },
  { value: 'both', label: 'Telephone and computer' },
  { value: 'third_party', label: 'Third-party audio' },
];

interface ZoomSettingsFieldsProps {
  value: ZoomSettingsValue;
  onChange: (next: ZoomSettingsValue) => void;
  idPrefix: string; // keeps ids unique when two copies exist on a page
}

export const ZoomSettingsFields: React.FC<ZoomSettingsFieldsProps> = ({ value, onChange, idPrefix }) => {
  const set = <K extends keyof ZoomSettingsValue>(key: K, v: ZoomSettingsValue[K]) => onChange({ ...value, [key]: v });

  const row = (key: 'waitingRoom' | 'requireAuth' | 'joinAnytime' | 'muteOnEntry' | 'autoRecord', label: string, help: string) => (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div id={`${idPrefix}-${key}`} className="text-sm font-medium text-gray-900">{label}</div>
        <div id={`${idPrefix}-${key}-help`} className="text-xs text-gray-500 mt-0.5">{help}</div>
      </div>
      <Switch
        checked={value[key]}
        onChange={(v) => set(key, v)}
        labelledBy={`${idPrefix}-${key}`}
        describedBy={`${idPrefix}-${key}-help`}
      />
    </div>
  );

  const groupLabel = 'text-[11px] font-bold uppercase tracking-wider text-gray-500';

  return (
    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 px-4">
      <section aria-labelledby={`${idPrefix}-access`} className="py-1">
        <h4 id={`${idPrefix}-access`} className={`${groupLabel} pt-3`}>Who can get in</h4>
        {row('waitingRoom', 'Waiting room', 'The host lets each person in.')}
        {row('requireAuth', 'Zoom sign-in required', 'Guests must sign in to a Zoom account to join.')}
      </section>

      <section aria-labelledby={`${idPrefix}-meeting`} className="py-1">
        <h4 id={`${idPrefix}-meeting`} className={`${groupLabel} pt-3`}>During the meeting</h4>
        {row('joinAnytime', 'Join before the host', "If off, people wait until the host starts the meeting.")}
        {row('muteOnEntry', 'Mute people when they join', 'Everyone can unmute themselves.')}
        {row('autoRecord', 'Record to the cloud', 'Recording starts automatically when the meeting does.')}
      </section>

      <section aria-labelledby={`${idPrefix}-av`} className="py-3 space-y-3">
        <h4 id={`${idPrefix}-av`} className={groupLabel}>Video and audio</h4>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex items-center gap-3">
            <span id={`${idPrefix}-hostVideo`} className="text-sm text-gray-900">Host video</span>
            <Switch checked={value.hostVideo} onChange={(v) => set('hostVideo', v)} labelledBy={`${idPrefix}-hostVideo`} />
          </div>
          <div className="flex items-center gap-3">
            <span id={`${idPrefix}-participantVideo`} className="text-sm text-gray-900">Participant video</span>
            <Switch checked={value.participantVideo} onChange={(v) => set('participantVideo', v)} labelledBy={`${idPrefix}-participantVideo`} />
          </div>
        </div>
        <fieldset>
          <legend className="text-sm text-gray-900 mb-1.5">Audio</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {AUDIO_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 min-h-11 cursor-pointer text-sm text-gray-800">
                <input
                  type="radio"
                  name={`${idPrefix}-audio`}
                  value={opt.value}
                  checked={value.audioOption === opt.value}
                  onChange={() => set('audioOption', opt.value)}
                  className="w-4 h-4 accent-[#0433FF]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
    </div>
  );
};

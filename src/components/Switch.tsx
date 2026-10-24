import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  // Accessible name: either a visible label's id, or a plain label.
  labelledBy?: string;
  label?: string;
  describedBy?: string;
  disabled?: boolean;
}

// The one on/off switch used across the booking flow: a real role="switch"
// with its state announced, Signal Blue when on, and the brand focus ring
// (DESIGN.md) instead of no visible focus at all.
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, labelledBy, label, describedBy, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-labelledby={labelledBy}
    aria-label={labelledBy ? undefined : label}
    aria-describedby={describedBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0433FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? 'bg-[#0433FF]' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

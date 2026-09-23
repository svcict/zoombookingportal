import React from 'react';

// Plain inline SVGs instead of emoji glyphs — the headless renderer has no
// color-emoji font installed, so emoji characters render as empty tofu boxes.
export const LockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = '#64748b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth={2} />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={2} />
  </svg>
);

export const MailIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#e2e8f0' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth={2} />
    <path d="M3 7l9 6 9-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CalendarIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#e2e8f0' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth={2} />
    <path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export const ChevronDownIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#22c55e' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

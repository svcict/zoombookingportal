import React from 'react';

interface IconProps {
  className?: string;
}

// Apple's bitten-apple mark, for the "Apple Calendar" (.ics download) option.
export const AppleIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.47 2.28-1.17 3.09-.78.91-2.03 1.61-3.04 1.61-.12 0-.24-.02-.32-.03-.02-.11-.04-.25-.04-.39 0-1.1.55-2.24 1.26-3.02.8-.87 2.2-1.57 3.19-1.63.04.12.12.24.12.37zM20.8 17.46c-.47 1.08-.7 1.56-1.3 2.52-.84 1.34-2.02 3.01-3.49 3.02-1.3.02-1.64-.85-3.4-.84-1.77.01-2.15.86-3.45.84-1.47-.02-2.59-1.52-3.43-2.85-2.35-3.69-2.6-8.02-1.15-10.33.98-1.65 2.56-2.62 4.04-2.62 1.5 0 2.44.86 3.68.86 1.2 0 1.93-.86 3.68-.86 1.32 0 2.72.72 3.71 1.96-3.27 1.79-2.74 6.47.11 7.3z" />
  </svg>
);

// A simplified Google Calendar mark: four Google-brand-colored corner tabs
// around the familiar white date grid.
export const GoogleCalendarIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#4285F4" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#EA4335" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#34A853" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#FBBC05" />
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="white" stroke="#E0E0E0" strokeWidth="0.5" />
    <text x="12" y="15.2" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1A73E8" fontFamily="Arial, sans-serif">
      31
    </text>
  </svg>
);

// The Outlook / Microsoft 365 mark: a blue tile with the Outlook "O" ring
// and envelope flap.
export const MicrosoftOutlookIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#0078D4" />
    <path d="M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm4-2.3a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z" fill="white" />
    <path d="M4 7.2 12 11l8-3.8" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
  </svg>
);

import React from 'react';
import { Img, staticFile } from 'remotion';
import { Bell, Calendar, ChevronDown, Globe, Video } from 'lucide-react';
import { theme } from '../theme';

// Pixel-referenced against a live screenshot of Header.tsx (not hand-approximated):
// slim 64px white bar, Ayala logo + divider + product name, "Dashboard"/"Schedule"
// tabs (active = blue-50 pill), timezone pill with live clock, bell, round avatar.
export const AppShell: React.FC<{ activeTab?: 'dashboard' | 'booking'; children?: React.ReactNode; clock?: string }> = ({
  activeTab = 'booking',
  children,
  clock = '9:56:12 PM',
}) => {
  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.page, fontFamily: theme.sans, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: theme.white,
          borderBottom: `1px solid ${theme.border}`,
          height: 68,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Img src={staticFile('ayala_logo.png')} style={{ height: 30, objectFit: 'contain' }} />
            <div style={{ width: 1, height: 22, background: theme.border }} />
            <span style={{ fontWeight: 700, color: theme.gray900, fontSize: 16 }}>Zoom Booking Portal</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tab icon={<Calendar size={15} />} label="Dashboard" active={activeTab === 'dashboard'} />
            <Tab icon={<Video size={15} />} label="Schedule" active={activeTab === 'booking'} />
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              color: theme.gray700,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Globe size={14} color={theme.blue} />
            {`UTC (${clock})`}
            <ChevronDown size={13} color={theme.gray400} />
          </div>
          <Bell size={18} color={theme.gray500} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${theme.blue}, #6366f1)`,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              AS
            </div>
            <ChevronDown size={13} color={theme.gray400} />
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1 }}>{children}</div>
    </div>
  );
};

const Tab: React.FC<{ icon: React.ReactNode; label: string; active: boolean }> = ({ icon, label, active }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 14px',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      color: active ? theme.blue : theme.gray500,
      background: active ? theme.blue50 : 'transparent',
    }}
  >
    {icon}
    {label}
  </div>
);

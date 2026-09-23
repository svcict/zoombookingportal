import React from 'react';
import { Img, staticFile } from 'remotion';
import { Bell, Calendar, ChevronDown, Video } from 'lucide-react';
import { theme } from '../theme';

// Replicates Header.tsx: white sticky bar, Ayala logo + divider + product
// name, nav tabs (active = blue-50/blue text), timezone pill + bell on the right.
export const AppShell: React.FC<{ activeTab?: 'dashboard' | 'booking'; children?: React.ReactNode }> = ({
  activeTab = 'booking',
  children,
}) => {
  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.page, fontFamily: theme.sans, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: theme.white,
          borderBottom: `1px solid ${theme.border}`,
          height: 96,
          display: 'flex',
          alignItems: 'center',
          padding: '0 56px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Img src={staticFile('ayala_logo.png')} style={{ height: 44, objectFit: 'contain' }} />
            <div style={{ width: 1, height: 28, background: theme.border }} />
            <span style={{ fontWeight: 700, color: theme.gray700, fontSize: 18 }}>Zoom Booking Portal</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 24, borderLeft: `1px solid ${theme.border}` }}>
            <Tab icon={<Calendar size={17} />} label="Dashboard" active={activeTab === 'dashboard'} />
            <Tab icon={<Video size={17} />} label="Schedule Meeting" active={activeTab === 'booking'} />
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 999,
              border: `1px solid ${theme.border}`,
              color: theme.gray500,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Asia/Manila
            <ChevronDown size={14} />
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.gray500,
            }}
          >
            <Bell size={18} />
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: theme.blue,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            AS
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
      gap: 8,
      padding: '10px 18px',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      color: active ? theme.blue : theme.gray500,
      background: active ? theme.blue50 : 'transparent',
    }}
  >
    {icon}
    {label}
  </div>
);

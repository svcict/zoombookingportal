import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Calendar, Layers } from 'lucide-react';
import { theme } from '../theme';
import { Card, PrimaryButton } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';
import { WeekGrid } from '../components/WeekGrid';

// Local 0-90: real login gate card (logos, MS button) fading into the real
// dashboard (welcome banner + weekly grid + empty "My Booked Meetings").
export const Scene1SignIn: React.FC = () => {
  const frame = useCurrentFrame();
  const gateOpacity = interpolate(frame, [42, 62], [1, 0], { extrapolateRight: 'clamp' });
  const shellOpacity = interpolate(frame, [46, 66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ opacity: shellOpacity }}>
        <AppShell activeTab="dashboard">
          <div style={{ padding: '40px 56px' }}>
            <Card style={{ padding: '24px 32px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: theme.blue50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color={theme.blue} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: theme.gray900 }}>Welcome, Amiel Sobisol!</div>
                  <div style={{ fontSize: 13, color: theme.gray500, marginTop: 2 }}>
                    Email: sobisol.ab@ayalafoundation.org {'•'} Timezone: UTC {'•'} Hours: 8:00 AM – 5:00 PM
                  </div>
                </div>
              </div>
              <div style={{ background: theme.blue, color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 10, padding: '11px 18px' }}>
                + Schedule Meeting
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
              <WeekGrid />
              <Card style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 18, color: theme.gray900 }}>My Booked Meetings</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.blue, background: theme.blue50, borderRadius: 999, padding: '3px 10px' }}>
                    0 Booked
                  </span>
                </div>
                <div style={{ fontSize: 13, color: theme.gray500, marginBottom: 20 }}>
                  Your personal meeting schedule. Only meetings booked under your account are displayed here.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 12px', color: theme.gray400 }}>
                  <Layers size={30} />
                  <div style={{ fontWeight: 700, color: theme.gray700, marginTop: 12, fontSize: 15 }}>No booked meetings yet</div>
                </div>
              </Card>
            </div>
          </div>
        </AppShell>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: gateOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #EFF3FA 0%, #F7F9FA 60%)',
        }}
      >
        <Card style={{ width: 560, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '36px 40px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <Img src={staticFile('ayala_logo.png')} style={{ height: 40, objectFit: 'contain' }} />
              <Img src={staticFile('zoom_logo.png')} style={{ height: 26, objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.gray900, marginBottom: 8 }}>Sign In</div>
            <div style={{ fontSize: 14, color: theme.gray500, lineHeight: 1.5 }}>
              Sign in with your Microsoft 365 account to access the Zoom Booking Portal
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${theme.borderLight}`, padding: '24px 40px 32px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: '14px 18px',
                transform: `scale(${frame >= 38 && frame < 42 ? 0.97 : 1})`,
              }}
            >
              <MsIcon />
              <span style={{ fontWeight: 700, fontSize: 15, color: theme.gray900 }}>Login using Microsoft 365</span>
            </div>
          </div>
        </Card>
      </div>

      <Cursor
        keyframes={[
          { frame: 0, x: 960, y: 900 },
          { frame: 30, x: 960, y: 760 },
          { frame: 38, x: 960, y: 630 },
        ]}
        clicks={[38]}
      />
    </div>
  );
};

const MsIcon: React.FC = () => (
  <div style={{ width: 18, height: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2 }}>
    <div style={{ background: '#f25022' }} />
    <div style={{ background: '#7fba00' }} />
    <div style={{ background: '#00a4ef' }} />
    <div style={{ background: '#ffb900' }} />
  </div>
);

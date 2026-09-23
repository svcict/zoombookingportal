import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Video } from 'lucide-react';
import { theme } from '../theme';
import { Card, PrimaryButton } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

// Local 0-90: quick SSO sign-in card, fading straight into the dashboard shell.
export const Scene1SignIn: React.FC = () => {
  const frame = useCurrentFrame();
  const gateOpacity = interpolate(frame, [40, 65], [1, 0], { extrapolateRight: 'clamp' });
  const shellOpacity = interpolate(frame, [45, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ opacity: shellOpacity }}>
        <AppShell activeTab="dashboard" />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: gateOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.page,
        }}
      >
        <Card style={{ width: 520, padding: 48, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 20px',
              borderRadius: 14,
              background: theme.blue,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Video color="#fff" size={26} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: theme.gray900, marginBottom: 6 }}>Zoom Booking Portal</div>
          <div style={{ fontSize: 15, color: theme.gray500, marginBottom: 26 }}>
            Sign in with your organization account to continue
          </div>
          <PrimaryButton label="Login using Microsoft 365" wide pressedAt={38} />
        </Card>
      </div>

      <Cursor
        keyframes={[
          { frame: 0, x: 960, y: 900 },
          { frame: 30, x: 960, y: 780 },
          { frame: 38, x: 960, y: 668 },
        ]}
        clicks={[38]}
      />
    </div>
  );
};

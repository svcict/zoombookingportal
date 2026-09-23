import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Bell, BellOff } from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

// Local 0-90: push notification opt-in pill, replicating BookingConfirmation.tsx.
export const Scene8Push: React.FC = () => {
  const frame = useCurrentFrame();
  const enabled = frame >= 45;

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '48px 56px', display: 'flex', justifyContent: 'center' }}>
        <Card style={{ width: 880, padding: 40 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.gray900, marginBottom: 20 }}>
            Q4 Partnership Review
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              background: enabled ? theme.green50 : theme.white,
              color: enabled ? '#15803d' : theme.gray700,
              border: `1px solid ${enabled ? '#BBF7D0' : theme.border}`,
              transform: `scale(${interpolate(frame, [45, 52], [0.95, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            }}
          >
            {enabled ? <Bell size={16} /> : <BellOff size={16} />}
            {enabled ? 'Notifications enabled for this browser' : 'Get a browser notification before this meeting'}
          </div>
        </Card>
      </div>

      <Cursor keyframes={[{ frame: 15, x: 800, y: 480 }, { frame: 45, x: 800, y: 460 }]} clicks={[45]} />
    </AppShell>
  );
};

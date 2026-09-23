import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Bell, Check, Clock, Sparkles } from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { AppShell } from '../components/AppShell';

// Local 0-120: the top confirmation card exactly as the real app shows it —
// checkmark, "You are scheduled!", big heading, countdown pill, and the
// browser-notification opt-in button (no error banner — that only appears
// in the sandbox when no mailbox is configured, not a feature to show).
export const Scene5ConfirmationIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const checkScale = interpolate(frame, [5, 20], [0.4, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const enabled = frame >= 85;

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '80px 56px', display: 'flex', justifyContent: 'center' }}>
        <Card style={{ width: 780, padding: '48px 40px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: '#DCFCE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              transform: `scale(${checkScale})`,
            }}
          >
            <Check size={26} color="#16A34A" />
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#DCFCE7',
              color: '#15803d',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 999,
              padding: '6px 14px',
              marginBottom: 16,
            }}
          >
            <Sparkles size={13} />
            You are scheduled!
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: theme.gray900, marginBottom: 28 }}>Zoom Meeting Confirmed</div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: theme.blue50,
              color: theme.blue,
              border: `1px solid ${theme.blue100}`,
              borderRadius: 999,
              padding: '9px 18px',
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 18,
            }}
          >
            <Clock size={14} />
            Meeting countdown: 10h 3m
          </div>

          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: `1px solid ${enabled ? '#BBF7D0' : theme.border}`,
                background: enabled ? '#F0FDF4' : '#fff',
                color: enabled ? '#15803d' : theme.gray700,
                borderRadius: 999,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                transform: `scale(${frame >= 82 && frame < 88 ? 0.96 : 1})`,
              }}
            >
              <Bell size={14} />
              {enabled ? 'Notifications enabled for this browser' : 'Get a browser notification before this meeting'}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

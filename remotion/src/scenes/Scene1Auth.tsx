import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { Card, PrimaryButton, Spinner } from '../components/ui';
import { Cursor } from '../components/Cursor';

// Frames 0-540 (local). Sub-phases: AuthGate (0-150) -> OAuth consent (150-300)
// -> callback/session exchange (300-540).
export const Scene1Auth: React.FC = () => {
  const frame = useCurrentFrame();

  const gateOpacity = interpolate(frame, [0, 130, 155], [1, 1, 0], { extrapolateRight: 'clamp' });
  const oauthOpacity = interpolate(frame, [130, 155, 280, 300], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const callbackOpacity = interpolate(frame, [280, 300, 520, 540], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 30% 20%, #172554 0%, ${theme.bg} 55%)`,
      }}
    >
      {/* --- AuthGate --- */}
      <div style={{ position: 'absolute', inset: 0, opacity: gateOpacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: 560, padding: 48, textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 24px',
              borderRadius: 16,
              background: `linear-gradient(135deg, ${theme.indigo}, ${theme.indigoDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              fontFamily: theme.sans,
            }}
          >
            Z
          </div>
          <div style={{ color: theme.text, fontSize: 26, fontWeight: 700, fontFamily: theme.sans, marginBottom: 8 }}>
            Zoom Booking Portal
          </div>
          <div style={{ color: theme.textDim, fontSize: 16, fontFamily: theme.sans, marginBottom: 32 }}>
            Sign in with your organization account to continue
          </div>
          <PrimaryButton label="Login using Microsoft 365" wide pressedAt={125} />
        </Card>
      </div>

      {/* --- Microsoft OAuth consent / callback (idealized) --- */}
      <div style={{ position: 'absolute', inset: 0, opacity: oauthOpacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: 600, padding: 44, background: '#1b1b1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div
              style={{
                width: 28,
                height: 28,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: 2,
              }}
            >
              <div style={{ background: '#f25022' }} />
              <div style={{ background: '#7fba00' }} />
              <div style={{ background: '#00a4ef' }} />
              <div style={{ background: '#ffb900' }} />
            </div>
            <span style={{ color: '#e2e8f0', fontFamily: theme.sans, fontSize: 18, fontWeight: 600 }}>Microsoft</span>
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, fontFamily: theme.sans, marginBottom: 6 }}>
            Ayala Foundation is requesting access
          </div>
          <div style={{ color: '#9ca3af', fontSize: 15, fontFamily: theme.sans, marginBottom: 24 }}>
            Zoom Booking Portal wants to sign you in and read your basic profile &amp; calendar free/busy data.
          </div>
          <div
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: `1px solid ${theme.indigo}`,
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: theme.indigoLight,
              fontFamily: theme.mono,
              fontSize: 15,
            }}
          >
            <Spinner size={16} color={theme.indigoLight} />
            {'Redirecting back to Zoom Booking Portal…'}
          </div>
        </Card>
      </div>

      {/* --- Callback / session exchange --- */}
      <div style={{ position: 'absolute', inset: 0, opacity: callbackOpacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: 480, padding: 48, textAlign: 'center' }}>
          <div style={{ color: theme.text, fontSize: 22, fontWeight: 700, fontFamily: theme.sans, marginBottom: 22 }}>
            {'Completing sign-in…'}
          </div>
          <ExchangeProgress frame={frame} />
        </Card>
      </div>

      <Cursor
        keyframes={[
          { frame: 0, x: 960, y: 900 },
          { frame: 90, x: 960, y: 780 },
          { frame: 125, x: 960, y: 668 },
        ]}
        clicks={[128]}
      />
    </div>
  );
};

const ExchangeProgress: React.FC<{ frame: number }> = ({ frame }) => {
  const pct = interpolate(frame, [300, 480], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const done = frame >= 490;
  return (
    <div>
      <div style={{ width: '100%', height: 8, borderRadius: 999, background: theme.border, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${theme.indigo}, ${theme.green})` }} />
      </div>
      <div style={{ color: done ? theme.green : theme.textDim, fontFamily: theme.mono, fontSize: 14 }}>
        {done ? '✓ Session verified' : 'Exchanging authorization code…'}
      </div>
    </div>
  );
};

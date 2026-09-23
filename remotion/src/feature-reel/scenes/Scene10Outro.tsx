import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { theme } from '../theme';

export const Scene10Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: theme.page,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        fontFamily: theme.sans,
      }}
    >
      <Img src={staticFile('ayala_logo.png')} style={{ height: 70, objectFit: 'contain', marginBottom: 24 }} />
      <div style={{ fontSize: 38, fontWeight: 800, color: theme.gray900, marginBottom: 10 }}>
        Real availability. Real Zoom meetings.
      </div>
      <div style={{ fontSize: 24, color: theme.blue, fontWeight: 700 }}>Zero double-bookings.</div>
    </div>
  );
};

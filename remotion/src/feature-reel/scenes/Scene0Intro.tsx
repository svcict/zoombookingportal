import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { theme } from '../theme';

export const Scene0Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, 70, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 20], [0.96, 1], { extrapolateRight: 'clamp' });

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
      <div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img src={staticFile('ayala_logo.png')} style={{ height: 90, objectFit: 'contain', marginBottom: 28 }} />
        <div style={{ fontSize: 52, fontWeight: 800, color: theme.gray900, marginBottom: 12 }}>Zoom Booking Portal</div>
        <div style={{ fontSize: 24, fontWeight: 500, color: theme.gray500 }}>
          {'Book. Confirm. Show up. — no back-and-forth required.'}
        </div>
      </div>
    </div>
  );
};

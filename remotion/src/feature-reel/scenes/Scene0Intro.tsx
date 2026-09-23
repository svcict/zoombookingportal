import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { FPS } from '../data';

export const Scene0Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, 70, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps: FPS, config: { damping: 14, mass: 0.6 } }) * 0.06 + 0.94;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, #EFF3FA 0%, #F7F9FA 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        fontFamily: theme.sans,
      }}
    >
      <div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 32 }}>
          <Img src={staticFile('ayala_logo.png')} style={{ height: 64, objectFit: 'contain' }} />
          <div style={{ width: 1, height: 48, background: theme.border }} />
          <Img src={staticFile('zoom_logo.png')} style={{ height: 40, objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: theme.gray900, marginBottom: 12 }}>Zoom Booking Portal</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: theme.gray500 }}>
          {'Book. Confirm. Show up. — no back-and-forth required.'}
        </div>
      </div>
    </div>
  );
};

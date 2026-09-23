import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CALLOUTS } from '../data';

// Minimal benefit callout, bottom-left — meant to be talked over by a live
// narrator, not read as a script. Short phrase only, brief on/off screen time.
export const Callout: React.FC = () => {
  const frame = useCurrentFrame();
  const entry = CALLOUTS.find((e) => frame >= e.from && frame < e.to);
  if (!entry) return null;

  const local = frame - entry.from;
  const remaining = entry.to - frame;
  const enter = interpolate(local, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exit = interpolate(remaining, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(enter, exit);
  const translateX = interpolate(enter, [0, 1], [-16, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        bottom: 56,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: theme.white,
          border: `1px solid ${theme.border}`,
          borderRadius: 999,
          padding: '14px 26px',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 999, background: theme.blue }} />
        <span style={{ fontFamily: theme.sans, fontSize: 22, fontWeight: 700, color: theme.gray900 }}>
          {entry.text}
        </span>
      </div>
    </div>
  );
};

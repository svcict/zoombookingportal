import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CAPTION_TIMELINE } from '../captions';

export const CaptionBanner: React.FC = () => {
  const frame = useCurrentFrame();
  const entry = CAPTION_TIMELINE.find((e) => frame >= e.from && frame < e.to);
  if (!entry) return null;

  const local = frame - entry.from;
  const remaining = entry.to - frame;
  const enter = interpolate(local, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exit = interpolate(remaining, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(enter, exit);
  const translateY = interpolate(enter, [0, 1], [24, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 72,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          maxWidth: 1360,
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: 8, background: `linear-gradient(180deg, ${theme.indigo}, ${theme.indigoDark})` }} />
        <div
          style={{
            padding: '20px 32px',
            fontFamily: theme.sans,
            fontSize: 26,
            fontWeight: 600,
            color: theme.text,
            lineHeight: 1.35,
          }}
        >
          {entry.text}
        </div>
      </div>
    </div>
  );
};

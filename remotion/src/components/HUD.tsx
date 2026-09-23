import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { HUD_KIND_LABEL, HUD_TIMELINE } from '../hudTimeline';

const KIND_COLOR = {
  component: theme.indigoLight,
  flow: theme.amber,
  server: theme.green,
  api: theme.amber,
} as const;

// Absolute-frame HUD: sits outside every <Sequence>, so useCurrentFrame()
// here is already the global timeline position — no offset math needed.
export const HUD: React.FC = () => {
  const frame = useCurrentFrame();
  const entry = HUD_TIMELINE.find((e) => frame >= e.from && frame < e.to);
  if (!entry) return null;

  const local = frame - entry.from;
  const remaining = entry.to - frame;
  const enter = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exit = interpolate(remaining, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(enter, exit);
  const translateY = interpolate(enter, [0, 1], [10, 0]);
  const pulse = (Math.sin(frame / 5) + 1) / 2;
  const color = KIND_COLOR[entry.kind];

  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        right: 44,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          background: theme.panel,
          border: `1px solid ${theme.borderLight}`,
          borderRadius: 12,
          padding: '16px 22px',
          minWidth: 420,
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: color,
              boxShadow: `0 0 ${6 + pulse * 10}px ${color}`,
            }}
          />
          <span
            style={{
              fontFamily: theme.mono,
              fontSize: 12,
              letterSpacing: 2,
              color: theme.textFaint,
              fontWeight: 600,
            }}
          >
            LIVE FUNCTION CALL
          </span>
        </div>
        <div
          style={{
            fontFamily: theme.mono,
            fontSize: 24,
            fontWeight: 700,
            color: theme.text,
            whiteSpace: 'nowrap',
          }}
        >
          {entry.label}
        </div>
        <div
          style={{
            fontFamily: theme.mono,
            fontSize: 11,
            letterSpacing: 1.5,
            color,
            marginTop: 4,
            fontWeight: 700,
          }}
        >
          {HUD_KIND_LABEL[entry.kind]}
        </div>
      </div>
    </div>
  );
};

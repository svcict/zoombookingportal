import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';

export const Card: React.FC<React.PropsWithChildren<{ style?: React.CSSProperties }>> = ({ children, style }) => (
  <div
    style={{
      background: theme.white,
      border: `1px solid ${theme.border}`,
      borderRadius: 16,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const TypedText: React.FC<{ text: string; from: number; to: number; style?: React.CSSProperties }> = ({
  text,
  from,
  to,
  style,
}) => {
  const frame = useCurrentFrame();
  const count = Math.round(
    interpolate(frame, [from, to], [0, text.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  const showCaret = frame >= from && frame < to;
  const blink = Math.floor(frame / 10) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, count)}
      {showCaret && blink ? <span style={{ opacity: 0.6 }}>|</span> : null}
    </span>
  );
};

export const Chip: React.FC<{ text: string; appearAt: number }> = ({ text, appearAt }) => {
  const frame = useCurrentFrame();
  if (frame < appearAt) return null;
  const local = frame - appearAt;
  const scale = interpolate(local, [0, 10], [0.6, 1], { extrapolateRight: 'clamp' });
  const opacity = interpolate(local, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: theme.blue50,
        color: theme.blue,
        border: `1px solid ${theme.blue100}`,
        borderRadius: 999,
        padding: '8px 16px',
        fontSize: 15,
        fontWeight: 600,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {text}
    </span>
  );
};

export const Toggle: React.FC<{ on: boolean; activeAt?: number; label: string }> = ({ on, activeAt, label }) => {
  const frame = useCurrentFrame();
  const progress =
    activeAt !== undefined
      ? interpolate(frame, [activeAt, activeAt + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : on
      ? 1
      : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <span style={{ color: theme.gray700, fontSize: 17, fontWeight: 500 }}>{label}</span>
      <div style={{ width: 48, height: 26, borderRadius: 999, background: theme.border, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: theme.blue, opacity: progress }} />
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: 3 + progress * 22,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
};

export const PrimaryButton: React.FC<{ label: string; pressedAt?: number; wide?: boolean }> = ({
  label,
  pressedAt,
  wide,
}) => {
  const frame = useCurrentFrame();
  const pressed = pressedAt !== undefined && frame >= pressedAt && frame < pressedAt + 8;
  return (
    <div
      style={{
        display: wide ? 'flex' : 'inline-flex',
        justifyContent: 'center',
        background: theme.blue,
        color: '#fff',
        fontWeight: 700,
        fontSize: 18,
        borderRadius: 12,
        padding: '16px 28px',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        boxShadow: '0 8px 20px rgba(11,92,255,0.25)',
      }}
    >
      {label}
    </div>
  );
};

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 13, letterSpacing: 0.5, color: theme.gray500, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>
    {children}
  </div>
);

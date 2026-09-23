import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';

export const Card: React.FC<React.PropsWithChildren<{ style?: React.CSSProperties }>> = ({ children, style }) => (
  <div
    style={{
      background: theme.panelSolid,
      border: `1px solid ${theme.border}`,
      borderRadius: 16,
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      ...style,
    }}
  >
    {children}
  </div>
);

// Reveals `text` character-by-character across the local frame window [from, to].
export const TypedText: React.FC<{
  text: string;
  from: number;
  to: number;
  style?: React.CSSProperties;
  cursor?: boolean;
}> = ({ text, from, to, style, cursor = true }) => {
  const frame = useCurrentFrame();
  const count = Math.round(
    interpolate(frame, [from, to], [0, text.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  const showCaret = cursor && frame >= from && frame < to;
  const blink = Math.floor(frame / 10) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, count)}
      {showCaret && blink ? (
        <span style={{ opacity: 0.85, marginLeft: 1 }}>|</span>
      ) : null}
    </span>
  );
};

export const Toggle: React.FC<{ on: boolean; activeAt?: number; label: string }> = ({ on, activeAt, label }) => {
  const frame = useCurrentFrame();
  const isOn = activeAt !== undefined ? frame >= activeAt : on;
  const progress = activeAt !== undefined
    ? interpolate(frame, [activeAt, activeAt + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : on
    ? 1
    : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <span style={{ color: theme.textDim, fontFamily: theme.sans, fontSize: 18 }}>{label}</span>
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${theme.border}, ${theme.border})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.indigo,
            opacity: progress,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: 3 + progress * 20,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: '#f8fafc',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </div>
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
        gap: 6,
        background: theme.indigoDark,
        color: theme.indigoLight,
        border: `1px solid ${theme.indigo}`,
        borderRadius: 999,
        padding: '6px 14px',
        fontSize: 15,
        fontFamily: theme.sans,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {text}
    </span>
  );
};

export const PrimaryButton: React.FC<{ label: string; pressedAt?: number; wide?: boolean }> = ({
  label,
  pressedAt,
  wide,
}) => {
  const frame = useCurrentFrame();
  const pressed = pressedAt !== undefined && frame >= pressedAt && frame < pressedAt + 8;
  const loading = pressedAt !== undefined && frame >= pressedAt + 8;
  return (
    <div
      style={{
        display: wide ? 'flex' : 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        background: `linear-gradient(180deg, ${theme.indigo}, ${theme.indigoDark})`,
        color: '#fff',
        fontFamily: theme.sans,
        fontWeight: 700,
        fontSize: 18,
        borderRadius: 10,
        padding: '14px 26px',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        boxShadow: pressed ? '0 4px 12px rgba(99,102,241,0.35)' : '0 10px 24px rgba(99,102,241,0.35)',
      }}
    >
      {loading ? <Spinner size={16} /> : null}
      {loading ? 'Generating…' : label}
    </div>
  );
};

export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#fff' }) => {
  const frame = useCurrentFrame();
  const rotate = (frame * 14) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: `2.5px solid rgba(255,255,255,0.25)`,
        borderTopColor: color,
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
};

export const ProgressBar: React.FC<{ from: number; to: number; color?: string }> = ({
  from,
  to,
  color = theme.indigo,
}) => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [from, to], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 999, background: theme.border, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  );
};

export const MaskedReveal: React.FC<{ value: string; revealFrom: number; revealTo: number; hideFrom: number }> = ({
  value,
  revealFrom,
  revealTo,
  hideFrom,
}) => {
  const frame = useCurrentFrame();
  const revealed = frame >= revealFrom && frame < hideFrom;
  const opacity = interpolate(frame, [revealFrom, revealTo], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <span style={{ fontFamily: theme.mono, fontSize: 20, letterSpacing: 3, color: theme.text, position: 'relative' }}>
      <span style={{ opacity: revealed ? 1 - opacity * 0 : 1, filter: revealed ? 'none' : 'blur(0px)' }}>
        {revealed ? value : '•'.repeat(value.length)}
      </span>
    </span>
  );
};

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: theme.mono,
      fontSize: 12,
      letterSpacing: 2,
      color: theme.textFaint,
      fontWeight: 700,
      marginBottom: 10,
    }}
  >
    {children}
  </div>
);

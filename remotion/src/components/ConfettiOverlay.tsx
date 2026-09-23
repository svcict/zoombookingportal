import React, { useMemo } from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';
import { theme } from '../theme';

const COLORS = [theme.indigo, theme.indigoLight, theme.green, theme.amber, '#f8fafc'];

interface Particle {
  seed: string;
  x: number;
  delay: number;
  size: number;
  color: string;
  rotationSpeed: number;
  drift: number;
}

// Deterministic CSS confetti burst — no external asset or GIF dependency.
export const ConfettiOverlay: React.FC<{ startFrame: number; count?: number }> = ({ startFrame, count = 60 }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = `confetti-${i}`;
        return {
          seed,
          x: random(seed + 'x') * 100,
          delay: random(seed + 'd') * 14,
          size: 6 + random(seed + 's') * 8,
          color: COLORS[Math.floor(random(seed + 'c') * COLORS.length)],
          rotationSpeed: 180 + random(seed + 'r') * 540,
          drift: (random(seed + 'df') - 0.5) * 200,
        };
      }),
    [count]
  );

  if (local < 0 || local > 130) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => {
        const t = local - p.delay;
        if (t < 0) return null;
        const fall = interpolate(t, [0, 110], [-40, 900], { extrapolateRight: 'clamp' });
        const opacity = interpolate(t, [0, 10, 90, 110], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
        const driftX = interpolate(t, [0, 110], [0, p.drift]);
        const rotate = t * p.rotationSpeed * 0.1;
        return (
          <div
            key={p.seed}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: fall,
              width: p.size,
              height: p.size * 0.5,
              background: p.color,
              opacity,
              transform: `translateX(${driftX}px) rotate(${rotate}deg)`,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
};

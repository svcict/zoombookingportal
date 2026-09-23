import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';

export interface CursorKeyframe {
  frame: number;
  x: number;
  y: number;
}

function getPosition(frame: number, keyframes: CursorKeyframe[]): { x: number; y: number } {
  if (frame <= keyframes[0].frame) return { x: keyframes[0].x, y: keyframes[0].y };
  const last = keyframes[keyframes.length - 1];
  if (frame >= last.frame) return { x: last.x, y: last.y };
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const x = interpolate(frame, [a.frame, b.frame], [a.x, b.x], { easing: Easing.inOut(Easing.cubic) });
      const y = interpolate(frame, [a.frame, b.frame], [a.y, b.y], { easing: Easing.inOut(Easing.cubic) });
      return { x, y };
    }
  }
  return { x: last.x, y: last.y };
}

export const Cursor: React.FC<{ keyframes: CursorKeyframe[]; clicks?: number[] }> = ({ keyframes, clicks = [] }) => {
  const frame = useCurrentFrame();
  const { x, y } = getPosition(frame, keyframes);

  return (
    <>
      {clicks.map((clickFrame) => {
        const local = frame - clickFrame;
        if (local < 0 || local > 22) return null;
        const pos = getPosition(clickFrame, keyframes);
        const scale = interpolate(local, [0, 22], [0.2, 2.4], { easing: Easing.out(Easing.cubic) });
        const opacity = interpolate(local, [0, 22], [0.5, 0], { extrapolateRight: 'clamp' });
        return (
          <div
            key={clickFrame}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: 26,
              height: 26,
              marginLeft: -13,
              marginTop: -13,
              borderRadius: 999,
              border: `2px solid ${theme.blue}`,
              background: 'rgba(11, 92, 255, 0.18)',
              transform: `scale(${scale})`,
              opacity,
              pointerEvents: 'none',
            }}
          />
        );
      })}
      <svg
        width={26}
        height={32}
        viewBox="0 0 28 34"
        style={{ position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.3))', pointerEvents: 'none' }}
      >
        <path
          d="M2 2 L2 26 L9 20 L13.5 30 L18 28 L13.5 18 L22 18 Z"
          fill="#1f2937"
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};

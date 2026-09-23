import React from 'react';
import { spring, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { FPS, WIDTH, HEIGHT } from '../data';

// Frames the whole video as a browser window on a soft light backdrop —
// pure framing chrome around the real app UI, doesn't touch any scene's
// internals. The scenes are authored at the full 1920x1080 canvas and get
// uniformly scaled down to fit the window's content area, so every
// existing coordinate (including the hand-verified cursor targets) stays
// correct relative to that inner space.
const MARGIN_X = 80;
const CHROME_HEIGHT = 40;
const WINDOW_WIDTH = WIDTH - MARGIN_X * 2;
const CONTENT_SCALE = WINDOW_WIDTH / WIDTH;
const CONTENT_HEIGHT = HEIGHT * CONTENT_SCALE;
const WINDOW_HEIGHT = CONTENT_HEIGHT + CHROME_HEIGHT;
const MARGIN_Y = (HEIGHT - WINDOW_HEIGHT) / 2;

export const BrowserChrome: React.FC<React.PropsWithChildren> = ({ children }) => {
  const frame = useCurrentFrame();
  const entrance = spring({ frame, fps: FPS, config: { damping: 16, mass: 0.7 } });
  const scale = 0.96 + entrance * 0.04;
  const opacity = Math.min(1, entrance * 1.4);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, #EEF2FA 0%, #F7F9FA 55%, #F1F4F9 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: MARGIN_X,
          top: MARGIN_Y,
          width: WINDOW_WIDTH,
          height: WINDOW_HEIGHT,
          borderRadius: 16,
          overflow: 'hidden',
          background: theme.white,
          boxShadow: '0 40px 80px -20px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15,23,42,0.06)',
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <div
          style={{
            height: CHROME_HEIGHT,
            background: '#F3F4F6',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 7 }}>
            <Dot color="#FF5F57" />
            <Dot color="#FEBC2E" />
            <Dot color="#28C840" />
          </div>
          <div
            style={{
              flex: 1,
              maxWidth: 340,
              background: theme.white,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              padding: '4px 14px',
              fontSize: 11,
              color: theme.gray500,
              fontFamily: theme.sans,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Lock />
            zoombookingportal.com
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: CONTENT_HEIGHT, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: WIDTH, height: HEIGHT, transform: `scale(${CONTENT_SCALE})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 11, height: 11, borderRadius: 999, background: color }} />
);

const Lock: React.FC = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={theme.gray400} strokeWidth={2.5} />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={theme.gray400} strokeWidth={2.5} />
  </svg>
);

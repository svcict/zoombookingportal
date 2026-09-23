import React, { useMemo } from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { Card, SectionLabel, TypedText } from '../components/ui';
import { Cursor } from '../components/Cursor';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const ROWS = 7;

type CellState = 'free' | 'busy';

// Frames 540-2040 (local 0-1500). Sub-phases: bookings list load (0-180) ->
// dual-account scan (180-720) -> M365 busy-block overlay + slot pick (720-1500).
export const Scene2Availability: React.FC = () => {
  const frame = useCurrentFrame();

  const grid: CellState[][] = useMemo(
    () =>
      DAYS.map((_, d) =>
        Array.from({ length: ROWS }, (_, r) => (random(`slot-${d}-${r}`) > 0.32 ? 'free' : 'busy'))
      ),
    []
  );

  const scanX = interpolate(frame, [180, 700], [0, DAYS.length - 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const overlayOpacity = interpolate(frame, [720, 780], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const selected = frame >= 1420;

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, padding: 64, display: 'flex', gap: 40 }}>
      {/* Left: meeting metadata panel */}
      <Card style={{ width: 460, padding: 36, flexShrink: 0, alignSelf: 'flex-start' }}>
        <SectionLabel>NEW MEETING</SectionLabel>
        <FieldBlock label="Topic">
          <TypedText text="Q4 Planning Sync" from={30} to={140} style={{ color: theme.text, fontSize: 20, fontFamily: theme.sans }} />
        </FieldBlock>
        <FieldBlock label="Duration">
          <div style={{ color: theme.text, fontSize: 20, fontFamily: theme.sans, opacity: frame > 200 ? 1 : 0 }}>30 minutes</div>
        </FieldBlock>
        <FieldBlock label="Booked by">
          <div style={{ color: theme.textDim, fontSize: 18, fontFamily: theme.sans }}>sobisol.ab@ayalafoundation.org</div>
        </FieldBlock>

        <div style={{ marginTop: 28 }}>
          <SectionLabel>MY BOOKED MEETINGS</SectionLabel>
          <BookingsSkeleton frame={frame} />
        </div>
      </Card>

      {/* Right: availability grid */}
      <Card style={{ flex: 1, padding: 36, position: 'relative', overflow: 'hidden' }}>
        <SectionLabel>{'AVAILABILITY — THIS WEEK'}</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${DAYS.length}, 1fr)`, gap: 14, position: 'relative' }}>
          {DAYS.map((day, d) => (
            <div key={day}>
              <div style={{ color: theme.textDim, fontFamily: theme.sans, fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 10 }}>
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grid[d].map((state, r) => {
                  const isSelected = selected && d === 2 && r === 3;
                  return (
                    <div
                      key={r}
                      style={{
                        height: 34,
                        borderRadius: 8,
                        background: isSelected
                          ? theme.indigo
                          : state === 'free'
                          ? theme.greenDim
                          : theme.redDim,
                        border: `1px solid ${isSelected ? theme.indigoLight : state === 'free' ? theme.green : theme.red}`,
                        transition: 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* scanning sweep bar for the dual-account check */}
          {frame >= 180 && frame < 720 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: `${100 / DAYS.length}%`,
                left: `${(scanX / DAYS.length) * 100}%`,
                background: 'linear-gradient(180deg, rgba(129,140,248,0.28), rgba(129,140,248,0.05))',
                border: `1px solid ${theme.indigoLight}`,
                borderRadius: 10,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {frame >= 180 && frame < 720 && (
          <div style={{ marginTop: 18, color: theme.indigoLight, fontFamily: theme.mono, fontSize: 14 }}>
            {'Checking Account A • Checking Account B…'}
          </div>
        )}

        {/* M365 busy-block overlay strip */}
        <div
          style={{
            marginTop: 26,
            opacity: overlayOpacity,
            background: theme.panelAlt,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: '14px 18px',
          }}
        >
          <div style={{ color: theme.textFaint, fontFamily: theme.mono, fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>
            {'MICROSOFT 365 FREE/BUSY — MERGED'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 18,
                  borderRadius: 3,
                  background: random(`fb-${i}`) > 0.7 ? theme.red : theme.borderLight,
                  opacity: random(`fb-${i}`) > 0.7 ? 0.6 : 0.4,
                }}
              />
            ))}
          </div>
        </div>

        {selected && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 36,
              background: theme.greenDim,
              border: `1px solid ${theme.green}`,
              color: theme.green,
              fontFamily: theme.mono,
              fontSize: 13,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 999,
              opacity: interpolate(frame, [1420, 1440], [0, 1], { extrapolateLeft: 'clamp' }),
            }}
          >
            SLOT SELECTED
          </div>
        )}
      </Card>

      <Cursor
        keyframes={[
          { frame: 800, x: 1200, y: 950 },
          { frame: 1300, x: 1360, y: 500 },
          { frame: 1410, x: 1360, y: 425 },
        ]}
        clicks={[1418]}
      />
    </div>
  );
};

const FieldBlock: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ color: theme.textFaint, fontFamily: theme.sans, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
    <div style={{ background: theme.panelAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 14px', minHeight: 26 }}>
      {children}
    </div>
  </div>
);

const BookingsSkeleton: React.FC<{ frame: number }> = ({ frame }) => {
  const loaded = frame > 140;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: 44,
            borderRadius: 8,
            background: loaded ? theme.panelAlt : theme.border,
            border: `1px solid ${theme.border}`,
            opacity: loaded ? 1 : 0.6 + 0.3 * Math.sin((frame + i * 20) / 6),
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            color: theme.textDim,
            fontFamily: theme.sans,
            fontSize: 13,
          }}
        >
          {loaded ? (i === 0 ? 'Weekly Sync — Tomorrow, 10:00 AM' : 'Budget Review — Fri, 2:00 PM') : ''}
        </div>
      ))}
    </div>
  );
};

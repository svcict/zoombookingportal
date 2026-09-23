import React, { useMemo } from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import { theme } from '../theme';
import { Card, SectionLabel } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

const TIMES = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM'];

// Local 0-210: calendar + live time-slot grid, replicating TimeSlotGrid.tsx
// almost verbatim (green/red slot styling, badge counts, selected-slot bar).
export const Scene2Availability: React.FC = () => {
  const frame = useCurrentFrame();
  const availability = useMemo(() => TIMES.map((_, i) => random(`slot-${i}`) > 0.35), []);
  const availableCount = availability.filter(Boolean).length;
  const blockedCount = availability.length - availableCount;
  const selectedIndex = 2; // 10:00 AM
  const selected = frame >= 150;

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '48px 56px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: theme.gray900 }}>Schedule a Meeting</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 0 }}>
          <Card style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none', padding: 28 }}>
            <MiniCalendar />
          </Card>

          <Card style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: 28, background: '#FAFAFA' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 16,
                borderBottom: `1px solid ${theme.borderLight}`,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color={theme.blue} />
                  <span style={{ fontWeight: 700, fontSize: 20, color: theme.gray900 }}>Available Times</span>
                </div>
                <div style={{ fontSize: 13, color: theme.gray500, marginTop: 4 }}>
                  Thursday, Oct 15 {'•'} <span style={{ color: theme.blue, fontWeight: 600 }}>Manila</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Badge color={theme.green600} bg={theme.green50} border="#BBF7D0" text={`${availableCount} Available`} />
                <Badge color={theme.red600} bg={theme.red50} border="#FECACA" text={`${blockedCount} Blocked`} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              {TIMES.map((time, i) => {
                const isAvailable = availability[i];
                const isSelected = selected && i === selectedIndex;
                if (isSelected) {
                  return (
                    <div
                      key={time}
                      style={{
                        background: theme.green600,
                        border: `1px solid ${theme.green600}`,
                        borderRadius: 12,
                        padding: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 0 0 4px #DCFCE7',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} color="#fff" />
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{time}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#DCFCE7',
                          background: 'rgba(21,128,61,0.5)',
                          borderRadius: 999,
                          padding: '2px 8px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Selected
                      </span>
                    </div>
                  );
                }
                if (isAvailable) {
                  return (
                    <div
                      key={time}
                      style={{
                        background: 'rgba(240,253,244,0.8)',
                        border: '1px solid #BBF7D0',
                        borderRadius: 12,
                        padding: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} color="#15803d" />
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>{time}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#166534',
                          background: 'rgba(187,247,208,0.7)',
                          borderRadius: 999,
                          padding: '2px 8px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Available
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    key={time}
                    style={{
                      background: 'rgba(254,242,242,0.6)',
                      border: '1px solid #FECACA',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color="#ef4444" />
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(127,29,29,0.8)', textDecoration: 'line-through' }}>
                        {time}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#b91c1c',
                        background: 'rgba(254,226,226,0.9)',
                        border: '1px solid #FECACA',
                        borderRadius: 999,
                        padding: '2px 8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Blocked
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: selected ? theme.blue50 : '#F9FAFB',
                border: `1px solid ${selected ? theme.blue100 : theme.border}`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: interpolate(frame, [150, 165], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>Selected Time</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.blue }}>Thursday, Oct 15 at 10:00 AM</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: theme.blue, borderRadius: 8, padding: '8px 14px' }}>
                Next: Details
                <ArrowRight size={14} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Cursor
        keyframes={[
          { frame: 60, x: 1300, y: 700 },
          { frame: 130, x: 1300, y: 555 },
          { frame: 148, x: 1300, y: 480 },
        ]}
        clicks={[148]}
      />
    </AppShell>
  );
};

const Badge: React.FC<{ color: string; bg: string; border: string; text: string }> = ({ color, bg, border, text }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      borderRadius: 999,
      background: bg,
      border: `1px solid ${border}`,
      color,
      fontSize: 12,
      fontWeight: 700,
    }}
  >
    <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
    {text}
  </div>
);

const MiniCalendar: React.FC = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 17, color: theme.gray900, marginBottom: 16 }}>October 2026</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: theme.gray400 }}>
            {d}
          </div>
        ))}
        {days.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              padding: '8px 0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: d === 15 ? 800 : 500,
              color: d === 15 ? '#fff' : theme.gray700,
              background: d === 15 ? theme.blue : 'transparent',
            }}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
};

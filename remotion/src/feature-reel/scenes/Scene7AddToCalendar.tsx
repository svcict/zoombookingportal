import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Calendar, CalendarPlus, ChevronDown } from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

const OPTIONS = [
  { label: 'Apple Calendar', bg: '#1f2937', fg: '#fff', mark: null },
  { label: 'Google Calendar', bg: '#fff', fg: '#4285F4', mark: 'G', border: true },
  { label: 'Microsoft 365 (Organization)', bg: '#0078D4', fg: '#fff', mark: 'O' },
];

// Local 0-120: replicates the real Add to Calendar dropdown exactly
// (Apple/Google/Microsoft 365, same colors as BookingConfirmation.tsx).
export const Scene7AddToCalendar: React.FC = () => {
  const frame = useCurrentFrame();
  const open = frame >= 45;

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '48px 56px', display: 'flex', justifyContent: 'center' }}>
        <Card style={{ width: 880, padding: '18px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, fontSize: 15 }}>
            <span style={{ color: theme.gray500, fontWeight: 600 }}>Add to</span>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.gray900,
                }}
              >
                <CalendarPlus size={15} color={theme.gray500} />
                Add to Calendar
                <ChevronDown size={15} color={theme.gray500} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
              </div>

              {open && (
                <div
                  style={{
                    position: 'absolute',
                    top: 52,
                    left: 0,
                    width: 300,
                    background: theme.white,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(15,23,42,0.15)',
                    opacity: interpolate(frame, [45, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                  }}
                >
                  {OPTIONS.map((opt, i) => {
                    const hoverFrame = 60 + i * 18;
                    const hovered = frame >= hoverFrame && frame < hoverFrame + 18;
                    return (
                      <div
                        key={opt.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 18px',
                          borderTop: i > 0 ? `1px solid ${theme.borderLight}` : 'none',
                          background: hovered ? '#F9FAFB' : 'transparent',
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: opt.bg,
                            color: opt.fg,
                            border: opt.border ? `1px solid ${theme.border}` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {opt.mark ?? <Calendar size={12} />}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: theme.gray700 }}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Cursor keyframes={[{ frame: 20, x: 860, y: 460 }, { frame: 45, x: 860, y: 450 }]} clicks={[45]} />
    </AppShell>
  );
};

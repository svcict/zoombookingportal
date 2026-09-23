import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Clock } from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

const OPTIONS = [
  { title: '30 Minutes', desc: 'Fast, focused strategy consultation.' },
  { title: '45 Minutes', desc: 'Extended technical breakdown & live demo.' },
  { title: '1 Hour', desc: 'Comprehensive consultation & workshop.' },
  { title: 'More than 1 hour', desc: 'Custom duration for extended workshops.' },
];

// Local 0-90: meeting-length picker, replicating MeetingTypeSelector.tsx cards.
export const Scene3Duration: React.FC = () => {
  const frame = useCurrentFrame();
  const selected = frame >= 55;

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '56px' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: theme.gray900, marginBottom: 8 }}>Meeting Length</div>
        <div style={{ fontSize: 16, color: theme.gray500, marginBottom: 28 }}>Choose how long you need.</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {OPTIONS.map((opt, i) => {
            const isSelected = selected && i === 1;
            const enter = interpolate(frame, [i * 8, i * 8 + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <Card
                key={opt.title}
                style={{
                  padding: 24,
                  border: `2px solid ${isSelected ? theme.blue : theme.border}`,
                  background: isSelected ? theme.blue50 : theme.white,
                  opacity: enter,
                  transform: `translateY(${interpolate(enter, [0, 1], [16, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: isSelected ? theme.blue : '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Clock size={18} color={isSelected ? '#fff' : theme.gray500} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: isSelected ? theme.blue : theme.gray900, marginBottom: 6 }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: 13, color: theme.gray500, lineHeight: 1.4 }}>{opt.desc}</div>
              </Card>
            );
          })}
        </div>
      </div>

      <Cursor keyframes={[{ frame: 20, x: 800, y: 450 }, { frame: 55, x: 800, y: 380 }]} clicks={[55]} />
    </AppShell>
  );
};

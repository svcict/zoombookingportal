import React, { useMemo } from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Globe, Settings2, Sparkles, Video } from 'lucide-react';
import { theme } from '../theme';
import { Card, TypedText } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

const DURATIONS = [
  { pill: '30 mins', title: '30 minutes', desc: 'Fast, focused strategy consultation with screen-sharing capabilities.', link: 'Zoom Video Call' },
  { pill: '45 mins', title: '45 minutes', desc: 'Extended technical breakdown, architecture review, and live demo.', link: 'Zoom Video Call' },
  { pill: '1 hour (60 mins)', title: '1 hour', desc: 'Comprehensive consultation, workshop session, and interactive deep dive.', link: 'Zoom Video Call' },
  { pill: '1 hr 30 mins+', title: 'More than 1 hour', desc: 'Custom duration session for extended team workshops and reviews.', link: 'Configure time' },
];

const TIMES = ['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM'];

// Local 0-300: the real "Schedule" page — Topic, duration cards, and the
// calendar + live availability grid all live on ONE continuous page in the
// real app (verified via screenshot), not three separate screens.
export const Scene2SchedulePage: React.FC = () => {
  const frame = useCurrentFrame();
  const availability = useMemo(() => TIMES.map((t, i) => t !== '12:00 PM' && random(`slot-${i}`) > 0.05), []);
  const selectedIndex = 4; // 10:00 AM
  const slotSelected = frame >= 270;

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ padding: '20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: theme.gray700, marginBottom: 10 }}>
            <Video size={15} color={theme.blue} />
            TOPIC *
          </div>
          <div style={{ background: '#FAFAFA', border: `1px solid ${theme.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <TypedText text="Q4 Partnership Review" from={5} to={70} style={{ fontSize: 15, color: theme.gray900, fontWeight: 500 }} />
          </div>
        </Card>

        <Card style={{ padding: '20px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: theme.gray900, letterSpacing: 0.3 }}>STEP 1: MEETING DURATION</div>
              <div style={{ fontSize: 12, color: theme.gray500, marginTop: 2 }}>Choose the length of your Zoom meeting session</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: theme.gray500 }}>
              <Globe size={13} color={theme.blue} />
              UTC <span style={{ color: theme.blue, textDecoration: 'underline' }}>Change</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {DURATIONS.map((d, i) => {
              const selected = i === 0;
              const enter = interpolate(frame, [10 + i * 6, 24 + i * 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div
                  key={d.title}
                  style={{
                    border: `1.5px solid ${selected ? theme.blue : theme.border}`,
                    background: selected ? theme.blue50 : theme.white,
                    borderRadius: 12,
                    padding: 16,
                    opacity: enter,
                    transform: `translateY(${interpolate(enter, [0, 1], [10, 0])}px)`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: selected ? '#fff' : theme.gray700,
                        background: selected ? theme.blue : '#F3F4F6',
                        borderRadius: 999,
                        padding: '4px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Clock size={10} />
                      {d.pill}
                    </span>
                    {selected && (
                      <div style={{ width: 18, height: 18, borderRadius: 999, background: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6, height: 3, borderLeft: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'rotate(-45deg) translateY(-1px)' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: theme.gray900, marginBottom: 6 }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: theme.gray500, lineHeight: 1.4, marginBottom: 14, minHeight: 48 }}>{d.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: theme.blue }}>
                    {i === 3 ? <Settings2 size={12} /> : null}
                    {d.link}
                    <ChevronRight size={13} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 0 }}>
          <Card style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: theme.gray900 }}>September 2026</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <ChevronLeft size={15} color={theme.gray400} />
                <ChevronRight size={15} color={theme.gray400} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: theme.gray500, marginBottom: 14 }}>Select a date on the calendar</div>
            <MiniCalendar />
          </Card>

          <Card style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: `1px solid ${theme.borderLight}` }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Clock size={16} color={theme.blue} />
                  <span style={{ fontWeight: 800, fontSize: 17, color: theme.gray900 }}>Available Times</span>
                </div>
                <div style={{ fontSize: 12, color: theme.gray500, marginTop: 3 }}>
                  Thursday, September 24, 2026 {'•'} <span style={{ color: theme.blue, fontWeight: 600 }}>UTC</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Pill color="#166534" bg="#DCFCE7" text={`${availability.filter(Boolean).length} Available`} />
                <Pill color="#991B1B" bg="#FEE2E2" text={`${availability.filter((a) => !a).length} Blocked`} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {TIMES.map((time, i) => {
                const isSelected = slotSelected && i === selectedIndex;
                const ok = availability[i];
                if (isSelected) {
                  return (
                    <SlotCell key={time} bg="#16A34A" border="#16A34A" timeColor="#fff" glow>
                      <Clock size={14} color="#fff" />
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{time}</span>
                      <Tag style={{ marginLeft: 'auto', color: '#DCFCE7', background: 'rgba(21,128,61,0.5)' }} text="SELECTED" />
                    </SlotCell>
                  );
                }
                if (ok) {
                  return (
                    <SlotCell key={time} bg="#F0FDF4" border="#BBF7D0" timeColor="#14532d">
                      <Clock size={14} color="#15803d" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#14532d' }}>{time}</span>
                      <Tag style={{ marginLeft: 'auto', color: '#166534', background: '#DCFCE7' }} text="AVAILABLE" />
                    </SlotCell>
                  );
                }
                return (
                  <SlotCell key={time} bg="#FEF2F2" border="#FECACA" timeColor="#7f1d1d">
                    <Clock size={14} color="#ef4444" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(127,29,29,0.8)', textDecoration: 'line-through' }}>{time}</span>
                    <Tag style={{ marginLeft: 'auto', color: '#991B1B', background: '#FEE2E2' }} text="BLOCKED" />
                  </SlotCell>
                );
              })}
            </div>

            {slotSelected && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  background: theme.blue50,
                  border: `1px solid ${theme.blue100}`,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: interpolate(frame, [270, 282], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={14} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase' }}>Selected Time</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: theme.blue }}>Thu, Sep 24 at 10:00 AM</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: theme.blue, borderRadius: 8, padding: '7px 12px' }}>
                  Next: Details
                  <ArrowRight size={12} />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Cursor
        keyframes={[
          { frame: 90, x: 400, y: 350 },
          { frame: 170, x: 900, y: 500 },
          { frame: 240, x: 828, y: 650 },
          { frame: 268, x: 828, y: 625 },
        ]}
        clicks={[268]}
      />
    </AppShell>
  );
};

const Pill: React.FC<{ color: string; bg: string; text: string }> = ({ color, bg, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 700 }}>
    <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
    {text}
  </div>
);

const Tag: React.FC<{ text: string; style: React.CSSProperties }> = ({ text, style }) => (
  <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', ...style }}>{text}</span>
);

const SlotCell: React.FC<React.PropsWithChildren<{ bg: string; border: string; timeColor: string; glow?: boolean }>> = ({
  bg,
  border,
  glow,
  children,
}) => (
  <div
    style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 10,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: glow ? '0 0 0 4px #DCFCE7' : 'none',
    }}
  >
    {children}
  </div>
);

const MiniCalendar: React.FC = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const startOffset = 2; // Sep 1, 2026 is a Tuesday
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
      {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
        <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: theme.gray400 }}>
          {d}
        </div>
      ))}
      {Array.from({ length: startOffset }, (_, i) => <div key={`pad-${i}`} />)}
      {days.map((d) => {
        const isToday = d === 23;
        const isSelected = d === 24;
        return (
          <div
            key={d}
            style={{
              textAlign: 'center',
              padding: '9px 0',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: isSelected || isToday ? 800 : 500,
              color: isSelected ? '#fff' : theme.gray700,
              background: isSelected ? theme.blue : isToday ? '#F5F8FF' : 'transparent',
              position: 'relative',
            }}
          >
            {d}
            {isToday && !isSelected && (
              <div style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 999, background: theme.blue }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

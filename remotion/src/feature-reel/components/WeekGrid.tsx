import React from 'react';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { theme } from '../theme';
import { Card } from './ui';

const DAYS = [
  { label: 'MON', date: 21 },
  { label: 'TUE', date: 22 },
  { label: 'WED', date: 23 },
  { label: 'THU', date: 24 },
  { label: 'FRI', date: 25 },
  { label: 'SAT', date: 26 },
  { label: 'SUN', date: 27 },
];

const HOURS = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

// Replicates the dashboard's weekly calendar grid (App.tsx). When `booking` is
// given, renders a small blue Zoom chip in that day/hour cell.
export const WeekGrid: React.FC<{ booking?: { day: number; hour: number; title: string } }> = ({ booking }) => {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${theme.borderLight}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: theme.gray700 }}>
            Today
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <ChevronLeft size={16} color={theme.gray400} />
            <ChevronRight size={16} color={theme.gray400} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: theme.gray900, marginLeft: 8 }}>{'Sep 21 – 27, 2026'}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: 3 }}>
          {['Day', 'Week', 'Month'].map((v) => (
            <div
              key={v}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 10px',
                borderRadius: 6,
                color: v === 'Week' ? theme.blue : theme.gray500,
                background: v === 'Week' ? theme.white : 'transparent',
              }}
            >
              {v}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)' }}>
        <div style={{ borderBottom: `1px solid ${theme.borderLight}` }} />
        {DAYS.map((d) => (
          <div
            key={d.label}
            style={{
              textAlign: 'center',
              padding: '10px 0',
              borderBottom: `1px solid ${theme.borderLight}`,
              borderLeft: `1px solid ${theme.borderLight}`,
              background: d.date === 23 ? '#F5F8FF' : 'transparent',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.gray400, letterSpacing: 0.5 }}>{d.label}</div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 999,
                marginTop: 2,
                fontWeight: 700,
                fontSize: 14,
                color: d.date === 23 ? '#fff' : theme.gray900,
                background: d.date === 23 ? theme.blue : 'transparent',
              }}
            >
              {d.date}
            </div>
          </div>
        ))}

        {HOURS.map((h, r) => (
          <React.Fragment key={h}>
            <div style={{ fontSize: 11, color: theme.gray400, fontFamily: theme.mono, padding: '10px 8px', borderBottom: `1px solid ${theme.borderLight}`, textAlign: 'right' }}>
              {h}
            </div>
            {DAYS.map((d, c) => (
              <div
                key={d.label}
                style={{
                  minHeight: 42,
                  borderBottom: `1px solid ${theme.borderLight}`,
                  borderLeft: `1px solid ${theme.borderLight}`,
                  padding: 3,
                }}
              >
                {booking && booking.day === c && booking.hour === r && (
                  <div style={{ background: theme.blue50, border: `1px solid ${theme.blue100}`, borderRadius: 6, padding: '4px 6px', fontSize: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: theme.blue, fontWeight: 700 }}>
                      <Video size={9} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.title}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

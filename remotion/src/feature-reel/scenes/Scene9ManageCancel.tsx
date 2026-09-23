import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Archive, ChevronDown, Clock, ExternalLink, Trash2, Video, XCircle } from 'lucide-react';
import { theme } from '../theme';
import { Card, SectionLabel } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

// Local 0-180: dashboard "My Booked Meetings" list, a cancel action, and the
// collapsible "Canceled Meetings" archive, replicating HostBookingsView.tsx.
export const Scene9ManageCancel: React.FC = () => {
  const frame = useCurrentFrame();
  const cancelling = frame >= 70 && frame < 100;
  const cancelled = frame >= 100;
  const archiveOpen = frame >= 130;

  return (
    <AppShell activeTab="dashboard">
      <div style={{ padding: '48px 56px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 880 }}>
          <SectionLabel>My Booked Meetings</SectionLabel>

          <Card style={{ padding: 20, marginBottom: 16, opacity: cancelled ? 0.45 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 17, color: theme.gray900 }}>Q4 Partnership Review</span>
                  {cancelled ? (
                    <Tag color="#b91c1c" bg="#FEF2F2" border="#FECACA" icon={<XCircle size={12} />} text="Cancelled" />
                  ) : (
                    <span style={{ fontSize: 12, color: theme.gray500 }}>{'•'} 30 mins</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: theme.blue, fontWeight: 700 }}>
                    <Clock size={14} />
                    10:00 AM (Manila)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: theme.gray500 }}>
                    <Video size={14} color={theme.gray400} />
                    Hosted by <span style={{ color: theme.gray900, fontWeight: 600 }}>Jane Director</span>
                  </span>
                </div>
              </div>

              {!cancelled && (
                <div
                  style={{
                    background: theme.blue,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    borderRadius: 10,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Video size={14} />
                  Join Zoom Meeting
                  <ExternalLink size={12} />
                </div>
              )}
            </div>

            {frame >= 50 && !cancelled && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid ${theme.borderLight}`,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  opacity: interpolate(frame, [50, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cancelling ? theme.gray400 : '#dc2626', fontWeight: 600, fontSize: 14 }}>
                  <Trash2 size={14} />
                  {cancelling ? 'Cancelling…' : 'Cancel Meeting'}
                </div>
              </div>
            )}
          </Card>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: theme.white,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              opacity: interpolate(frame, [110, 125], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Archive size={16} color={theme.gray500} />
              <span style={{ fontWeight: 700, fontSize: 15, color: theme.gray900 }}>Canceled Meetings</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.gray500, background: '#F3F4F6', borderRadius: 999, padding: '2px 10px' }}>
                1
              </span>
            </div>
            <ChevronDown size={16} color={theme.gray500} style={{ transform: archiveOpen ? 'rotate(180deg)' : 'none' }} />
          </div>

          {archiveOpen && (
            <div
              style={{
                marginTop: 10,
                padding: 16,
                background: '#F9FAFB',
                border: `1px solid ${theme.borderLight}`,
                borderRadius: 12,
                opacity: interpolate(frame, [130, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: theme.gray500, textDecoration: 'line-through' }}>Q4 Partnership Review</span>
                <Tag color="#b91c1c" bg="#FEF2F2" border="#FECACA" icon={<XCircle size={12} />} text="Cancelled" />
              </div>
            </div>
          )}
        </div>
      </div>

      <Cursor keyframes={[{ frame: 40, x: 1300, y: 380 }, { frame: 70, x: 1300, y: 380 }]} clicks={[70]} />
    </AppShell>
  );
};

const Tag: React.FC<{ color: string; bg: string; border: string; icon: React.ReactNode; text: string }> = ({
  color,
  bg,
  border,
  icon,
  text,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 999,
      padding: '2px 10px',
    }}
  >
    {icon}
    {text}
  </span>
);

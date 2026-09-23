import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { ChevronDown, ChevronUp, Clock, Copy, ExternalLink, Trash2, User, Video } from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';
import { WeekGrid } from '../components/WeekGrid';

// Local 0-180: the real "My Booked Meetings" dashboard card — collapsed
// (Join/Copy Link/chevron) then expanded (Booked By, Meeting ID/Passcode,
// Agenda, Cancel Meeting), pixel-referenced against a live screenshot.
export const Scene7ManageCancel: React.FC = () => {
  const frame = useCurrentFrame();
  const expanded = frame >= 60;
  const cancelling = frame >= 140 && frame < 160;
  const cancelled = frame >= 160;

  return (
    <AppShell activeTab="dashboard">
      <div style={{ padding: '32px 56px', display: 'grid', gridTemplateColumns: '1fr 460px', gap: 20, alignItems: 'start' }}>
        <WeekGrid booking={cancelled ? undefined : { day: 3, hour: 0, title: 'Q4 Partner…' }} />

        <div>
          <Card style={{ padding: 24, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 17, color: theme.gray900 }}>My Booked Meetings</span>
                <Badge text={cancelled ? '0 Booked' : '1 Booked'} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: theme.gray500, marginBottom: 14 }}>
              Your personal meeting schedule. Only meetings booked under your account are displayed here.
            </div>
            {!cancelled && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '8px 14px',
                  opacity: cancelling || expanded ? 0.4 : 1,
                }}
              >
                <Trash2 size={13} />
                Cancel All My Bookings (1)
              </div>
            )}
          </Card>

          {!cancelled ? (
            <Card style={{ padding: 20, border: expanded ? `1px solid ${theme.blue100}` : undefined }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: '#F3F4F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: theme.blue }}>SEP</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: theme.gray900 }}>24</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: theme.gray900 }}>Q4 Partnership Review</span>
                      <Badge text="Confirmed" green />
                      <span style={{ fontSize: 11, color: theme.gray500 }}>{'•'} 30 mins</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.blue, fontWeight: 700 }}>
                        <Clock size={12} />
                        8:00 AM (UTC)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.gray500 }}>
                        <Video size={12} color={theme.gray400} />
                        Hosted by <span style={{ color: theme.gray900, fontWeight: 600 }}>Jane Director</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <div style={{ background: theme.blue, color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Video size={12} />
                  Join Zoom Meeting
                  <ExternalLink size={11} />
                </div>
                <div style={{ border: `1px solid ${theme.border}`, fontSize: 12, fontWeight: 700, color: theme.gray700, borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Copy size={12} />
                  Copy Link
                </div>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: '9px 10px', marginLeft: 'auto' }}>
                  {expanded ? <ChevronUp size={14} color={theme.gray500} /> : <ChevronDown size={14} color={theme.gray500} />}
                </div>
              </div>

              {expanded && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: `1px solid ${theme.borderLight}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    opacity: interpolate(frame, [60, 72], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                  }}
                >
                  <InfoBox label="BOOKED BY">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} color={theme.gray400} />
                      <span style={{ fontWeight: 600 }}>Amiel Sobisol</span>
                      <span style={{ color: theme.gray500 }}>(sobisol.ab@ayalafoundation.org)</span>
                    </div>
                  </InfoBox>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <InfoBox label="ZOOM MEETING ID">
                      <span style={{ fontFamily: theme.mono, fontWeight: 700 }}>857 5490 3936</span>
                    </InfoBox>
                    <InfoBox label="ZOOM PASSCODE">
                      <span style={{ fontFamily: theme.mono, fontWeight: 700 }}>z7cPzKZArC</span>
                    </InfoBox>
                  </div>
                  <InfoBox label="MEETING AGENDA">
                    Review Q4 milestones, budget allocation, and partnership renewal terms.
                  </InfoBox>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cancelling ? theme.gray400 : '#DC2626', fontWeight: 700, fontSize: 13 }}>
                      <Trash2 size={13} />
                      {cancelling ? 'Cancelling…' : 'Cancel Meeting'}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                opacity: interpolate(frame, [160, 172], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              <div style={{ fontWeight: 700, color: theme.gray700, fontSize: 15 }}>No booked meetings yet</div>
            </Card>
          )}
        </div>
      </div>

      <Cursor keyframes={[{ frame: 30, x: 1580, y: 470 }, { frame: 60, x: 1580, y: 470 }, { frame: 130, x: 1300, y: 780 }]} clicks={[60, 138]} />
    </AppShell>
  );
};

const Badge: React.FC<{ text: string; green?: boolean }> = ({ text, green }) => (
  <span
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: green ? '#15803d' : theme.blue,
      background: green ? '#DCFCE7' : theme.blue50,
      borderRadius: 999,
      padding: '2px 10px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}
  >
    {green && '✓'}
    {text}
  </span>
);

const InfoBox: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <div style={{ background: '#F9FAFB', border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 14px' }}>
    <div style={{ fontSize: 10, fontWeight: 800, color: theme.gray500, letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 13, color: theme.gray900 }}>{children}</div>
  </div>
);

import React from 'react';
import { interpolate, spring, useCurrentFrame } from 'remotion';
import {
  Calendar,
  CalendarPlus,
  ChevronDown,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  Phone,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Video,
} from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';
import { FPS } from '../data';

const CAL_OPTIONS = [
  { label: 'Apple Calendar', bg: '#1f2937', fg: '#fff', mark: null as string | null },
  { label: 'Google Calendar', bg: '#fff', fg: '#4285F4', mark: 'G', border: true },
  { label: 'Microsoft 365', bg: '#0078D4', fg: '#fff', mark: 'O' },
];

// Local 0-270: the real "Manage Meeting" detail card — blue ribbon, then
// every real row (Topic through Options), the Host Key security row (per
// BookingConfirmation.tsx — not visible in the sandbox screenshot since no
// Zoom mailbox is configured there, but this is real, shipped behavior),
// the Add to Calendar dropdown, and the real bottom action bar.
export const Scene6ConfirmationDetails: React.FC = () => {
  const frame = useCurrentFrame();
  const hostKeyRevealed = frame >= 100 && frame < 140;
  const calOpen = frame >= 175;
  const cardPop = spring({ frame, fps: FPS, config: { damping: 13, mass: 0.6 } });

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '32px 56px', display: 'flex', justifyContent: 'center' }}>
        <Card
          style={{
            width: 900,
            overflow: 'visible',
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${0.97 + cardPop * 0.03})`,
          }}
        >
          <div
            style={{
              background: theme.blue,
              color: '#fff',
              padding: '18px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Q4 Partnership Review</div>
                <div style={{ fontSize: 12, color: '#dbeafe' }}>Hosted by Jane Director {'•'} 30 Minutes</div>
              </div>
            </div>
            <div style={{ background: '#fff', color: theme.blue, fontWeight: 700, fontSize: 12, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={13} />
              Join Zoom Meeting
              <ExternalLink size={11} />
            </div>
          </div>

          <Row label="Topic" value="Q4 Partnership Review" show={frame >= 15} />
          <Row label="Time" value="2026-09-24 8:00 AM (UTC)" show={frame >= 22} />
          <Row label="Meeting ID" value="857-5490-3936" mono show={frame >= 29} />
          <Row label="Security" show={frame >= 36}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#16A34A' }}>{'✓'}</span>
              Passcode
              <span style={{ fontFamily: theme.mono }}>{'z7cPzKZArC'.replace(/./g, '•')}</span>
              <LinkBtn>Show</LinkBtn>
            </div>
          </Row>
          <Row label="Host Key" show={frame >= 46} amber>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: theme.mono, fontSize: 14, letterSpacing: 2 }}>{hostKeyRevealed ? '481022' : '••••••'}</span>
                <LinkBtn icon={hostKeyRevealed ? <EyeOff size={12} /> : <Eye size={12} />}>{hostKeyRevealed ? 'Hide' : 'Show'}</LinkBtn>
              </div>
              <div style={{ fontSize: 11, color: '#92400E', marginTop: 4, maxWidth: 520, lineHeight: 1.5 }}>
                If nobody has host controls yet, use Participants {'→'} Claim Host in Zoom and enter this key. Works regardless of your Zoom license.
              </div>
            </div>
          </Row>
          <Row label="Meeting Host" value="jane.director@ayalafoundation.org" show={frame >= 58} />
          <Row label="Invitees" value="maria.santos@client.com, jane.director@ayalafoundation.org" show={frame >= 66} />
          <Row label="Invite Link" show={frame >= 74}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: theme.blue, fontFamily: theme.mono, fontSize: 12 }}>https://zoom.us/j/8575490393{'…'}</span>
              <Copy size={13} color={theme.gray400} />
            </div>
          </Row>

          <Row label="Add to" show={frame >= 84}>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: theme.gray800 }}>
                <CalendarPlus size={14} color={theme.gray600} />
                Add to Calendar
                <ChevronDown size={13} color={theme.gray500} style={{ transform: calOpen ? 'rotate(180deg)' : 'none' }} />
              </div>
              {calOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 42,
                    left: 0,
                    width: 210,
                    background: '#fff',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 16px 32px rgba(15,23,42,0.15)',
                    zIndex: 10,
                    opacity: interpolate(frame, [175, 183], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                    transform: `scale(${0.9 + spring({ frame: frame - 175, fps: FPS, config: { damping: 11, mass: 0.4 } }) * 0.1})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {CAL_OPTIONS.map((opt, i) => (
                    <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i > 0 ? `1px solid ${theme.borderLight}` : 'none' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: opt.bg, color: opt.fg, border: opt.border ? `1px solid ${theme.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                        {opt.mark ?? <Calendar size={10} />}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: theme.gray700 }}>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Row>

          <Row label="Encryption" show={frame >= 220}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontWeight: 600 }}>
              <ShieldCheck size={13} />
              Enhanced (AES-256)
            </div>
          </Row>
          <Row label="Video" value="Host on, Participant on" show={frame >= 227} />
          <Row label="Options" value="Mute participants upon entry · Automatically record to the cloud" show={frame >= 234} />

          <div
            style={{
              padding: '12px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: theme.gray500,
              fontSize: 12,
              fontWeight: 600,
              borderTop: `1px solid ${theme.borderLight}`,
              opacity: interpolate(frame, [240, 248], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <Phone size={13} />
            International Phone Dial-in & SIP/H.323 System Addresses
            <ChevronDown size={13} style={{ marginLeft: 'auto' }} />
          </div>

          <div
            style={{
              padding: '18px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `1px solid ${theme.borderLight}`,
              opacity: interpolate(frame, [248, 258], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <BtnPrimary icon={<Video size={13} />} label="Start" />
              <BtnGhost icon={<Copy size={13} />} label="Copy Invitation" />
              <BtnGhost icon={<Edit3 size={13} />} label="Edit" />
              <BtnGhost icon={<Trash2 size={13} color="#dc2626" />} label="Delete" color="#dc2626" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <BtnGhost icon={<RotateCcw size={13} />} label="Schedule Another Meeting" />
            </div>
          </div>
        </Card>
      </div>

      <Cursor keyframes={[{ frame: 90, x: 785, y: 520 }, { frame: 175, x: 770, y: 511 }]} clicks={[175]} />
    </AppShell>
  );
};

const Row: React.FC<React.PropsWithChildren<{ label: string; value?: string; mono?: boolean; show: boolean; amber?: boolean }>> = ({
  label,
  value,
  mono,
  show,
  amber,
  children,
}) => {
  const frame = useCurrentFrame();
  if (!show) return null;
  return (
    <div
      style={{
        padding: '13px 28px',
        display: 'grid',
        gridTemplateColumns: '130px 1fr',
        gap: 14,
        fontSize: 13,
        borderTop: `1px solid ${theme.borderLight}`,
        background: amber ? '#FFFBEB' : 'transparent',
        opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }),
      }}
    >
      <span style={{ color: theme.gray500, fontWeight: 600 }}>{label}</span>
      {children ?? <span style={{ color: theme.gray900, fontFamily: mono ? theme.mono : theme.sans, fontWeight: mono ? 500 : 600 }}>{value}</span>}
    </div>
  );
};

const LinkBtn: React.FC<React.PropsWithChildren<{ icon?: React.ReactNode }>> = ({ children, icon }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: theme.blue, fontWeight: 700, fontSize: 12 }}>
    {icon}
    {children}
  </span>
);

const BtnPrimary: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.blue, color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '8px 14px' }}>
    {icon}
    {label}
  </div>
);

const BtnGhost: React.FC<{ icon: React.ReactNode; label: string; color?: string }> = ({ icon, label, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${theme.border}`, color: color ?? theme.gray700, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '8px 14px' }}>
    {icon}
    {label}
  </div>
);

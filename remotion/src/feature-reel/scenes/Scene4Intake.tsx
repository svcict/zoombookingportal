import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { ArrowLeft, Mail, ShieldCheck, User, Video } from 'lucide-react';
import { theme } from '../theme';
import { Card, Chip, PrimaryButton, TypedText } from '../components/ui';
import { AppShell } from '../components/AppShell';
import { Cursor } from '../components/Cursor';

// Local 0-150: the real intake form — dark ribbon header, contact info,
// invitees, meeting host nomination, agenda, and Zoom settings (checkboxes/
// toggles/radios), pixel-referenced against a live screenshot of the real
// page. The page is taller than one frame, so it scrolls into view.
export const Scene4Intake: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = interpolate(frame, [65, 140], [0, -330], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AppShell activeTab="booking">
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 32 + scrollY, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Card style={{ width: 940, overflow: 'hidden' }}>
            <div style={{ background: '#1C1C1E', padding: '22px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowLeft size={13} color="#fff" />
                    </div>
                    <span style={{ background: theme.blue, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 9px' }}>
                      Zoom Registration
                    </span>
                    <span style={{ color: '#9CA3AF', fontSize: 11 }}>{'• 1-Click Secure Scheduling'}</span>
                  </div>
                  <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>Q4 Partnership Review</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} color="#22c55e" />
                  <div>
                    <div style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>Zoom Verified</div>
                    <div style={{ color: '#9CA3AF', fontSize: 10 }}>AES-256 Encryption</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 12, color: '#D1D5DB', fontWeight: 600 }}>
                <span>Thursday, September 24, 2026</span>
                <span>8:00 AM (30 mins)</span>
                <span>UTC</span>
              </div>
            </div>

            <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.borderLight}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Video size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: theme.gray900 }}>Q4 Partnership Review</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: theme.blue, background: theme.blue50, borderRadius: 999, padding: '2px 8px' }}>30 mins</span>
                  </div>
                  <div style={{ fontSize: 12, color: theme.gray500 }}>Zoom Enterprise Video Conference {'•'} Microsoft 365 Connected</div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>{'✓ Instant Confirmation'}</span>
            </div>

            <div style={{ padding: '24px 32px' }}>
              <SectionHeader icon={<User size={13} color={theme.blue} />} text="YOUR CONTACT INFORMATION" />
              <Field label="FULL NAME *">
                <ReadonlyBox>Amiel Sobisol</ReadonlyBox>
              </Field>
              <Field label="WORK EMAIL ADDRESS *">
                <ReadonlyBox icon={<Mail size={13} color={theme.gray400} />}>sobisol.ab@ayalafoundation.org</ReadonlyBox>
              </Field>

              <Divider />
              <Field label="INVITEES *" hint="They'll receive an email with the Zoom join link, meeting ID, and passcode.">
                <div style={{ display: 'flex', gap: 10 }}>
                  <ReadonlyBox faint style={{ flex: 1 }}>colleague@company.com</ReadonlyBox>
                  <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: theme.gray700 }}>+ Add</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Chip text="maria.santos@client.com" appearAt={20} />
                </div>
              </Field>

              <Divider />
              <Field
                label="MEETING HOST (optional)"
                hint="Booking on someone else's behalf? Enter their email and they'll be set as the Zoom Alternative Host and included on the confirmation email — with the Host Key, in case Zoom doesn't let them start as host directly."
              >
                <div style={{ background: theme.white, border: `1.5px solid ${theme.blue}`, borderRadius: 8, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={13} color={theme.gray400} />
                  <TypedText text="jane.director@ayalafoundation.org" from={35} to={65} style={{ fontSize: 14, color: theme.gray900, fontWeight: 600 }} />
                </div>
              </Field>

              <Divider />
              <SectionHeader icon={<Video size={13} color={theme.blue} />} text="MEETING PREPARATION QUESTIONS" />
              <Field label="MEETING AGENDA *" hint="Helps us prepare relevant technical documentation in advance.">
                <div style={{ background: '#FAFAFA', border: `1px solid ${theme.border}`, borderRadius: 8, padding: '12px 14px', minHeight: 44 }}>
                  <TypedText
                    text="Review Q4 milestones, budget allocation, and partnership renewal terms."
                    from={70}
                    to={110}
                    style={{ fontSize: 13, color: theme.gray700 }}
                  />
                </div>
              </Field>

              <Divider />
              <SectionHeader icon={<Video size={13} color={theme.blue} />} text="ZOOM MEETING SETTINGS" />

              <SubLabel>SECURITY</SubLabel>
              <CheckRow label="Waiting Room" checked={false} />
              <CheckRow label="Only authenticated users can join: Sign in to Zoom" checked={false} />

              <SubLabel>VIDEO</SubLabel>
              <div style={{ display: 'flex', gap: 28, marginBottom: 14 }}>
                <ToggleInline label="Host" on />
                <ToggleInline label="Participant" on />
              </div>

              <SubLabel>AUDIO</SubLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <RadioRow label="Telephone" checked={false} />
                <RadioRow label="Computer Audio" checked={false} />
                <RadioRow label="Telephone and Computer Audio" checked />
                <RadioRow label="3rd Party Audio" checked={false} />
              </div>

              <SubLabel>ADVANCED</SubLabel>
              <CheckRow label="Allow participants to join anytime" checked={false} />
              <CheckRow label="Mute participants upon entry" checked />
              <CheckRow label="Automatically record meeting to the cloud" checked activeAt={120} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: '13px 22px', fontSize: 14, fontWeight: 700, color: theme.gray700 }}>
                  Cancel & Change Time
                </div>
                <div style={{ opacity: interpolate(frame, [140, 149], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                  <PrimaryButton label="Confirm & Generate Zoom Link (One-Click)" pressedAt={149} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Cursor
        keyframes={[
          { frame: 20, x: 960, y: 648 },
          { frame: 60, x: 960, y: 648 },
          { frame: 120, x: 1185, y: 920 },
          { frame: 149, x: 1185, y: 920 },
        ]}
        clicks={[149]}
      />
    </AppShell>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: theme.gray700, letterSpacing: 0.4, marginBottom: 14 }}>
    {icon}
    {text}
  </div>
);

const Field: React.FC<React.PropsWithChildren<{ label: string; hint?: string }>> = ({ label, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: theme.gray700, letterSpacing: 0.3, marginBottom: 6 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 11, color: theme.gray400, marginTop: 6, lineHeight: 1.5, maxWidth: 760 }}>{hint}</div>}
  </div>
);

const ReadonlyBox: React.FC<React.PropsWithChildren<{ icon?: React.ReactNode; faint?: boolean; style?: React.CSSProperties }>> = ({
  children,
  icon,
  faint,
  style,
}) => (
  <div
    style={{
      background: '#F3F4F6',
      borderRadius: 8,
      padding: '11px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 14,
      color: faint ? theme.gray400 : theme.gray900,
      ...style,
    }}
  >
    {icon}
    {children}
  </div>
);

const Divider: React.FC = () => <div style={{ borderTop: `1px solid ${theme.borderLight}`, margin: '18px 0' }} />;

const SubLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 800, color: theme.gray700, letterSpacing: 0.3, margin: '10px 0 8px' }}>{children}</div>
);

const CheckRow: React.FC<{ label: string; checked: boolean; activeAt?: number }> = ({ label, checked, activeAt }) => {
  const frame = useCurrentFrame();
  const isChecked = activeAt !== undefined ? frame >= activeAt : checked;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, fontSize: 13, color: theme.gray800 }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1.5px solid ${isChecked ? theme.blue : theme.gray400}`,
          background: isChecked ? theme.blue : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isChecked && <div style={{ width: 7, height: 4, borderLeft: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'rotate(-45deg) translateY(-1px)' }} />}
      </div>
      {label}
    </div>
  );
};

const RadioRow: React.FC<{ label: string; checked: boolean }> = ({ label, checked }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: theme.gray800 }}>
    <div
      style={{
        width: 15,
        height: 15,
        borderRadius: 999,
        border: `1.5px solid ${checked ? theme.blue : theme.gray400}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <div style={{ width: 7, height: 7, borderRadius: 999, background: theme.blue }} />}
    </div>
    {label}
  </div>
);

const ToggleInline: React.FC<{ label: string; on: boolean }> = ({ label, on }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.gray800 }}>
    {label}:
    <div style={{ width: 38, height: 20, borderRadius: 999, background: on ? theme.blue : theme.border, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff' }} />
    </div>
    <span style={{ fontSize: 12, fontWeight: 600, color: theme.gray500 }}>{on ? 'On' : 'Off'}</span>
  </div>
);

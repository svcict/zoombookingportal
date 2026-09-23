import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { AppShell } from '../components/AppShell';

// Local 0-120: the "Manage Meeting" security rows — masked Host Key with a
// reveal toggle, plus the passcode/waiting-room/encryption checklist.
export const Scene6HostKey: React.FC = () => {
  const frame = useCurrentFrame();
  const revealed = frame >= 55 && frame < 95;

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '48px 56px', display: 'flex', justifyContent: 'center' }}>
        <Card style={{ width: 880, overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 32px',
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              gap: 16,
              background: '#FFFBEB',
            }}
          >
            <span style={{ color: theme.gray500, fontWeight: 600, fontSize: 15 }}>Host Key</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: theme.mono, fontSize: 17, color: theme.gray900, letterSpacing: 2 }}>
                  {revealed ? '481022' : '••••••'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: theme.blue, fontWeight: 700, fontSize: 13 }}>
                  {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  {revealed ? 'Hide' : 'Show'}
                </div>
              </div>
              <p style={{ fontSize: 12, color: theme.amber800, marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>
                Only the booker and the nominated host ever see this — use it with Zoom&rsquo;s
                &ldquo;Claim Host&rdquo; if nobody has controls yet.
              </p>
            </div>
          </div>

          <div style={{ padding: '18px 32px', display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, borderTop: `1px solid ${theme.borderLight}` }}>
            <span style={{ color: theme.gray500, fontWeight: 600, fontSize: 15 }}>Security</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SecurityRow label="Passcode required" show />
              <SecurityRow label="Encrypted end-to-end in transit" show={frame >= 30} />
              <SecurityRow label="Only invited attendees can join" show={frame >= 45} />
            </div>
          </div>

          <div
            style={{
              padding: '18px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              borderTop: `1px solid ${theme.borderLight}`,
              opacity: interpolate(frame, [90, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <ShieldCheck size={17} color={theme.green600} />
            <span style={{ color: '#15803d', fontWeight: 600, fontSize: 14 }}>AES-256 encryption on every meeting</span>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

const SecurityRow: React.FC<{ label: string; show: boolean }> = ({ label, show }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: show ? 1 : 0.15, fontSize: 15, color: theme.gray900 }}>
    <Check size={15} color={theme.green600} />
    {label}
  </div>
);

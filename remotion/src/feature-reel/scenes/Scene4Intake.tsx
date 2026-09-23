import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { ArrowLeft } from 'lucide-react';
import { theme } from '../theme';
import { Card, Chip, PrimaryButton, SectionLabel, Toggle, TypedText } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { AppShell } from '../components/AppShell';

// Local 0-150: intake form, replicating ZoomIntakeForm.tsx's field layout,
// with the "Meeting Host (optional)" nomination field as the featured beat.
export const Scene4Intake: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '48px 56px', display: 'flex', justifyContent: 'center' }}>
        <Card style={{ width: 880, padding: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.gray500, fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
            <ArrowLeft size={15} />
            Back to time slots
          </div>

          <SectionLabel>Meeting Details</SectionLabel>

          <FieldBlock label="Topic">
            <TypedText text="Q4 Partnership Review" from={10} to={80} style={{ fontSize: 17, color: theme.gray900, fontWeight: 600 }} />
          </FieldBlock>

          <FieldBlock label="Invitees">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Chip text="maria.santos@client.com" appearAt={90} />
            </div>
          </FieldBlock>

          <FieldBlock label="Meeting Host (optional)" highlight>
            <TypedText
              text="jane.director@ayalafoundation.org"
              from={100}
              to={140}
              style={{ fontSize: 17, color: theme.gray900, fontWeight: 600 }}
            />
          </FieldBlock>

          <div style={{ marginTop: 20 }}>
            <SectionLabel>Zoom Meeting Settings</SectionLabel>
            <Toggle label="Waiting room" on={false} />
            <Toggle label="Automatically record to the cloud" on={false} activeAt={130} />
          </div>

          <div style={{ marginTop: 28, opacity: interpolate(frame, [140, 149], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
            <PrimaryButton label="Confirm & Generate Zoom Link" wide pressedAt={149} />
          </div>
        </Card>
      </div>

      <Cursor keyframes={[{ frame: 60, x: 1100, y: 500 }, { frame: 149, x: 960, y: 900 }]} clicks={[]} />
    </AppShell>
  );
};

const FieldBlock: React.FC<React.PropsWithChildren<{ label: string; highlight?: boolean }>> = ({
  label,
  children,
  highlight,
}) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ fontSize: 13, color: theme.gray500, fontWeight: 600, marginBottom: 8 }}>{label}</div>
    <div
      style={{
        border: `1px solid ${highlight ? theme.blue : theme.border}`,
        background: highlight ? theme.blue50 : theme.white,
        borderRadius: 10,
        padding: '14px 18px',
        minHeight: 26,
      }}
    >
      {children}
    </div>
  </div>
);

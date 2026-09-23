import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { Card, Chip, PrimaryButton, ProgressBar, SectionLabel, Toggle, TypedText } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { LockIcon } from '../components/icons';

// Frames 2040-3120 (local 0-1080). Sub-phases: field reveal (0-460) ->
// submit + POST /api/bookings in flight (460-1080).
export const Scene3Intake: React.FC = () => {
  const frame = useCurrentFrame();
  const submitted = frame >= 500;
  const panelFade = interpolate(frame, [980, 1080], [1, 0.15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <Card style={{ width: 900, padding: 44, opacity: panelFade }}>
        <SectionLabel>{'SCHEDULE A ZOOM MEETING'}</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 22 }}>
          <FieldBlock label="Booked by" locked>
            <div style={{ color: theme.textDim, fontFamily: theme.sans, fontSize: 17 }}>
              sobisol.ab@ayalafoundation.org
            </div>
          </FieldBlock>
          <FieldBlock label="Duration">
            <div style={{ color: theme.text, fontFamily: theme.sans, fontSize: 17 }}>30 minutes</div>
          </FieldBlock>
        </div>

        <FieldBlock label="Topic" full>
          <TypedText text="Q4 Planning Sync" from={10} to={90} style={{ color: theme.text, fontFamily: theme.sans, fontSize: 17 }} />
        </FieldBlock>

        <FieldBlock label="Invitees" full>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip text="maria.santos@ayalafoundation.org" appearAt={150} />
          </div>
        </FieldBlock>

        <FieldBlock label="Meeting Host (optional)" full>
          <TypedText
            text="jane.director@ayalafoundation.org"
            from={230}
            to={330}
            style={{ color: theme.text, fontFamily: theme.sans, fontSize: 17 }}
          />
        </FieldBlock>

        <FieldBlock label="Agenda" full>
          <TypedText
            text="Review Q4 milestones and resource allocation across teams."
            from={340}
            to={440}
            style={{ color: theme.textDim, fontFamily: theme.sans, fontSize: 15 }}
          />
        </FieldBlock>

        <div style={{ marginTop: 8, marginBottom: 28 }}>
          <SectionLabel>{'ZOOM MEETING SETTINGS'}</SectionLabel>
          <Toggle label="Waiting room" on={false} />
          <Toggle label="Automatically record to the cloud" on={false} activeAt={430} />
        </div>

        <div>
          <PrimaryButton label="Confirm & Generate Zoom Link" wide pressedAt={500} />
          {submitted && (
            <div style={{ marginTop: 18 }}>
              <ProgressBar from={500} to={1050} color={theme.indigo} />
              <div style={{ marginTop: 10, color: theme.indigoLight, fontFamily: theme.mono, fontSize: 13 }}>
                {'POST /api/bookings — awaiting server response…'}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Cursor
        keyframes={[
          { frame: 0, x: 1350, y: 900 },
          { frame: 460, x: 1350, y: 900 },
          { frame: 480, x: 960, y: 820 },
        ]}
        clicks={[500]}
      />
    </div>
  );
};

const FieldBlock: React.FC<React.PropsWithChildren<{ label: string; full?: boolean; locked?: boolean }>> = ({
  label,
  children,
  full,
  locked,
}) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined, marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ color: theme.textFaint, fontFamily: theme.sans, fontSize: 13, fontWeight: 600 }}>{label}</span>
      {locked && <LockIcon />}
    </div>
    <div
      style={{
        background: locked ? theme.panelAlt : 'transparent',
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        minHeight: 24,
      }}
    >
      {children}
    </div>
  </div>
);

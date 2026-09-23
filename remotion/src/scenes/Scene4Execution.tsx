import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { Card, MaskedReveal, SectionLabel, Spinner } from '../components/ui';
import { Cursor } from '../components/Cursor';
import { ConfettiOverlay } from '../components/ConfettiOverlay';
import { CalendarIcon, CheckIcon, ChevronDownIcon, MailIcon } from '../components/icons';

// Frames 3120-4560 (local 0-1440). Sub-phases:
// 0-180 pickZoomAccount() | 180-380 provisionZoomMeeting() | 380-680 getAccountHostKey()
// 680-1080 sendGraphMail()/createGraphCalendarEvent() | 1080-1440 BookingConfirmation.tsx
export const Scene4Execution: React.FC = () => {
  const frame = useCurrentFrame();

  const processingOpacity = interpolate(frame, [0, 20, 1000, 1040], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const confirmationOpacity = interpolate(frame, [1000, 1050], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, background: theme.bg }}>
      <div style={{ position: 'absolute', inset: 0, opacity: processingOpacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ProcessingPanel frame={frame} />
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: confirmationOpacity }}>
        <ConfirmationScene frame={frame} />
      </div>
    </div>
  );
};

const ProcessingPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const accountAActive = frame < 120;
  const resolved = frame >= 120;

  return (
    <Card style={{ width: 820, padding: 44 }}>
      <SectionLabel>{'PROCESSING BOOKING REQUEST'}</SectionLabel>

      {/* pickZoomAccount() */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
        {['Account A', 'Account B'].map((label, i) => {
          const isWinner = i === 0;
          const active = resolved ? isWinner : true;
          const scanning = !resolved;
          return (
            <div
              key={label}
              style={{
                flex: 1,
                borderRadius: 12,
                padding: 20,
                background: resolved && isWinner ? theme.greenDim : theme.panelAlt,
                border: `1px solid ${resolved && isWinner ? theme.green : theme.border}`,
                opacity: resolved && !isWinner ? 0.4 : 1,
                textAlign: 'center',
                fontFamily: theme.sans,
              }}
            >
              <div style={{ color: theme.text, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{label}</div>
              {scanning ? (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Spinner size={16} color={theme.indigoLight} />
                </div>
              ) : (
                <div style={{ color: isWinner ? theme.green : theme.textFaint, fontFamily: theme.mono, fontSize: 12, fontWeight: 700 }}>
                  {isWinner ? 'SELECTED' : 'SKIPPED'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* provisionZoomMeeting() */}
      {frame >= 180 && (
        <ProcessingRow
          opacity={interpolate(frame, [180, 200], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          label="Zoom meeting created"
        >
          <div style={{ display: 'flex', gap: 28, fontFamily: theme.mono, fontSize: 15, color: theme.text }}>
            <span>{'Meeting ID: '}<OdometerNumber frame={frame} from={200} to={330} target="847 2910 5561" /></span>
            <span>{'Passcode: '}<OdometerNumber frame={frame} from={240} to={350} target="7f9K2q" /></span>
          </div>
        </ProcessingRow>
      )}

      {/* getAccountHostKey() */}
      {frame >= 380 && (
        <ProcessingRow
          opacity={interpolate(frame, [380, 400], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          label="Host key resolved"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <MaskedReveal value="481022" revealFrom={520} revealTo={540} hideFrom={620} />
            <span style={{ color: theme.textFaint, fontFamily: theme.sans, fontSize: 13 }}>
              {'visible to booker & host only'}
            </span>
          </div>
        </ProcessingRow>
      )}

      {/* email + calendar */}
      {frame >= 680 && (
        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          <MiniStatusCard
            frame={frame}
            from={680}
            doneAt={920}
            label="Confirmation email"
            icon={<MailIcon size={18} color={theme.text} />}
          />
          <MiniStatusCard
            frame={frame}
            from={760}
            doneAt={980}
            label="Outlook calendar event"
            icon={<CalendarIcon size={18} color={theme.text} />}
          />
        </div>
      )}
    </Card>
  );
};

const ProcessingRow: React.FC<React.PropsWithChildren<{ opacity: number; label: string }>> = ({ opacity, label, children }) => (
  <div style={{ opacity, marginBottom: 24 }}>
    <div style={{ color: theme.textFaint, fontFamily: theme.sans, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
    {children}
  </div>
);

const OdometerNumber: React.FC<{ frame: number; from: number; to: number; target: string }> = ({ frame, from, to, target }) => {
  const progress = interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const count = Math.round(progress * target.length);
  return <span>{target.slice(0, count)}</span>;
};

const MiniStatusCard: React.FC<{ frame: number; from: number; doneAt: number; label: string; icon: React.ReactNode }> = ({
  frame,
  from,
  doneAt,
  label,
  icon,
}) => {
  if (frame < from) return null;
  const done = frame >= doneAt;
  return (
    <div
      style={{
        flex: 1,
        background: theme.panelAlt,
        border: `1px solid ${done ? theme.green : theme.border}`,
        borderRadius: 10,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {icon}
      <div style={{ flex: 1, fontFamily: theme.sans, fontSize: 14, color: theme.text }}>{label}</div>
      {done ? <CheckIcon size={16} color={theme.green} /> : <Spinner size={14} color={theme.indigoLight} />}
    </div>
  );
};

const CAL_OPTIONS = ['Microsoft 365', 'Google Calendar', 'Apple (.ics)'];

const ConfirmationScene: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - 1050;
  const dropdownOpen = local >= 250 && local < 340;
  const pushRowVisible = local >= 340;
  const pushEnabled = local >= 380;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <ConfettiOverlay startFrame={1050} />
      <Card style={{ width: 720, padding: 44, position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: theme.greenDim,
            border: `1px solid ${theme.green}`,
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 26,
          }}
        >
          <CheckIcon size={20} color={theme.green} />
          <span style={{ color: theme.green, fontFamily: theme.sans, fontWeight: 700, fontSize: 16 }}>
            {'Zoom meeting booked successfully'}
          </span>
        </div>

        <SectionLabel>{'Q4 PLANNING SYNC'}</SectionLabel>
        <DetailRow label="Join URL" value="https://zoom.us/j/8472910556" mono />
        <DetailRow label="Meeting ID" value="847 2910 556" mono />
        <DetailRow label="Passcode" value="7f9K2q" mono />

        <div style={{ position: 'relative', marginTop: 26 }}>
          <div
            style={{
              background: `linear-gradient(180deg, ${theme.indigo}, ${theme.indigoDark})`,
              color: '#fff',
              fontFamily: theme.sans,
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 10,
              padding: '14px 22px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CalendarIcon size={18} color="#fff" />
            {'Add to Calendar'}
            <ChevronDownIcon size={14} color="#fff" />
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 58,
                left: 0,
                background: theme.panelSolid,
                border: `1px solid ${theme.borderLight}`,
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
                minWidth: 220,
              }}
            >
              {CAL_OPTIONS.map((opt, i) => {
                const hoverFrame = 1050 + 260 + i * 26;
                const hovered = frame >= hoverFrame && frame < hoverFrame + 26;
                return (
                  <div
                    key={opt}
                    style={{
                      padding: '12px 18px',
                      fontFamily: theme.sans,
                      fontSize: 14,
                      color: theme.text,
                      background: hovered ? theme.indigoDark : 'transparent',
                    }}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pushRowVisible && (
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: theme.panelAlt,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: '12px 16px',
              opacity: interpolate(local, [340, 356], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <span style={{ color: theme.textDim, fontFamily: theme.sans, fontSize: 14 }}>
              {'Get notified when this meeting starts'}
            </span>
            <span
              style={{
                fontFamily: theme.mono,
                fontSize: 12,
                fontWeight: 700,
                color: pushEnabled ? theme.green : theme.indigoLight,
                border: `1px solid ${pushEnabled ? theme.green : theme.indigoLight}`,
                borderRadius: 999,
                padding: '5px 12px',
              }}
            >
              {pushEnabled ? 'ENABLED' : 'ENABLE'}
            </span>
          </div>
        )}
      </Card>

      <Cursor
        keyframes={[
          { frame: 1050 + 160, x: 950, y: 800 },
          { frame: 1050 + 260, x: 950, y: 730 },
          { frame: 1050 + 286, x: 950, y: 780 },
          { frame: 1050 + 312, x: 950, y: 806 },
          { frame: 1050 + 340, x: 1360, y: 940 },
          { frame: 1050 + 375, x: 1360, y: 940 },
        ]}
        clicks={[1050 + 260, 1050 + 380]}
      />
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
    <span style={{ color: theme.textFaint, fontFamily: theme.sans, fontSize: 14 }}>{label}</span>
    <span style={{ color: theme.text, fontFamily: mono ? theme.mono : theme.sans, fontSize: 14 }}>{value}</span>
  </div>
);

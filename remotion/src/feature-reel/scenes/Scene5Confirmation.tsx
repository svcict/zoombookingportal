import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Check, ExternalLink, Video } from 'lucide-react';
import { theme } from '../theme';
import { Card } from '../components/ui';
import { AppShell } from '../components/AppShell';

// Local 0-150: confirmation card assembling, replicating BookingConfirmation.tsx's
// blue ribbon header + "Manage Meeting" summary rows.
export const Scene5Confirmation: React.FC = () => {
  const frame = useCurrentFrame();
  const bannerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const cardOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AppShell activeTab="booking">
      <div style={{ padding: '48px 56px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 880 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: theme.green50,
              border: '1px solid #BBF7D0',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 20,
              opacity: bannerOpacity,
            }}
          >
            <Check size={18} color={theme.green600} />
            <span style={{ color: '#15803d', fontWeight: 700, fontSize: 16 }}>Zoom meeting booked successfully</span>
          </div>

          <Card style={{ overflow: 'hidden', opacity: cardOpacity }}>
            <div
              style={{
                background: theme.blue,
                color: '#fff',
                padding: '20px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Video size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>Q4 Partnership Review</div>
                  <div style={{ fontSize: 13, color: '#dbeafe' }}>Hosted by Jane Director {'•'} 30 Minutes</div>
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  color: theme.blue,
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 10,
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Video size={16} />
                Join Zoom Meeting
                <ExternalLink size={14} />
              </div>
            </div>

            <Row label="Topic" value="Q4 Partnership Review" />
            <Row label="Time" value={'Oct 15, 2026 • 10:00 AM (Asia/Manila)'} />
            <Row label="Meeting ID" value="847 2910 556" mono />
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div
    style={{
      padding: '18px 32px',
      display: 'grid',
      gridTemplateColumns: '140px 1fr',
      gap: 16,
      fontSize: 15,
      borderTop: `1px solid ${theme.borderLight}`,
    }}
  >
    <span style={{ color: theme.gray500, fontWeight: 600 }}>{label}</span>
    <span style={{ color: theme.gray900, fontFamily: mono ? theme.mono : theme.sans, fontWeight: mono ? 500 : 600 }}>
      {value}
    </span>
  </div>
);

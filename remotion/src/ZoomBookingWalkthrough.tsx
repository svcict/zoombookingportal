import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { theme } from './theme';
import { HUD } from './components/HUD';
import { CaptionBanner } from './components/CaptionBanner';
import { Scene1Auth } from './scenes/Scene1Auth';
import { Scene2Availability } from './scenes/Scene2Availability';
import { Scene3Intake } from './scenes/Scene3Intake';
import { Scene4Execution } from './scenes/Scene4Execution';

export const ZoomBookingWalkthrough: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.sans }}>
      <Sequence from={0} durationInFrames={540}>
        <Scene1Auth />
      </Sequence>
      <Sequence from={540} durationInFrames={1500}>
        <Scene2Availability />
      </Sequence>
      <Sequence from={2040} durationInFrames={1080}>
        <Scene3Intake />
      </Sequence>
      <Sequence from={3120} durationInFrames={1440}>
        <Scene4Execution />
      </Sequence>

      {/* HUD and captions live outside the per-scene Sequences so their
          useCurrentFrame() reads the absolute timeline position directly,
          matching HUD_TIMELINE / CAPTION_TIMELINE without offset math. */}
      <HUD />
      <CaptionBanner />
    </AbsoluteFill>
  );
};

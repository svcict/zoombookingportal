import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { theme } from './theme';
import { BEATS } from './data';
import { Callout } from './components/Callout';
import { BrowserChrome } from './components/BrowserChrome';
import { Scene0Intro } from './scenes/Scene0Intro';
import { Scene1SignIn } from './scenes/Scene1SignIn';
import { Scene2SchedulePage } from './scenes/Scene2SchedulePage';
import { Scene4Intake } from './scenes/Scene4Intake';
import { Scene5ConfirmationIntro } from './scenes/Scene5ConfirmationIntro';
import { Scene6ConfirmationDetails } from './scenes/Scene6ConfirmationDetails';
import { Scene7ManageCancel } from './scenes/Scene7ManageCancel';
import { Scene10Outro } from './scenes/Scene10Outro';

const seq = (beat: { from: number; to: number }) => ({ from: beat.from, durationInFrames: beat.to - beat.from });

export const BookingFeatureReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.page, fontFamily: theme.sans }}>
      <BrowserChrome>
        <Sequence {...seq(BEATS.intro)}>
          <Scene0Intro />
        </Sequence>
        <Sequence {...seq(BEATS.signIn)}>
          <Scene1SignIn />
        </Sequence>
        <Sequence {...seq(BEATS.schedulePage)}>
          <Scene2SchedulePage />
        </Sequence>
        <Sequence {...seq(BEATS.intake)}>
          <Scene4Intake />
        </Sequence>
        <Sequence {...seq(BEATS.confirmationIntro)}>
          <Scene5ConfirmationIntro />
        </Sequence>
        <Sequence {...seq(BEATS.confirmationDetails)}>
          <Scene6ConfirmationDetails />
        </Sequence>
        <Sequence {...seq(BEATS.manageCancel)}>
          <Scene7ManageCancel />
        </Sequence>
        <Sequence {...seq(BEATS.outro)}>
          <Scene10Outro />
        </Sequence>

        {/* Callout lives outside the per-scene Sequences so its useCurrentFrame()
            reads the absolute timeline position, matching data.ts directly. */}
        <Callout />
      </BrowserChrome>
    </AbsoluteFill>
  );
};

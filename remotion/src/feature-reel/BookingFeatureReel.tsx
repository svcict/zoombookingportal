import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { theme } from './theme';
import { BEATS } from './data';
import { Callout } from './components/Callout';
import { Scene0Intro } from './scenes/Scene0Intro';
import { Scene1SignIn } from './scenes/Scene1SignIn';
import { Scene2Availability } from './scenes/Scene2Availability';
import { Scene3Duration } from './scenes/Scene3Duration';
import { Scene4Intake } from './scenes/Scene4Intake';
import { Scene5Confirmation } from './scenes/Scene5Confirmation';
import { Scene6HostKey } from './scenes/Scene6HostKey';
import { Scene7AddToCalendar } from './scenes/Scene7AddToCalendar';
import { Scene8Push } from './scenes/Scene8Push';
import { Scene9ManageCancel } from './scenes/Scene9ManageCancel';
import { Scene10Outro } from './scenes/Scene10Outro';

const seq = (beat: { from: number; to: number }) => ({ from: beat.from, durationInFrames: beat.to - beat.from });

export const BookingFeatureReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.page, fontFamily: theme.sans }}>
      <Sequence {...seq(BEATS.intro)}>
        <Scene0Intro />
      </Sequence>
      <Sequence {...seq(BEATS.signIn)}>
        <Scene1SignIn />
      </Sequence>
      <Sequence {...seq(BEATS.availability)}>
        <Scene2Availability />
      </Sequence>
      <Sequence {...seq(BEATS.duration)}>
        <Scene3Duration />
      </Sequence>
      <Sequence {...seq(BEATS.intake)}>
        <Scene4Intake />
      </Sequence>
      <Sequence {...seq(BEATS.confirmation)}>
        <Scene5Confirmation />
      </Sequence>
      <Sequence {...seq(BEATS.hostKey)}>
        <Scene6HostKey />
      </Sequence>
      <Sequence {...seq(BEATS.addToCalendar)}>
        <Scene7AddToCalendar />
      </Sequence>
      <Sequence {...seq(BEATS.push)}>
        <Scene8Push />
      </Sequence>
      <Sequence {...seq(BEATS.manageCancel)}>
        <Scene9ManageCancel />
      </Sequence>
      <Sequence {...seq(BEATS.outro)}>
        <Scene10Outro />
      </Sequence>

      {/* Callout lives outside the per-scene Sequences so its useCurrentFrame()
          reads the absolute timeline position, matching data.ts directly. */}
      <Callout />
    </AbsoluteFill>
  );
};

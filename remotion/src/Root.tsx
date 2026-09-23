import React from 'react';
import { Composition } from 'remotion';
import { ZoomBookingWalkthrough } from './ZoomBookingWalkthrough';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_FRAMES = 4560;

export const Root: React.FC = () => {
  return (
    <Composition
      id="ZoomBookingWalkthrough"
      component={ZoomBookingWalkthrough}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};

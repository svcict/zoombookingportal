import React from 'react';
import { Composition } from 'remotion';
import { ZoomBookingWalkthrough } from './ZoomBookingWalkthrough';
import { BookingFeatureReel } from './feature-reel/BookingFeatureReel';
import { TOTAL_FRAMES as FEATURE_REEL_FRAMES, WIDTH as FR_WIDTH, HEIGHT as FR_HEIGHT, FPS as FR_FPS } from './feature-reel/data';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_FRAMES = 4560;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ZoomBookingWalkthrough"
        component={ZoomBookingWalkthrough}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BookingFeatureReel"
        component={BookingFeatureReel}
        durationInFrames={FEATURE_REEL_FRAMES}
        fps={FR_FPS}
        width={FR_WIDTH}
        height={FR_HEIGHT}
      />
    </>
  );
};

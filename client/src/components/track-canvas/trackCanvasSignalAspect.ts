// client/src/components/track-canvas/trackCanvasSignalAspect.ts

import {
  TrackSignalElementView,
} from "../../models/editor/elements/TrackSignalElementView";

export type SignalAspectPreviews = {
  green: TrackSignalElementView;
  red: TrackSignalElementView;
  yellow: TrackSignalElementView;
  white: TrackSignalElementView;
};

export function createSignalAspectPreviews(
  signal: TrackSignalElementView
): SignalAspectPreviews {
  const green =
    new TrackSignalElementView(0, 0);

  green.aspect = signal.aspect;
  green.setGreen();

  const red =
    new TrackSignalElementView(0, 0);

  red.aspect = signal.aspect;
  red.setRed();

  const yellow =
    new TrackSignalElementView(0, 0);

  yellow.aspect = signal.aspect;
  yellow.setYellow();

  const white =
    new TrackSignalElementView(0, 0);

  white.aspect = signal.aspect;
  white.setWhite();

  return {
    green,
    red,
    yellow,
    white,
  };
}

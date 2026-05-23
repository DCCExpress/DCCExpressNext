// client/src/components/track-canvas/trackCanvasSignalPopoverState.ts

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  TrackSignalElementView,
} from "../../models/editor/elements/TrackSignalElementView";

import type {
  SignalAspectPopoverState,
} from "./TrackCanvas.types";

import {
  createSignalAspectPreviews,
} from "./trackCanvasSignalAspect";

export type SignalAspectPopoverStateSetter =
  Dispatch<SetStateAction<SignalAspectPopoverState>>;

export function openTrackCanvasSignalAspectPopover(
  setSignalAspectPopover: SignalAspectPopoverStateSetter,
  signal: TrackSignalElementView,
  clientX: number,
  clientY: number
): void {
  const previews =
    createSignalAspectPreviews(signal);

  setSignalAspectPopover({
    opened: true,
    x: clientX,
    y: clientY,
    signal,
    previews,
  });
}

export function closeTrackCanvasSignalAspectPopover(
  setSignalAspectPopover: SignalAspectPopoverStateSetter
): void {
  setSignalAspectPopover(previous => ({
    ...previous,
    opened: false,
    signal: null,
  }));
}

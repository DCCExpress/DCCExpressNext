// client/src/components/track-canvas/trackCanvasDoubleTurnoutPopoverState.ts

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";
import type {
  DoubleTurnoutPopoverState,
} from "./TrackCanvas.types";

export type DoubleTurnoutPopoverStateSetter =
  Dispatch<SetStateAction<DoubleTurnoutPopoverState>>;

export function openTrackCanvasDoubleTurnoutPopover(
  setDoubleTurnoutPopover: DoubleTurnoutPopoverStateSetter,
  turnout: TrackTurnoutDoubleElementView,
  clientX: number,
  clientY: number
): void {
  setDoubleTurnoutPopover({
    opened: true,
    x: clientX,
    y: clientY,
    turnout,
  });
}

export function closeTrackCanvasDoubleTurnoutPopover(
  setDoubleTurnoutPopover: DoubleTurnoutPopoverStateSetter
): void {
  setDoubleTurnoutPopover(previous => ({
    ...previous,
    opened: false,
    turnout: null,
  }));
}

export function reopenTrackCanvasDoubleTurnoutPopover(
  setDoubleTurnoutPopover: DoubleTurnoutPopoverStateSetter,
  turnout: TrackTurnoutDoubleElementView,
  clientX: number,
  clientY: number,
  delayMs = 100
): void {
  closeTrackCanvasDoubleTurnoutPopover(
    setDoubleTurnoutPopover
  );

  window.setTimeout(() => {
    openTrackCanvasDoubleTurnoutPopover(
      setDoubleTurnoutPopover,
      turnout,
      clientX,
      clientY
    );
  }, delayMs);
}

// client/src/components/track-canvas/trackCanvasDoubleTurnoutPopoverEvents.ts

import type TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";

export const TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_OPEN_EVENT =
  "trackCanvas:doubleTurnoutPopover:open";

export const TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_CLOSE_EVENT =
  "trackCanvas:doubleTurnoutPopover:close";

export type TrackCanvasDoubleTurnoutPopoverOpenDetail = {
  turnout: TrackTurnoutDoubleElementView;
  clientX: number;
  clientY: number;
};

export function openTrackCanvasDoubleTurnoutCommandPopover(
  turnout: TrackTurnoutDoubleElementView,
  clientX: number,
  clientY: number
): void {
  window.dispatchEvent(
    new CustomEvent<TrackCanvasDoubleTurnoutPopoverOpenDetail>(
      TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_OPEN_EVENT,
      {
        detail: {
          turnout,
          clientX,
          clientY,
        },
      }
    )
  );
}

export function closeTrackCanvasDoubleTurnoutCommandPopover(): void {
  window.dispatchEvent(
    new Event(TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_CLOSE_EVENT)
  );
}

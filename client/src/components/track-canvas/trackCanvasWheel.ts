// client/src/components/track-canvas/trackCanvasWheel.ts

import type {
  ViewState,
} from "./TrackCanvas.types";

import {
  clamp,
} from "./trackCanvasGeometry";

export type TrackCanvasWheelContext = {
  canvas: HTMLCanvasElement;
  view: ViewState;
  isSignalAspectPopoverOpen: boolean;
  closeSignalAspectPopover: () => void;
  persistView: () => void;
  invalidate: () => void;
};

export function handleTrackCanvasWheel(
  event: WheelEvent,
  context: TrackCanvasWheelContext
): void {
  event.preventDefault();

  if (context.isSignalAspectPopoverOpen) {
    context.closeSignalAspectPopover();
  }

  const rect =
    context.canvas.getBoundingClientRect();

  const mouseX =
    event.clientX - rect.left;

  const mouseY =
    event.clientY - rect.top;

  const zoomFactor =
    event.deltaY < 0
      ? 1.1
      : 0.9;

  const oldScale =
    context.view.scale;

  const newScale = clamp(
    oldScale * zoomFactor,
    0.2,
    4
  );

  if (newScale === oldScale) {
    return;
  }

  const worldX =
    (mouseX - context.view.offsetX) / oldScale;

  const worldY =
    (mouseY - context.view.offsetY) / oldScale;

  context.view.scale = newScale;
  context.view.offsetX = mouseX - worldX * newScale;
  context.view.offsetY = mouseY - worldY * newScale;

  context.persistView();
  context.invalidate();
}

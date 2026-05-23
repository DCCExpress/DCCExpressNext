// client/src/components/track-canvas/trackCanvasClock.ts

import type {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import {
  ClockElementView,
} from "../../models/editor/elements/ClockElementView";

import {
  fastClockStore,
} from "../../services/fastClockStore";

export function syncClockElementsWithFastClock(
  layout: LayoutView
): void {
  const snapshot =
    fastClockStore.getDisplaySnapshot();

  if (!snapshot) {
    return;
  }

  const currentTime =
    new Date(1970, 0, 1, 0, 0, 0, snapshot.timeMs);

  for (const element of layout.getAllElements()) {
    if (element instanceof ClockElementView) {
      element.currentTime = currentTime;
    }
  }
}

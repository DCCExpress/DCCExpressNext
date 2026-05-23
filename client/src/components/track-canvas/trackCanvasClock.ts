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

const DAY_ZERO_UTC =
  Date.UTC(1970, 0, 1, 0, 0, 0, 0);

export function syncClockElementsWithFastClock(
  layout: LayoutView
): void {
  const snapshot =
    fastClockStore.getDisplaySnapshot();

  if (!snapshot) {
    return;
  }

  const currentTime =
    new Date(DAY_ZERO_UTC + snapshot.timeMs);

  for (const element of layout.getAllElements()) {
    if (element instanceof ClockElementView) {
      element.currentTime = currentTime;
    }
  }
}

// client/src/components/track-canvas/trackCanvasViewStorage.ts

import type {
  ViewState,
} from "./TrackCanvas.types";

const VIEW_STORAGE_KEY =
  "dcc-express.editor.trackCanvas.view";

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

export function loadSavedViewState(): ViewState {
  try {
    const raw =
      localStorage.getItem(VIEW_STORAGE_KEY);

    if (!raw) {
      return {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      };
    }

    const parsed =
      JSON.parse(raw) as Partial<ViewState>;

    return {
      scale:
        typeof parsed.scale === "number" &&
        Number.isFinite(parsed.scale)
          ? clamp(parsed.scale, 0.2, 4)
          : 1,
      offsetX:
        typeof parsed.offsetX === "number" &&
        Number.isFinite(parsed.offsetX)
          ? parsed.offsetX
          : 0,
      offsetY:
        typeof parsed.offsetY === "number" &&
        Number.isFinite(parsed.offsetY)
          ? parsed.offsetY
          : 0,
    };
  } catch {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }
}

export function saveViewState(
  view: ViewState
): void {
  try {
    localStorage.setItem(
      VIEW_STORAGE_KEY,
      JSON.stringify(view)
    );
  } catch {
    // Ignore storage errors. The canvas can still work with in-memory view state.
  }
}

// client/src/components/track-canvas/trackCanvasSelection.ts

import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { LayoutView } from "../../models/editor/core/LayoutView";
import type { SelectionRect, SelectionState } from "./TrackCanvas.types";

export function normalizeSelectionRect(rect: SelectionRect) {
  return {
    left: Math.min(rect.startGridX, rect.endGridX),
    right: Math.max(rect.startGridX, rect.endGridX),
    top: Math.min(rect.startGridY, rect.endGridY),
    bottom: Math.max(rect.startGridY, rect.endGridY),
  };
}

export function getSelectionRect(selection: SelectionState): SelectionRect | null {
  if (!selection.isSelecting) return null;

  return {
    startGridX: selection.startGridX,
    startGridY: selection.startGridY,
    endGridX: selection.endGridX,
    endGridY: selection.endGridY,
  };
}

export function getAllLayoutElements(layout: LayoutView): BaseElementView[] {
  return [
    ...layout.track.elements,
    ...layout.sensors.elements,
    ...layout.signals.elements,
    ...layout.blocks.elements,
    ...layout.buildings.elements,
  ];
}

export function applySelectionRect(
  layout: LayoutView,
  rect: SelectionRect,
  additive = false
): BaseElementView[] {
  const normalized = normalizeSelectionRect(rect);
  const all = getAllLayoutElements(layout);

  if (!additive) {
    layout.unselectAll();
  }

  const selected = all.filter(element => {
    const bounds = element.getBounds();
    const left = bounds.x;
    const right = bounds.x + bounds.width - 1;
    const top = bounds.y;
    const bottom = bounds.y + bounds.height - 1;

    return left <= normalized.right &&
      right >= normalized.left &&
      top <= normalized.bottom &&
      bottom >= normalized.top;
  });

  for (const element of selected) {
    element.selected = true;
  }

  return all.filter(element => element.selected);
}

// client/src/components/track-canvas/trackCanvasLayoutBounds.ts

import type {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import type {
  ViewState,
} from "./TrackCanvas.types";

import {
  clamp,
} from "./trackCanvasGeometry";

import {
  getAllLayoutElements,
} from "./trackCanvasSelection";

export type LayoutBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function getLayoutBounds(
  layout: LayoutView
): LayoutBounds | null {
  const elements =
    getAllLayoutElements(layout);

  if (elements.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    const bounds = element.getBounds();

    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width - 1);
    maxY = Math.max(maxY, bounds.y + bounds.height - 1);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

export function fitLayoutToView(
  layout: LayoutView,
  view: ViewState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const bounds =
    getLayoutBounds(layout);

  if (!bounds) {
    return;
  }

  const gridSize =
    layout.gridSize;

  const padding = 40;

  const worldLeft =
    bounds.minX * gridSize;

  const worldTop =
    bounds.minY * gridSize;

  const worldRight =
    (bounds.maxX + 1) * gridSize;

  const worldBottom =
    (bounds.maxY + 1) * gridSize;

  const worldWidth =
    worldRight - worldLeft;

  const worldHeight =
    worldBottom - worldTop;

  if (worldWidth <= 0 || worldHeight <= 0) {
    return;
  }

  const availableWidth =
    Math.max(1, canvasWidth - padding * 2);

  const availableHeight =
    Math.max(1, canvasHeight - padding * 2);

  const newScale = clamp(
    Math.min(
      availableWidth / worldWidth,
      availableHeight / worldHeight
    ),
    0.2,
    4
  );

  view.scale = newScale;

  view.offsetX =
    (canvasWidth - worldWidth * newScale) / 2 - worldLeft * newScale;

  view.offsetY =
    (canvasHeight - worldHeight * newScale) / 2 - worldTop * newScale;
}

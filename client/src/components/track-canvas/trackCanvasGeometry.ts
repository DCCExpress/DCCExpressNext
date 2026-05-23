// client/src/components/track-canvas/trackCanvasGeometry.ts

import type {
  BaseElementView,
} from "../../models/editor/core/BaseElementView";

import type {
  TouchPoint,
  ViewState,
} from "./TrackCanvas.types";

export type GridPoint = {
  x: number;
  y: number;
};

export function screenToGrid(
  screenX: number,
  screenY: number,
  view: ViewState,
  gridSize: number
): GridPoint {
  const worldX =
    (screenX - view.offsetX) / view.scale;

  const worldY =
    (screenY - view.offsetY) / view.scale;

  return {
    x: Math.floor(worldX / gridSize),
    y: Math.floor(worldY / gridSize),
  };
}

export function getCenteredElementGridAnchor(
  element: BaseElementView,
  grid: GridPoint
): GridPoint {
  return {
    x: grid.x - Math.floor(element.w / 2),
    y: grid.y - Math.floor(element.h / 2),
  };
}

export function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

export function getDistance(
  a: TouchPoint,
  b: TouchPoint
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function getMidpoint(
  a: TouchPoint,
  b: TouchPoint
): TouchPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

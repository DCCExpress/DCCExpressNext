// client/src/components/track-canvas/trackCanvasGeometry.ts

import type {
  TouchPoint,
  ViewState,
} from "./TrackCanvas.types";

export function screenToGrid(
  screenX: number,
  screenY: number,
  view: ViewState,
  gridSize: number
): { x: number; y: number } {
  const worldX =
    (screenX - view.offsetX) / view.scale;

  const worldY =
    (screenY - view.offsetY) / view.scale;

  return {
    x: Math.floor(worldX / gridSize),
    y: Math.floor(worldY / gridSize),
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

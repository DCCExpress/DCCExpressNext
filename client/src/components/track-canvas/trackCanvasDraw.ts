// client/src/components/track-canvas/trackCanvasDraw.ts

import type {
  Loco,
} from "../../../../common/src/types";

import type {
  BaseElementView,
} from "../../models/editor/core/BaseElementView";

import type {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import type {
  EditorSettings,
} from "../../context/EditorSettingsContext";

import type {
  DrawOptions,
  EditorTool,
} from "../../models/editor/types/EditorTypes";

import type {
  SelectionRect,
  ViewState,
} from "./TrackCanvas.types";

import {
  normalizeSelectionRect,
} from "./trackCanvasSelection";

export type TrackCanvasColorScheme =
  | "light"
  | "dark"
  | "auto";

export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  editMode: boolean,
  colorScheme: TrackCanvasColorScheme,
  view: ViewState,
  mouseGrid: { x: number; y: number },
  tool: EditorTool,
  hoverGrid: { x: number; y: number } | null,
  currentCursor: BaseElementView | null,
  layout: LayoutView,
  settings: EditorSettings,
  dragId?: string,
  selected?: BaseElementView,
  selectionRect?: SelectionRect | null,
  turnoutSelectionMode?: boolean,
  locos?: Loco[]
): void {
  const isDark =
    colorScheme !== "light";

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  drawBackground(
    ctx,
    width,
    height,
    isDark
  );

  ctx.save();
  ctx.translate(
    view.offsetX,
    view.offsetY
  );
  ctx.scale(
    view.scale,
    view.scale
  );

  if (settings.showGrid) {
    drawGrid(
      ctx,
      width,
      height,
      layout.gridSize,
      isDark,
      view
    );
  }

  if (hoverGrid) {
    const gridSize =
      layout.gridSize;

    ctx.strokeStyle = "#ef4444";
    ctx.fillStyle = "#ef444450";
    ctx.lineWidth = 2 / view.scale;

    ctx.fillRect(
      hoverGrid.x * gridSize,
      hoverGrid.y * gridSize,
      gridSize,
      gridSize
    );

    ctx.strokeRect(
      hoverGrid.x * gridSize,
      hoverGrid.y * gridSize,
      gridSize,
      gridSize
    );
  }

  const options: DrawOptions = {
    showOccupancySensorAddress: settings.showOccupacySensorAddress,
    showSensorAddress: settings.showSensorAddress,
    showTurnoutAddress: settings.showTurnoutAddress,
    showSignalAddress: settings.showSignalAddress,
    showSection: settings.showSegments,
    showBlockNames: settings.showBlockNames,
    darkMode: isDark,
    locos: locos || [],
  };

  layout.draw(
    ctx,
    options
  );

  if (currentCursor) {
    currentCursor.x = mouseGrid.x;
    currentCursor.y = mouseGrid.y;

    currentCursor.draw(ctx, {
      showOccupancySensorAddress: false,
      showSensorAddress: false,
      showSignalAddress: false,
      showTurnoutAddress: false,
      locos: [] as Loco[],
    });
  }

  if (selectionRect) {
    drawSelectionRect(
      ctx,
      layout.gridSize,
      selectionRect,
      view.scale
    );
  }

  ctx.restore();

  if (editMode) {
    ctx.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );

    drawInfo(
      ctx,
      width,
      editMode,
      isDark,
      view.scale,
      mouseGrid,
      tool,
      currentCursor
    );
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isDark: boolean
): void {
  ctx.fillStyle =
    isDark
      ? "#313131"
      : "#F8F9FA";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
  isDark: boolean,
  view: ViewState
): void {
  ctx.strokeStyle = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(0,0,0,0.08)";

  ctx.lineWidth =
    1 / view.scale;

  const worldLeft =
    -view.offsetX / view.scale;

  const worldTop =
    -view.offsetY / view.scale;

  const worldRight =
    worldLeft + width / view.scale;

  const worldBottom =
    worldTop + height / view.scale;

  const startX =
    Math.floor(worldLeft / gridSize) * gridSize;

  const endX =
    Math.ceil(worldRight / gridSize) * gridSize;

  const startY =
    Math.floor(worldTop / gridSize) * gridSize;

  const endY =
    Math.ceil(worldBottom / gridSize) * gridSize;

  for (let x = startX; x <= endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, worldTop);
    ctx.lineTo(x, worldBottom);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(worldLeft, y);
    ctx.lineTo(worldRight, y);
    ctx.stroke();
  }
}

export function drawInfo(
  ctx: CanvasRenderingContext2D,
  width: number,
  editMode: boolean,
  isDark: boolean,
  scale: number,
  mouseGrid: { x: number; y: number },
  tool: EditorTool,
  currentCursor: BaseElementView | null
): void {
  const px = 20;

  const toolText =
    tool.mode === "cursor"
      ? "Kurzor"
      : `Rajz: ${tool.elementType}`;

  const rotationText =
    tool.mode === "draw" && currentCursor
      ? ` | Rot: ${currentCursor.rotation}°`
      : "";

  const text = `${editMode ? "Szerkesztési mód" : "Nézet mód"} | Tool: ${toolText}${rotationText} | Zoom: ${Math.round(
    scale * 100
  )}% | X: ${mouseGrid.x} Y: ${mouseGrid.y}`;

  ctx.fillStyle = isDark
    ? "rgba(0,0,0,0.35)"
    : "rgba(255,255,255,0.85)";

  ctx.fillRect(
    px,
    16,
    470,
    32
  );

  ctx.fillStyle =
    isDark
      ? "#ffffff"
      : "#000000";

  ctx.font = "13px sans-serif";

  ctx.fillText(
    text,
    px + 20,
    36
  );
}

export function drawSelectionRect(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  rect: SelectionRect,
  scale: number
): void {
  const normalized =
    normalizeSelectionRect(rect);

  const x =
    normalized.left * gridSize;

  const y =
    normalized.top * gridSize;

  const width =
    (normalized.right - normalized.left + 1) * gridSize;

  const height =
    (normalized.bottom - normalized.top + 1) * gridSize;

  ctx.save();
  ctx.strokeStyle = "#339af0";
  ctx.fillStyle = "rgba(51, 154, 240, 0.18)";
  ctx.lineWidth = 2 / scale;

  ctx.fillRect(
    x,
    y,
    width,
    height
  );

  ctx.strokeRect(
    x,
    y,
    width,
    height
  );

  ctx.restore();
}

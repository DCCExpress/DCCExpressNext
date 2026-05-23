// client/src/components/track-canvas/trackCanvasMouseMove.ts

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  BaseElementView,
} from "../../models/editor/core/BaseElementView";

import type {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import type {
  EditorTool,
} from "../../models/editor/types/EditorTypes";

import type {
  DragState,
  PanState,
  SelectionState,
  ViewState,
} from "./TrackCanvas.types";

import {
  getTrackCanvasCursor,
} from "./trackCanvasCursor";

import {
  screenToGrid,
} from "./trackCanvasGeometry";

import {
  getAllLayoutElements,
} from "./trackCanvasSelection";

export type TrackCanvasMutableRef<T> = {
  current: T;
};

export type TrackCanvasGridPoint = {
  x: number;
  y: number;
};

export type TrackCanvasMouseMoveContext = {
  canvas: HTMLCanvasElement;
  layoutRef: TrackCanvasMutableRef<LayoutView>;
  toolRef: TrackCanvasMutableRef<EditorTool>;
  viewRef: TrackCanvasMutableRef<ViewState>;
  currentCursorRef: TrackCanvasMutableRef<BaseElementView | null>;
  panRef: TrackCanvasMutableRef<PanState>;
  selectionRef: TrackCanvasMutableRef<SelectionState>;
  dragRef: TrackCanvasMutableRef<DragState>;
  editModeRef: TrackCanvasMutableRef<boolean>;
  setMouseGrid: Dispatch<SetStateAction<TrackCanvasGridPoint>>;
  setHoverGrid: Dispatch<SetStateAction<TrackCanvasGridPoint | null>>;
  persistView: () => void;
  invalidate: () => void;
};

export function handleTrackCanvasMouseMove(
  event: MouseEvent,
  context: TrackCanvasMouseMoveContext
): void {
  const {
    canvas,
    layoutRef,
    toolRef,
    viewRef,
    currentCursorRef,
    panRef,
    selectionRef,
    dragRef,
    editModeRef,
    setMouseGrid,
    setHoverGrid,
    persistView,
    invalidate,
  } = context;

  const currentLayout =
    layoutRef.current;

  const currentTool =
    toolRef.current;

  const rect =
    canvas.getBoundingClientRect();

  const mouseX =
    event.clientX - rect.left;

  const mouseY =
    event.clientY - rect.top;

  const grid = screenToGrid(
    mouseX,
    mouseY,
    viewRef.current,
    currentLayout.gridSize
  );

  setMouseGrid(previous =>
    previous.x === grid.x && previous.y === grid.y
      ? previous
      : {
        x: grid.x,
        y: grid.y,
      }
  );

  const hoveredElement =
    currentLayout.getElement(grid.x, grid.y);

  if (toolRef.current.mode === "draw" && currentCursorRef.current) {
    const occupied = currentLayout.getLayeredElement(
      currentCursorRef.current,
      grid.x,
      grid.y
    );

    if (occupied != null) {
      setHoverGrid({
        x: grid.x,
        y: grid.y,
      });
    } else {
      setHoverGrid(null);
    }

    invalidate();
  }

  if (panRef.current.isPanning) {
    event.preventDefault();

    const dx =
      event.clientX - panRef.current.lastX;

    const dy =
      event.clientY - panRef.current.lastY;

    panRef.current.lastX = event.clientX;
    panRef.current.lastY = event.clientY;

    viewRef.current.offsetX += dx;
    viewRef.current.offsetY += dy;

    persistView();
    invalidate();
    return;
  }

  if (selectionRef.current.isSelecting) {
    event.preventDefault();

    selectionRef.current.endGridX = grid.x;
    selectionRef.current.endGridY = grid.y;

    canvas.style.cursor = "crosshair";
    invalidate();
    return;
  }

  if (dragRef.current.isDraggingElement && dragRef.current.elementId) {
    event.preventDefault();

    const dx =
      grid.x - dragRef.current.startMouseGridX;

    const dy =
      grid.y - dragRef.current.startMouseGridY;

    const all =
      getAllLayoutElements(currentLayout);

    const selectedIds = new Set(
      dragRef.current.draggedElements.map(item => item.id)
    );

    for (const item of dragRef.current.draggedElements) {
      const element =
        all.find(candidate => candidate.id === item.id);

      if (!element) {
        continue;
      }

      const nextX = item.startX + dx;
      const nextY = item.startY + dy;

      const occupied = currentLayout.getLayeredElement(
        element,
        nextX,
        nextY
      );

      if (occupied && !selectedIds.has(occupied.id)) {
        setHoverGrid({
          x: grid.x,
          y: grid.y,
        });

        canvas.style.cursor = "not-allowed";
        return;
      }
    }

    setHoverGrid(null);

    for (const item of dragRef.current.draggedElements) {
      const element =
        all.find(candidate => candidate.id === item.id);

      if (!element) {
        continue;
      }

      element.x = item.startX + dx;
      element.y = item.startY + dy;
    }

    canvas.style.cursor = "move";
    invalidate();
    return;
  }

  canvas.style.cursor = getTrackCanvasCursor(
    editModeRef.current,
    currentTool,
    hoveredElement
  );
}

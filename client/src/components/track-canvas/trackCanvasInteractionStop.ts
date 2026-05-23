// client/src/components/track-canvas/trackCanvasInteractionStop.ts

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
  DragState,
  PanState,
  SelectionState,
} from "./TrackCanvas.types";

import {
  applySelectionRect,
  getAllLayoutElements,
  getSelectionRect,
} from "./trackCanvasSelection";

export type TrackCanvasMutableRef<T> = {
  current: T;
};

export type StopTrackCanvasInteractionContext = {
  canvas: HTMLCanvasElement;
  layoutRef: TrackCanvasMutableRef<LayoutView>;
  dragRef: TrackCanvasMutableRef<DragState>;
  panRef: TrackCanvasMutableRef<PanState>;
  selectionRef: TrackCanvasMutableRef<SelectionState>;
  currentCursorRef: TrackCanvasMutableRef<BaseElementView | null>;
  setHoverGrid: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
  onSelectedElementChange: (element: BaseElementView | null) => void;
  onLayoutChange: Dispatch<SetStateAction<LayoutView>>;
  persistView: () => void;
  invalidate: () => void;
};

export function stopTrackCanvasInteraction(
  context: StopTrackCanvasInteractionContext
): void {
  const {
    canvas,
    layoutRef,
    dragRef,
    panRef,
    selectionRef,
    currentCursorRef,
    setHoverGrid,
    onSelectedElementChange,
    onLayoutChange,
    persistView,
    invalidate,
  } = context;

  const wasDragging =
    dragRef.current.isDraggingElement;

  if (selectionRef.current.isSelecting) {
    const rect =
      getSelectionRect(selectionRef.current);

    if (rect) {
      const selected = applySelectionRect(
        layoutRef.current,
        rect,
        selectionRef.current.additive
      );

      if (selected.length === 1) {
        onSelectedElementChange(selected[0]!);
      } else {
        onSelectedElementChange(null);
      }

      onLayoutChange(previous => previous);
    }

    selectionRef.current.isSelecting = false;
    selectionRef.current.additive = false;
  }

  if (panRef.current.isPanning) {
    persistView();
  }

  panRef.current.isPanning = false;

  if (wasDragging) {
    const currentLayout =
      layoutRef.current;

    const allElements =
      getAllLayoutElements(currentLayout);

    const elementActuallyMoved =
      dragRef.current.draggedElements.some(dragged => {
        const current =
          allElements.find(element => element.id === dragged.id);

        if (!current) {
          return false;
        }

        return (
          current.x !== dragged.startX ||
          current.y !== dragged.startY
        );
      });

    if (elementActuallyMoved) {
      onLayoutChange(previous => previous);
    }
  }

  dragRef.current.isDraggingElement = false;
  dragRef.current.elementId = null;
  dragRef.current.draggedElements = [];

  canvas.style.cursor = "default";

  const cursor =
    currentCursorRef.current;

  if (cursor) {
    const occupied = layoutRef.current.getLayeredElement(
      cursor,
      cursor.x,
      cursor.y
    );

    if (occupied) {
      setHoverGrid({
        x: cursor.x,
        y: cursor.y,
      });
    }
  } else {
    setHoverGrid(null);
  }

  invalidate();
}

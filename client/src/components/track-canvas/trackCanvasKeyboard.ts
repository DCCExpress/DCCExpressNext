// client/src/components/track-canvas/trackCanvasKeyboard.ts

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
  ViewState,
} from "./TrackCanvas.types";

import {
  fitLayoutToView,
} from "./trackCanvasLayoutBounds";

import {
  getAllLayoutElements,
} from "./trackCanvasSelection";

export type TrackCanvasRef<T> = {
  current: T;
};

export type TrackCanvasKeyboardContext = {
  canvasRef: TrackCanvasRef<HTMLCanvasElement | null>;
  layoutRef: TrackCanvasRef<LayoutView>;
  toolRef: TrackCanvasRef<EditorTool>;
  editModeRef: TrackCanvasRef<boolean>;
  currentCursorRef: TrackCanvasRef<BaseElementView | null>;
  selectedElementRef: TrackCanvasRef<BaseElementView | null>;
  viewRef: TrackCanvasRef<ViewState>;
  setCurrentCursor: Dispatch<SetStateAction<BaseElementView | null>>;
  onBeforeLayoutChange?: (() => void) | undefined;
  onLayoutChange: Dispatch<SetStateAction<LayoutView>>;
  onSelectedElementChange: (element: BaseElementView | null) => void;
  closeSignalAspectPopover: () => void;
  persistView: () => void;
  invalidate: () => void;
};

export function handleTrackCanvasKeyDown(
  event: KeyboardEvent,
  context: TrackCanvasKeyboardContext
): void {
  const active =
    document.activeElement as HTMLElement | null;

  if (active?.tagName !== "CANVAS") {
    return;
  }

  const currentLayout =
    context.layoutRef.current;

  const currentTool =
    context.toolRef.current;

  const currentEditMode =
    context.editModeRef.current;

  const selected =
    currentLayout.getSelected();

  const selectedElements =
    getAllLayoutElements(currentLayout)
      .filter(element => element.selected);

  if (event.key.toLowerCase() === "escape") {
    context.closeSignalAspectPopover();
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();

    const canvas =
      context.canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    fitLayoutToView(
      context.layoutRef.current,
      context.viewRef.current,
      rect.width,
      rect.height
    );

    context.persistView();
    context.invalidate();
    return;
  }

  if (!currentEditMode) {
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();

    if (currentTool.mode === "draw") {
      const cursor =
        context.currentCursorRef.current;

      if (!cursor) {
        return;
      }

      cursor.rotation =
        (cursor.rotation + cursor.rotationStep) % 360;

      context.setCurrentCursor(
        cursor.clone()
      );

      context.invalidate();
      return;
    }

    if (currentTool.mode === "cursor") {
      if (!selected) {
        return;
      }

      context.onBeforeLayoutChange?.();

      selected.rotation =
        (selected.rotation + selected.rotationStep) % 360;

      context.onLayoutChange(previous => previous);
      context.invalidate();
      return;
    }
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (!selected) {
      return;
    }

    event.preventDefault();
    context.onBeforeLayoutChange?.();

    for (const element of selectedElements) {
      currentLayout.removeElement(element);
    }

    if (context.selectedElementRef.current?.id === selected.id) {
      context.onSelectedElementChange(null);
    }

    context.onLayoutChange(previous => previous);
    context.invalidate();
  }
}

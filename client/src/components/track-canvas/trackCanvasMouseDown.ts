// client/src/components/track-canvas/trackCanvasMouseDown.ts

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  TFunction,
} from "i18next";

import {
  ELEMENT_TYPES,
} from "../../../../common/src/layout/elementTypes";

import {
  generateId,
  showErrorMessage,
} from "../../helpers";

import type {
  BaseElementView,
} from "../../models/editor/core/BaseElementView";

import {
  isTurnoutElement,
  type LayoutView,
} from "../../models/editor/core/LayoutView";

import {
  AudioButtonElementView,
} from "../../models/editor/elements/AudioButtonElementView";

import {
  BlockElementView,
} from "../../models/editor/elements/BlockElementView";

import {
  RouteButtonElementView,
} from "../../models/editor/elements/RouteButtonElementView";

import {
  TrackSignalElementView,
} from "../../models/editor/elements/TrackSignalElementView";

import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";

import type {
  EditorTool,
} from "../../models/editor/types/EditorTypes";

import type {
  DragState,
  PanState,
  SelectionState,
  SignalAspectPopoverState,
  ViewState,
} from "./TrackCanvas.types";

import {
  getCenteredElementGridAnchor,
  screenToGrid,
} from "./trackCanvasGeometry";

import {
  getAllLayoutElements,
} from "./trackCanvasSelection";

import {
  closeTrackCanvasDoubleTurnoutCommandPopover,
  openTrackCanvasDoubleTurnoutCommandPopover,
} from "./trackCanvasDoubleTurnoutPopoverEvents";

type MouseDownRef<T> = {
  current: T;
};

export type TrackCanvasMouseDownContext = {
  canvas: HTMLCanvasElement;
  layoutRef: MouseDownRef<LayoutView>;
  toolRef: MouseDownRef<EditorTool>;
  viewRef: MouseDownRef<ViewState>;
  editModeRef: MouseDownRef<boolean>;
  turnoutSelectionModeRef: MouseDownRef<boolean>;
  selectedElementRef: MouseDownRef<BaseElementView | null>;
  currentCursorRef: MouseDownRef<BaseElementView | null>;
  signalAspectPopoverRef: MouseDownRef<SignalAspectPopoverState>;
  panRef: MouseDownRef<PanState>;
  dragRef: MouseDownRef<DragState>;
  selectionRef: MouseDownRef<SelectionState>;
  setSelectedBlock: Dispatch<SetStateAction<BlockElementView | null>>;
  setLocoPickerOpen: Dispatch<SetStateAction<boolean>>;
  setRouteTurnoutsMarked: (routeButton: RouteButtonElementView) => void;
  onInvalidate: () => void;
  onBeforeLayoutChange?: (() => void) | undefined;
  onLayoutChange: Dispatch<SetStateAction<LayoutView>>;
  onSelectedElementChange: (element: BaseElementView | null) => void;
  openSignalAspectPopover: (
    signal: TrackSignalElementView,
    clientX: number,
    clientY: number
  ) => void;
  reopenSignalAspectPopover: (
    signal: TrackSignalElementView,
    clientX: number,
    clientY: number
  ) => void;
  closeSignalAspectPopover: () => void;
  handleClickableDown: (
    hitElement: BaseElementView | null,
    event: MouseEvent | PointerEvent
  ) => boolean;
  invalidate: () => void;
  t: TFunction;
};

export function handleTrackCanvasMouseDown(
  event: MouseEvent,
  context: TrackCanvasMouseDownContext
): void {
  const {
    canvas,
    layoutRef,
    toolRef,
    viewRef,
    editModeRef,
    turnoutSelectionModeRef,
    selectedElementRef,
    currentCursorRef,
    signalAspectPopoverRef,
    panRef,
    dragRef,
    selectionRef,
    setSelectedBlock,
    setLocoPickerOpen,
    setRouteTurnoutsMarked,
    onInvalidate,
    onBeforeLayoutChange,
    onLayoutChange,
    onSelectedElementChange,
    openSignalAspectPopover,
    reopenSignalAspectPopover,
    closeSignalAspectPopover,
    handleClickableDown,
    invalidate,
    t,
  } = context;

  const currentLayout =
    layoutRef.current;

  const currentTool =
    toolRef.current;

  const currentEditMode =
    editModeRef.current;

  const currentTurnoutSelection =
    turnoutSelectionModeRef.current;

  const currentElement =
    selectedElementRef.current;

  if (event.button === 2) {
    event.preventDefault();

    if (signalAspectPopoverRef.current.opened) {
      closeSignalAspectPopover();
    }

    closeTrackCanvasDoubleTurnoutCommandPopover();

    panRef.current.isPanning = true;
    panRef.current.lastX = event.clientX;
    panRef.current.lastY = event.clientY;
    canvas.style.cursor = "grabbing";
    return;
  }

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

  const hitElement =
    currentLayout.getElement(grid.x, grid.y);

  if (!editModeRef.current && hitElement?.type === ELEMENT_TYPES.BUTTON_AUDIO) {
    const audioButton =
      hitElement as AudioButtonElementView;

    audioButton.press(() => {
      invalidate();
    });

    return;
  }

  if (currentEditMode) {
    if (currentTurnoutSelection) {
      if (hitElement) {
        if (currentElement instanceof RouteButtonElementView) {
          if (isTurnoutElement(hitElement)) {
            const closed =
              hitElement.turnoutClosed;

            currentElement.addOrUpdateTurnout(
              hitElement.id,
              closed
            );

            setRouteTurnoutsMarked(
              selectedElementRef.current as RouteButtonElementView
            );

            onInvalidate();
          }
        } else {
          alert("Nincs aktív RouteButton");
        }

        return;
      }

      return;
    }
  }

  if (!editModeRef.current) {
    if (hitElement instanceof BlockElementView) {
      setSelectedBlock(hitElement);
      setLocoPickerOpen(true);
    }

    if (hitElement instanceof TrackSignalElementView) {
      closeTrackCanvasDoubleTurnoutCommandPopover();

      if (signalAspectPopoverRef.current.opened) {
        reopenSignalAspectPopover(
          hitElement,
          event.clientX,
          event.clientY
        );
      } else {
        openSignalAspectPopover(
          hitElement,
          event.clientX,
          event.clientY
        );
      }

      return;
    }

    if (hitElement instanceof TrackTurnoutDoubleElementView) {
      if (signalAspectPopoverRef.current.opened) {
        closeSignalAspectPopover();
      }

      openTrackCanvasDoubleTurnoutCommandPopover(
        hitElement,
        event.clientX,
        event.clientY
      );

      return;
    }
  }

  if (signalAspectPopoverRef.current.opened) {
    closeSignalAspectPopover();
  }

  closeTrackCanvasDoubleTurnoutCommandPopover();

  if (toolRef.current.mode === "cursor" && !editModeRef.current) {
    if (handleClickableDown(hitElement, event)) {
      return;
    }
  }

  if (!currentEditMode) {
    return;
  }

  if (currentTool.mode === "delete") {
    const element =
      currentLayout.getElement(grid.x, grid.y);

    if (element) {
      onBeforeLayoutChange?.();
      currentLayout.removeElement(element);
      onLayoutChange(previous => previous);
      invalidate();
    }

    return;
  }

  if (currentTool.mode === "draw") {
    const cursor =
      currentCursorRef.current;

    if (!cursor) {
      return;
    }

    const cursorAnchor = getCenteredElementGridAnchor(
      cursor,
      grid
    );

    const exists = currentLayout.getLayeredElement(
      cursor,
      cursorAnchor.x,
      cursorAnchor.y
    );

    if (exists) {
      showErrorMessage(
        t("common.error"),
        t("editor.messages.alreadyHasElement")
      );

      return;
    }

    onBeforeLayoutChange?.();

    const newElement =
      cursor.clone();

    newElement.id = generateId();
    newElement.x = cursorAnchor.x;
    newElement.y = cursorAnchor.y;
    newElement.selected = false;

    switch (newElement.layerName) {
      case "blocks":
        currentLayout.blocks.elements.push(newElement);
        break;
      case "signals":
        currentLayout.signals.elements.push(newElement);
        break;
      case "sensors":
        currentLayout.sensors.elements.push(newElement);
        break;
      case "track":
        currentLayout.track.elements.push(newElement);
        break;
      case "buildings":
        currentLayout.buildings.elements.push(newElement);
        break;
    }

    onLayoutChange(previous => previous);
    invalidate();
    return;
  }

  if (hitElement) {
    if (event.ctrlKey) {
      hitElement.selected = !hitElement.selected;

      const allSelected = getAllLayoutElements(currentLayout)
        .filter(element => element.selected);

      if (allSelected.length === 1) {
        onSelectedElementChange(allSelected[0]!);
      } else {
        onSelectedElementChange(null);
      }

      onLayoutChange(previous => previous);
      invalidate();
      return;
    }

    const wasSelected =
      hitElement.selected;

    if (!wasSelected) {
      currentLayout.unselectAll();
      hitElement.selected = true;
      onSelectedElementChange(hitElement);
    }

    const dragged = getAllLayoutElements(currentLayout)
      .filter(element => element.selected)
      .map(element => ({
        id: element.id,
        startX: element.x,
        startY: element.y,
      }));

    onBeforeLayoutChange?.();

    dragRef.current.isDraggingElement = true;
    dragRef.current.elementId = hitElement.id;
    dragRef.current.startMouseGridX = grid.x;
    dragRef.current.startMouseGridY = grid.y;
    dragRef.current.startElementX = hitElement.x;
    dragRef.current.startElementY = hitElement.y;
    dragRef.current.draggedElements = dragged;
    canvas.style.cursor = "move";
    invalidate();
    return;
  }

  if (currentTool.mode === "cursor") {
    if (!event.ctrlKey) {
      currentLayout.unselectAll();
      onSelectedElementChange(null);
    }

    selectionRef.current.isSelecting = true;
    selectionRef.current.additive = event.ctrlKey;
    selectionRef.current.startGridX = grid.x;
    selectionRef.current.startGridY = grid.y;
    selectionRef.current.endGridX = grid.x;
    selectionRef.current.endGridY = grid.y;
    canvas.style.cursor = "crosshair";
    invalidate();
    return;
  }

  if (!event.ctrlKey) {
    currentLayout.unselectAll();
    onSelectedElementChange(null);
    onLayoutChange(previous => previous);
    invalidate();
  }
}

import { useMantineColorScheme } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { generateId, showErrorMessage, showWarningMessage } from "../helpers";
import { BaseElementView } from "../models/editor/core/BaseElementView";
import { isTurnoutElement } from "../models/editor/core/LayoutView";
import { TrackTurnoutLeftElementView } from "../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../models/editor/elements/TrackTurnoutRightElementView";
import { EditorTool } from "../models/editor/types/EditorTypes";

import { useCommandCenter } from "../context/CommandCenterContext";
import { useEditorSettings } from "../context/EditorSettingsContext";
import { ClickableBaseElementView } from "../models/editor/core/ClickableBaseElementView";
import { AudioButtonElementView } from "../models/editor/elements/AudioButtonElementView";
import { BlockElementView } from "../models/editor/elements/BlockElementView";
import { ExtendedRouteButtonElementView } from "../models/editor/elements/ExtendedRouteButtonElementView";
import { RouteButtonElementView } from "../models/editor/elements/RouteButtonElementView";
import { TrackSignalElementView } from "../models/editor/elements/TrackSignalElementView";
import TrackTurnoutDoubleElementView from "../models/editor/elements/TrackTurnoutDoubleElementView";
import { TrackTurnoutTwoWayElementView } from "../models/editor/elements/TrackTurnoutTwoWayElementView";
import { wsApi } from "../services/wsApi";
import "../styles/TrackCanvas.css";

import { ELEMENT_TYPES } from "../../../common/src/layout/elementTypes";
import { useTranslation } from "react-i18next";
import { subscribeCanvasImageCache } from "../models/editor/rendering/ImageCache";
import {
  applySelectionRect,
  clamp,
  createCursorElement,
  closeTrackCanvasSignalAspectPopover,
  drawScene,
  TrackCanvasBlockLocoPicker,
  TrackCanvasSignalAspectPopover,
  handleTrackCanvasClickableDown,
  handleTrackCanvasClickableUp,
  fitLayoutToView,
  getAllLayoutElements,
  getDistance,
  getMidpoint,
  getTrackCanvasCursor,
  handleTrackCanvasKeyDown,
  handleTrackCanvasMouseDown,
  handleTrackCanvasMouseMove,
  handleTrackCanvasWheel,
  getSelectionRect,
  loadSavedViewState,
  openTrackCanvasSignalAspectPopover,
  registerTrackCanvasEventListeners,
  reopenTrackCanvasSignalAspectPopover,
  saveViewState,
  screenToGrid,
  stopTrackCanvasInteraction,
  type CanvasSize,
  type DragState,
  type PanState,
  type PinchState,
  type PointerPanState,
  type SelectionRect,
  type SelectionState,
  type SignalAspectPopoverState,
  type TouchPoint,
  type TrackCanvasProps,
  type ViewState,
} from "./track-canvas";

export default function TrackCanvas({
  editMode = false,
  tool,
  layout,
  onLayoutChange,
  onBeforeLayoutChange,
  selectedElement,
  onSelectedElementChange,
  invalidateCounter: invalidateCounter,
  onInvalidate,
  fitCounter,
  turnoutSelectionMode,
  setBusy,
  locos,
}: TrackCanvasProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { colorScheme } = useMantineColorScheme();

  const [mouseGrid, setMouseGrid] = useState({ x: 0, y: 0 });
  const [hoverGrid, setHoverGrid] = useState<{ x: number; y: number } | null>(null);
  const [currentCursor, setCurrentCursor] = useState<BaseElementView | null>(null);
  const [drawVersion, setDrawVersion] = useState(0);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0, });

  const turnoutSelectionModeRef = useRef(false);
  //const [lo]
  const [locoPickerOpen, setLocoPickerOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockElementView | null>(null);

  const touchPointsRef = useRef<Map<number, TouchPoint>>(new Map());
  const viewRef = useRef<ViewState>(loadSavedViewState());
  const panRef = useRef<PanState>({
    isPanning: false,
    lastX: 0,
    lastY: 0,
  });
  const dragRef = useRef<DragState>({
    isDraggingElement: false,
    elementId: null,
    startMouseGridX: 0,
    startMouseGridY: 0,
    startElementX: 0,
    startElementY: 0,
    draggedElements: [],
  });

  const selectionRef = useRef<SelectionState>({
    isSelecting: false,
    additive: false,
    startGridX: 0,
    startGridY: 0,
    endGridX: 0,
    endGridY: 0,
  });

  const pointerPanRef = useRef<PointerPanState>({
    activePointerId: null,
    isTouchPanning: false,
  });

  const pinchRef = useRef<PinchState>({
    isPinching: false,
    pointer1Id: null,
    pointer2Id: null,
    startDistance: 0,
    startScale: 1,
    worldCenterX: 0,
    worldCenterY: 0,
  });
  const prevToolRef = useRef<EditorTool | null>(null);

  const layoutRef = useRef(layout);
  const toolRef = useRef(tool);
  const editModeRef = useRef(editMode);
  const selectedElementRef = useRef<BaseElementView | null>(selectedElement);
  const currentCursorRef = useRef<BaseElementView | null>(currentCursor);

  const [signalAspectPopover, setSignalAspectPopover] =
    useState<SignalAspectPopoverState>({
      opened: false,
      x: 0,
      y: 0,
      signal: null,
      previews: null,
    });

  const signalAspectPopoverRef = useRef(signalAspectPopover);
  useEffect(() => {
    signalAspectPopoverRef.current = signalAspectPopover;
  }, [signalAspectPopover]);

  const invalidate = () => {
    setDrawVersion((prev) => prev + 1);
  };


  const commandCenter = useCommandCenter();
  const commandCenterRef = useRef(commandCenter);

  useEffect(() => {
    commandCenterRef.current = commandCenter;
  }, [commandCenter]);

  useEffect(() => {
    return subscribeCanvasImageCache(() => {
      onInvalidate();
    });
  }, [onInvalidate]);

  useEffect(() => {
    invalidate();
  }, [invalidateCounter]);

  const { settings } = useEditorSettings();
  // useEffect(() => {
  //   alert("OK" + settings.showAddress)
  // }, [settings])

  const persistView = () => {
    saveViewState(viewRef.current);
  };

  useEffect(() => {
    layoutRef.current = layout;
    onSelectedElementChange(null);
    layout.unselectAll();
  }, [layout]);

  useEffect(() => {
    toolRef.current = tool;
    layout.unselectAll();
    setHoverGrid(null);
  }, [tool]);

  useEffect(() => {
    editModeRef.current = editMode;
    setHoverGrid(null);
  }, [editMode]);

  useEffect(() => {

    if (selectedElementRef.current && selectedElementRef.current instanceof RouteButtonElementView) {
      if (layoutRef.current) {
        const elems = layoutRef.current.getAllElements();
        elems.forEach(elem => { elem.marked = false; })
      }
    }

    selectedElementRef.current = selectedElement;
    setHoverGrid(null);
  }, [selectedElement]);

  useEffect(() => {
    currentCursorRef.current = currentCursor;
  }, [currentCursor]);

  useEffect(() => {
    if (fitCounter === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    fitLayoutToView(layoutRef.current, viewRef.current, width, height);
    persistView();
    invalidate();
  }, [fitCounter]);

  useEffect(() => {
    if (selectedElement) {
      layout.setSelected(selectedElement);
    } else {
      // csak akkor unselectelünk, ha tényleg nincs több kijelölt elem
      const hasAnySelected = getAllLayoutElements(layout).some((el) => el.selected);
      if (!hasAnySelected) {
        layout.unselectAll();
      }
    }

    invalidate();


  }, [selectedElement, layout]);

  useEffect(() => {
    onSelectedElementChange(null);
    prevToolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    if (tool.mode !== "draw") {
      setCurrentCursor(null);
      layoutRef.current.unselectAll();
      return;
    }

    const cursor = createCursorElement(tool);
    cursor!.selected = true;
    canvasRef.current?.focus();
    setCurrentCursor(cursor);
  }, [tool]);

  useEffect(() => {
    if (editMode && signalAspectPopoverRef.current.opened) {
      closeSignalAspectPopover();
    }
    invalidate();
  }, [layout, colorScheme, tool, mouseGrid, hoverGrid, editMode, currentCursor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.focus();

    const parent = canvas.parentElement;
    if (!parent) return;

    const updateSize = () => {
      setCanvasSize({
        width: parent.clientWidth,
        height: parent.clientHeight,
      });
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      if (signalAspectPopoverRef.current.opened) {
        closeSignalAspectPopover();
      }
      updateSize();
    });

    ro.observe(parent);

    return () => {
      ro.disconnect();
    };
  }, []);

  const setRouteTurnoutsMarked = (rb: RouteButtonElementView) => {
    const elems = layoutRef.current.getAllElements();
    for (const elem of elems) {
      if (isTurnoutElement(elem)) {
        const found = rb.routeTurnouts.find((e) => e.turnoutId === elem.id);
        if (found) {
          elem.marked = true;
        } else {
          elem.marked = false;
        }
      }
    }
    invalidate();
  };

  useEffect(() => {

    turnoutSelectionModeRef.current = turnoutSelectionMode;

    if (layoutRef.current) {
      const elems = layoutRef.current.getAllElements();
      if (turnoutSelectionMode) {
        for (const elem of elems) {
          if (elem instanceof TrackTurnoutLeftElementView || elem instanceof TrackTurnoutRightElementView) {
            elem.enabled = true;
          } else {
            elem.enabled = false;
          }
        }

        setRouteTurnoutsMarked(selectedElementRef.current as RouteButtonElementView);

      } else {
        for (const elem of elems) {
          elem.enabled = true;
          elem.marked = false;
        }
      }
    }



  }, [turnoutSelectionMode])


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(canvasSize.width * dpr);
    canvas.height = Math.floor(canvasSize.height * dpr);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);


    //if(turnoutSelectionModeRef.current){
    if (selectedElementRef.current instanceof RouteButtonElementView) {
      setRouteTurnoutsMarked(selectedElementRef.current as RouteButtonElementView);
    }
    //}


    drawScene(
      ctx,
      canvasSize.width,
      canvasSize.height,
      editMode,
      colorScheme,
      viewRef.current,
      mouseGrid,
      tool,
      hoverGrid,
      currentCursor,
      layout,
      settings,
      dragRef.current.elementId ?? undefined,
      selectedElement ?? undefined,
      getSelectionRect(selectionRef.current),
      turnoutSelectionMode,
      locos || []
    );
    //}, [canvasSize, editMode, colorScheme, mouseGrid, tool, hoverGrid, currentCursor, layout, drawVersion, selectedElement, settings, turnoutSelectionMode]);
    // Mouse grid és hover grid nélkül, mert az csak a hover effekt miatt van, és az nem igényel teljes újradraw-t
  }, [canvasSize, editMode, colorScheme, tool, currentCursor, layout, drawVersion, invalidateCounter, selectedElement, settings, turnoutSelectionMode]);



  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (ev: WheelEvent) => {
      handleTrackCanvasWheel(ev, {
        canvas,
        view: viewRef.current,
        isSignalAspectPopoverOpen: signalAspectPopoverRef.current.opened,
        closeSignalAspectPopover,
        persistView,
        invalidate,
      });
    };

    const reopenSignalAspectPopover = (
      signal: TrackSignalElementView,
      clientX: number,
      clientY: number
    ) => {
      reopenTrackCanvasSignalAspectPopover(
        setSignalAspectPopover,
        signal,
        clientX,
        clientY
      );
    };
    const handleClickableDown = (
      hitElement: BaseElementView | null,
      ev: MouseEvent | PointerEvent
    ): boolean => {
      return handleTrackCanvasClickableDown(
        hitElement,
        ev,
        {
          layout: layoutRef.current,
          t,
          commandCenterLocked: commandCenterRef.current.locked,
          setBusy,
        }
      );
    };

    const handleClickableUp = (
      hitElement: BaseElementView | null,
      ev: MouseEvent | PointerEvent
    ): boolean => {
      return handleTrackCanvasClickableUp(
        hitElement,
        ev
      );
    };

    const handleMouseDown = (ev: MouseEvent) => {
      handleTrackCanvasMouseDown(ev, {
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
      });
    };

    const handleMouseMove = (ev: MouseEvent) => {
      handleTrackCanvasMouseMove(ev, {
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
      });
    };
    const stopInteraction = () => {
      stopTrackCanvasInteraction({
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
      });
    };

    const handleMouseUp = (ev: MouseEvent) => {

      if (!editModeRef.current && ev.button == 0) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = ev.clientX - rect.left;
        const mouseY = ev.clientY - rect.top;

        const grid = screenToGrid(
          mouseX,
          mouseY,
          viewRef.current,
          layoutRef.current.gridSize
        );

        const hitElement = layoutRef.current.getElement(grid.x, grid.y);
        // if (hitElement) {
        //   if (hitElement instanceof ClickableBaseElementView) {
        //     const elem = hitElement as ClickableBaseElementView
        //     elem.mouseUp(ev);
        //   }
        // }
        handleClickableUp(hitElement, ev);
        return;
      }
      stopInteraction();
    };

    const handleMouseLeave = () => {
      stopInteraction();
      setHoverGrid(null);
    };

    const handleContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
    };

    // =======================================================
    // TABLET
    // =======================================================

    // #region TABLET
    const handlePointerDown = (ev: PointerEvent) => {
      if (ev.pointerType !== "touch") return;

      ev.preventDefault();

      const currentLayout = layoutRef.current;
      const currentTool = toolRef.current;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;

      touchPointsRef.current.set(ev.pointerId, { x: mouseX, y: mouseY });

      const grid = screenToGrid(
        mouseX,
        mouseY,
        viewRef.current,
        currentLayout.gridSize
      );

      const hitElement = currentLayout.getElement(grid.x, grid.y);

      //alert("PointerDown")
      // if (!editModeRef.current) {
      //   if (currentTool.mode === "cursor" && hitElement instanceof ClickableBaseElementView) {
      //     hitElement.mouseDown(ev as any);
      //   }
      // }

      if (!editModeRef.current) {

        if (!editModeRef.current && hitElement instanceof AudioButtonElementView) {
          hitElement.press(() => {
            invalidate();
          });

          try {
            canvas.setPointerCapture(ev.pointerId);
          } catch {
            // ignore
          }

          return;
        }

        if (!editModeRef.current && hitElement instanceof BlockElementView) {
          ev.preventDefault();
          ev.stopPropagation();

          setSelectedBlock(hitElement);

          window.setTimeout(() => {
            setLocoPickerOpen(true);
          }, 100);
          try {
            canvas.setPointerCapture(ev.pointerId);
          } catch {
            // ignore
          }

          return;
        }

        if (hitElement instanceof TrackSignalElementView) {
          if (signalAspectPopoverRef.current.opened) {
            reopenSignalAspectPopover(hitElement, ev.clientX, ev.clientY);
          } else {
            openSignalAspectPopover(hitElement, ev.clientX, ev.clientY);
          }

          try {
            canvas.setPointerCapture(ev.pointerId);
          } catch {
            // ignore
          }
          return;

        } else if (signalAspectPopoverRef.current.opened) {
          closeSignalAspectPopover();
          return;
        }

        // if (currentTool.mode === "cursor" && hitElement instanceof ClickableBaseElementView) {
        //   hitElement.mouseDown(ev as any);
        // }
        if (currentTool.mode === "cursor") {
          if (handleClickableDown(hitElement, ev)) {
            try {
              canvas.setPointerCapture(ev.pointerId);
            } catch {
              // ignore
            }

            return;
          }
        }
      }

      const points = Array.from(touchPointsRef.current.entries());

      if (points.length === 1) {
        pointerPanRef.current.activePointerId = ev.pointerId;
        pointerPanRef.current.isTouchPanning = true;

        panRef.current.isPanning = true;
        panRef.current.lastX = ev.clientX;
        panRef.current.lastY = ev.clientY;

        pinchRef.current.isPinching = false;
        pinchRef.current.pointer1Id = null;
        pinchRef.current.pointer2Id = null;

        canvas.style.cursor = "grabbing";
      } else if (points.length === 2) {
        const [p1, p2] = points!;

        if (!p1 || !p2) return;
        const pt1 = p1[1];
        const pt2 = p2[1];

        const midpoint = getMidpoint(pt1, pt2);
        const startDistance = getDistance(pt1, pt2);

        if (startDistance > 0) {
          pinchRef.current.isPinching = true;
          pinchRef.current.pointer1Id = p1[0];
          pinchRef.current.pointer2Id = p2[0];
          pinchRef.current.startDistance = startDistance;
          pinchRef.current.startScale = viewRef.current.scale;
          pinchRef.current.worldCenterX =
            (midpoint.x - viewRef.current.offsetX) / viewRef.current.scale;
          pinchRef.current.worldCenterY =
            (midpoint.y - viewRef.current.offsetY) / viewRef.current.scale;

          pointerPanRef.current.isTouchPanning = false;
          pointerPanRef.current.activePointerId = null;
          panRef.current.isPanning = false;
        }
      }

      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (ev.pointerType !== "touch") return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;

      touchPointsRef.current.set(ev.pointerId, { x: mouseX, y: mouseY });

      const currentLayout = layoutRef.current;
      const grid = screenToGrid(
        mouseX,
        mouseY,
        viewRef.current,
        currentLayout.gridSize
      );

      setMouseGrid((prev) =>
        prev.x === grid.x && prev.y === grid.y ? prev : { x: grid.x, y: grid.y }
      );

      if (pinchRef.current.isPinching) {
        const id1 = pinchRef.current.pointer1Id;
        const id2 = pinchRef.current.pointer2Id;

        if (id1 == null || id2 == null) return;

        const pt1 = touchPointsRef.current.get(id1);
        const pt2 = touchPointsRef.current.get(id2);

        if (!pt1 || !pt2) return;

        ev.preventDefault();

        const midpoint = getMidpoint(pt1, pt2);
        const distance = getDistance(pt1, pt2);

        if (pinchRef.current.startDistance > 0 && distance > 0) {
          const zoomFactor = distance / pinchRef.current.startDistance;
          const newScale = clamp(pinchRef.current.startScale * zoomFactor, 0.2, 4);

          viewRef.current.scale = newScale;
          viewRef.current.offsetX =
            midpoint.x - pinchRef.current.worldCenterX * newScale;
          viewRef.current.offsetY =
            midpoint.y - pinchRef.current.worldCenterY * newScale;

          persistView();
          invalidate();
        }

        return;
      }

      if (!pointerPanRef.current.isTouchPanning) return;
      if (pointerPanRef.current.activePointerId !== ev.pointerId) return;

      ev.preventDefault();

      const dx = ev.clientX - panRef.current.lastX;
      const dy = ev.clientY - panRef.current.lastY;

      panRef.current.lastX = ev.clientX;
      panRef.current.lastY = ev.clientY;

      viewRef.current.offsetX += dx;
      viewRef.current.offsetY += dy;

      persistView();
      invalidate();
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (ev.pointerType !== "touch") return;

      const rect = canvas.getBoundingClientRect();

      // if (!editModeRef.current) {
      //   const rect = canvas.getBoundingClientRect();
      //   const mouseX = ev.clientX - rect.left;
      //   const mouseY = ev.clientY - rect.top;

      //   const grid = screenToGrid(
      //     mouseX,
      //     mouseY,
      //     viewRef.current,
      //     layoutRef.current.gridSize
      //   );

      //   const hitElement = layoutRef.current.getElement(grid.x, grid.y);
      //   if (hitElement instanceof ClickableBaseElementView) {
      //     hitElement.mouseUp(ev as any);
      //   }
      // }
      if (!editModeRef.current) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = ev.clientX - rect.left;
        const mouseY = ev.clientY - rect.top;

        const grid = screenToGrid(
          mouseX,
          mouseY,
          viewRef.current,
          layoutRef.current.gridSize
        );

        const hitElement = layoutRef.current.getElement(grid.x, grid.y);
        handleClickableUp(hitElement, ev);
      }
      touchPointsRef.current.delete(ev.pointerId);

      const remaining = Array.from(touchPointsRef.current.entries());

      if (pinchRef.current.isPinching) {
        pinchRef.current.isPinching = false;
        pinchRef.current.pointer1Id = null;
        pinchRef.current.pointer2Id = null;

        if (remaining.length === 1) {
          const [id, pt] = remaining[0]!;

          pointerPanRef.current.activePointerId = id;
          pointerPanRef.current.isTouchPanning = true;
          panRef.current.isPanning = true;

          panRef.current.lastX = pt.x + rect.left;
          panRef.current.lastY = pt.y + rect.top;
        }
      } else if (pointerPanRef.current.activePointerId === ev.pointerId) {
        pointerPanRef.current.activePointerId = null;
        pointerPanRef.current.isTouchPanning = false;
        panRef.current.isPanning = false;
      }

      if (touchPointsRef.current.size === 0) {
        pointerPanRef.current.activePointerId = null;
        pointerPanRef.current.isTouchPanning = false;

        pinchRef.current.isPinching = false;
        pinchRef.current.pointer1Id = null;
        pinchRef.current.pointer2Id = null;

        stopInteraction();
      } else {
        persistView();
        invalidate();
      }

      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
    };

    const handlePointerCancel = (ev: PointerEvent) => {
      if (ev.pointerType !== "touch") return;

      touchPointsRef.current.delete(ev.pointerId);

      pointerPanRef.current.activePointerId = null;
      pointerPanRef.current.isTouchPanning = false;

      pinchRef.current.isPinching = false;
      pinchRef.current.pointer1Id = null;
      pinchRef.current.pointer2Id = null;

      stopInteraction();

      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
    };
    // #endregion

    return registerTrackCanvasEventListeners(
      canvas,
      {
        handleWheel,
        handleMouseDown,
        handleMouseLeave,
        handleContextMenu,
        handleMouseMove,
        handleMouseUp,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
      }
    );
    // }, [onLayoutChange, tool, onBeforeLayoutChange]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleTrackCanvasKeyDown(event, {
        canvasRef,
        layoutRef,
        toolRef,
        editModeRef,
        currentCursorRef,
        selectedElementRef,
        viewRef,
        setCurrentCursor,
        onBeforeLayoutChange,
        onLayoutChange,
        onSelectedElementChange,
        closeSignalAspectPopover,
        persistView,
        invalidate,
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);


  // =======================================================
  // popover
  // =======================================================
  const openSignalAspectPopover = (
    signal: TrackSignalElementView,
    clientX: number,
    clientY: number
  ) => {
    openTrackCanvasSignalAspectPopover(
      setSignalAspectPopover,
      signal,
      clientX,
      clientY
    );
  };

  const closeSignalAspectPopover = () => {
    closeTrackCanvasSignalAspectPopover(
      setSignalAspectPopover
    );
  };

  const handleLocoSelected = (locoId: string) => { };


  return (
    <>
      <canvas tabIndex={0} ref={canvasRef} className="track-canvas" />

      <TrackCanvasSignalAspectPopover
        state={signalAspectPopover}
        onClose={closeSignalAspectPopover}
      />

      <TrackCanvasBlockLocoPicker
        opened={locoPickerOpen}
        locos={locos}
        selectedBlock={selectedBlock}
        onClose={() => setLocoPickerOpen(false)}
      />
    </>
  );
}

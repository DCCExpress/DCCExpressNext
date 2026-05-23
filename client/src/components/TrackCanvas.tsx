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
  handleTrackCanvasKeyDown,
  getSelectionRect,
  loadSavedViewState,
  openTrackCanvasSignalAspectPopover,
  registerTrackCanvasEventListeners,
  reopenTrackCanvasSignalAspectPopover,
  saveViewState,
  screenToGrid,
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
      ev.preventDefault();

      if (signalAspectPopoverRef.current.opened) {
        closeSignalAspectPopover();
      }

      const rect = canvas.getBoundingClientRect();
      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;

      const zoomFactor = ev.deltaY < 0 ? 1.1 : 0.9;
      const oldScale = viewRef.current.scale;
      const newScale = clamp(oldScale * zoomFactor, 0.2, 4);

      if (newScale === oldScale) return;

      const worldX = (mouseX - viewRef.current.offsetX) / oldScale;
      const worldY = (mouseY - viewRef.current.offsetY) / oldScale;

      viewRef.current.scale = newScale;
      viewRef.current.offsetX = mouseX - worldX * newScale;
      viewRef.current.offsetY = mouseY - worldY * newScale;

      persistView();
      invalidate();
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
      const currentLayout = layoutRef.current;
      const currentTool = toolRef.current;
      const currentEditMode = editModeRef.current;
      const currentTurnoutSelection = turnoutSelectionModeRef.current;
      const currentElement = selectedElementRef.current;
      //if (ev.button !== 0 && ev.button !== 1) return;

      // Canvas mozgatása
      if (ev.button === 2) {
        ev.preventDefault();
        if (signalAspectPopoverRef.current.opened) {
          closeSignalAspectPopover();
        }

        panRef.current.isPanning = true;
        panRef.current.lastX = ev.clientX;
        panRef.current.lastY = ev.clientY;
        canvas.style.cursor = "grabbing";
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;

      const grid = screenToGrid(
        mouseX,
        mouseY,
        viewRef.current,
        currentLayout.gridSize
      );

      const hitElement = currentLayout.getElement(grid.x, grid.y);


      if (!editModeRef.current && hitElement?.type === ELEMENT_TYPES.BUTTON_AUDIO) {
        const audioButton = hitElement as AudioButtonElementView;
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
                const rb = currentElement as RouteButtonElementView;
                const closed = hitElement.turnoutClosed;
                rb.addOrUpdateTurnout(hitElement.id, closed);
                setRouteTurnoutsMarked(selectedElementRef.current as RouteButtonElementView);
                onInvalidate();
              }
            } else {
              alert("Nincs aktív RouteButton")
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
          if (signalAspectPopoverRef.current.opened) {
            reopenSignalAspectPopover(hitElement, ev.clientX, ev.clientY);
          } else {
            openSignalAspectPopover(hitElement, ev.clientX, ev.clientY);
          }

          return;
        }
      }
      if (signalAspectPopoverRef.current.opened) {
        closeSignalAspectPopover();
      }

      // A klikkelést lehet csak Control módban kellene engedélyezni!
      // if (toolRef.current.mode == "cursor" && hitElement && !editModeRef.current) {
      //   if (hitElement instanceof ClickableBaseElementView) {
      //     if (hitElement instanceof RouteButtonElementView) {
      //       const rb = hitElement as RouteButtonElementView;
      //       const elems = currentLayout.getAllElements();

      //       //setBusy?.(true, "Route is being set...");
      //       executeRoute(rb)

      //     } else {
      //       const elem = hitElement as ClickableBaseElementView
      //       elem.mouseDown(ev);
      //     }
      //   }
      // }
      if (toolRef.current.mode === "cursor" && !editModeRef.current) {
        if (handleClickableDown(hitElement, ev)) {
          return;
        }
      }

      if (!currentEditMode) return;

      if (currentTool.mode === "delete") {
        const elem = currentLayout.getElement(grid.x, grid.y);
        if (elem) {
          onBeforeLayoutChange?.();
          currentLayout.removeElement(elem);
          onLayoutChange((prev) => prev);
          invalidate();
        }
        return;
      }

      if (currentTool.mode === "draw") {
        const cursor = currentCursorRef.current;
        if (!cursor) return;

        const exists = currentLayout.getLayeredElement(cursor, grid.x, grid.y);
        if (exists) {
          showErrorMessage(
            t("common.error"),
            t("editor.messages.alreadyHasElement")
          );
          return;
        }

        onBeforeLayoutChange?.();

        const newElement = cursor.clone();
        newElement.id = generateId();
        newElement.x = grid.x;
        newElement.y = grid.y;
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

        onLayoutChange((prev) => prev);
        invalidate();
        return;
      }

      if (hitElement) {
        if (ev.ctrlKey) {
          hitElement.selected = !hitElement.selected;

          const allSelected = getAllLayoutElements(currentLayout).filter(
            (el) => el.selected
          );

          if (allSelected.length === 1) {
            onSelectedElementChange(allSelected[0]!);
          } else {
            onSelectedElementChange(null);
          }

          onLayoutChange((prev) => prev);
          invalidate();
          return;
        }

        const wasSelected = hitElement.selected;

        if (!wasSelected) {
          currentLayout.unselectAll();
          hitElement.selected = true;
          onSelectedElementChange(hitElement);
        }

        const dragged = getAllLayoutElements(currentLayout)
          .filter((el) => el.selected)
          .map((el) => ({
            id: el.id,
            startX: el.x,
            startY: el.y,
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
        if (!ev.ctrlKey) {
          currentLayout.unselectAll();
          onSelectedElementChange(null);
        }

        selectionRef.current.isSelecting = true;
        selectionRef.current.additive = ev.ctrlKey;
        selectionRef.current.startGridX = grid.x;
        selectionRef.current.startGridY = grid.y;
        selectionRef.current.endGridX = grid.x;
        selectionRef.current.endGridY = grid.y;
        canvas.style.cursor = "crosshair";
        invalidate();
        return;
      }

      if (!ev.ctrlKey) {
        currentLayout.unselectAll();
        onSelectedElementChange(null);
        onLayoutChange((prev) => prev);
        invalidate();
      }
    };

    const handleMouseMove = (ev: MouseEvent) => {

      const currentLayout = layoutRef.current;
      const currentTool = toolRef.current;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;

      const grid = screenToGrid(
        mouseX,
        mouseY,
        viewRef.current,
        currentLayout.gridSize
      );

      setMouseGrid((prev) =>
        prev.x === grid.x && prev.y === grid.y ? prev : { x: grid.x, y: grid.y }
      );

      const hoveredElement = currentLayout.getElement(grid.x, grid.y);


      if (toolRef.current.mode === "draw" && currentCursorRef.current) {

        const occupied = currentLayout.getLayeredElement(currentCursorRef.current, grid.x, grid.y);
        if (occupied != null) {

          setHoverGrid({ x: grid.x, y: grid.y });
        } else {
          setHoverGrid(null);
        }
        invalidate();
      }

      if (panRef.current.isPanning) {
        ev.preventDefault();

        const dx = ev.clientX - panRef.current.lastX;
        const dy = ev.clientY - panRef.current.lastY;

        panRef.current.lastX = ev.clientX;
        panRef.current.lastY = ev.clientY;

        viewRef.current.offsetX += dx;
        viewRef.current.offsetY += dy;

        persistView();
        invalidate();
        return;
      }

      if (selectionRef.current.isSelecting) {
        ev.preventDefault();

        selectionRef.current.endGridX = grid.x;
        selectionRef.current.endGridY = grid.y;

        canvas.style.cursor = "crosshair";
        invalidate();
        return;
      }

      if (dragRef.current.isDraggingElement && dragRef.current.elementId) {
        ev.preventDefault();

        const dx = grid.x - dragRef.current.startMouseGridX;
        const dy = grid.y - dragRef.current.startMouseGridY;

        const all = getAllLayoutElements(currentLayout);
        const selectedIds = new Set(
          dragRef.current.draggedElements.map((item) => item.id)
        );

        for (const item of dragRef.current.draggedElements) {
          const el = all.find((e) => e.id === item.id);
          if (!el) continue;

          const nextX = item.startX + dx;
          const nextY = item.startY + dy;

          const occupied = currentLayout.getLayeredElement(el, nextX, nextY);

          if (occupied && !selectedIds.has(occupied.id)) {
            // setHoverGrid((prev) =>
            //   prev?.x === nextX && prev?.y === nextY
            //     ? prev
            //     : { x: nextX, y: nextY }
            // );

            setHoverGrid({ x: grid.x, y: grid.y });
            canvas.style.cursor = "not-allowed";
            return;
          }
        }

        setHoverGrid(null);

        for (const item of dragRef.current.draggedElements) {
          const el = all.find((e) => e.id === item.id);
          if (!el) continue;

          el.x = item.startX + dx;
          el.y = item.startY + dy;
        }

        canvas.style.cursor = "move";
        invalidate();
        return;
      }

      if (!editModeRef.current) {
        if (hoveredElement instanceof TrackTurnoutLeftElementView ||
          hoveredElement instanceof TrackTurnoutRightElementView ||
          hoveredElement instanceof TrackTurnoutTwoWayElementView ||
          hoveredElement instanceof TrackTurnoutDoubleElementView ||
          hoveredElement instanceof TrackSignalElementView ||
          hoveredElement instanceof ClickableBaseElementView ||
          hoveredElement instanceof AudioButtonElementView ||
          hoveredElement instanceof BlockElementView

        ) {
          canvas.style.cursor = "pointer";
        } else {
          canvas.style.cursor = "default";
        }

      } else if (currentTool.mode === "draw") {
        canvas.style.cursor = "crosshair";
      } else {
        canvas.style.cursor = "default";
      }
    };
    const stopInteraction = () => {

      const wasDragging = dragRef.current.isDraggingElement;

      if (selectionRef.current.isSelecting) {
        const rect = getSelectionRect(selectionRef.current);

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

          onLayoutChange((prev) => prev);
        }

        selectionRef.current.isSelecting = false;
        selectionRef.current.additive = false;
      }

      if (panRef.current.isPanning) {
        persistView();
      }

      panRef.current.isPanning = false;

      if (wasDragging) {
        const currentLayout = layoutRef.current;
        const allElements = getAllLayoutElements(currentLayout);

        const elementActuallyMoved = dragRef.current.draggedElements.some((dragged) => {
          const current = allElements.find((el) => el.id === dragged.id);

          if (!current) {
            return false;
          }

          return (
            current.x !== dragged.startX ||
            current.y !== dragged.startY
          );
        });

        if (elementActuallyMoved) {
          onLayoutChange((prev) => prev);
        }
      }

      dragRef.current.isDraggingElement = false;
      dragRef.current.elementId = null;
      dragRef.current.draggedElements = [];
      canvas.style.cursor = "default";
      const cursor = currentCursorRef.current;
      if (cursor) {
        const occupied = layoutRef.current.getLayeredElement(cursor, cursor.x, cursor.y);
        if (occupied) {
          setHoverGrid({ x: cursor.x, y: cursor.y });
        }
      } else {
        setHoverGrid(null);
      }

      invalidate();
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

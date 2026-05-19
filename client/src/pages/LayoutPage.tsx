import { ActionIcon, AppShell, Box, Card, Group, Stack } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import LocoDialog from "../components/LocoDialog";
import PanelHandle from "../components/PanelHandle";
import TrackCanvas from "../components/TrackCanvas";
import LocoPanel from "../layout/LocoPanel";
import RightPropertyPanel from "../layout/PropertyPanel";
import StatusBar from "../layout/StatusBar";
import TopMenuBar from "../layout/TopMenuBar";

import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Loco } from "../../../common/src/types";
import { CommandCenter, loadCommandCenters } from "../api/commandCentersApi";
import CommandCenterDialog from "../components/CommandCenterDialog";
import ElementPickerDialog from "../components/editor/ElementPickerDialog";
import FullscreenLoader from "../components/FullscreenLoader";
import SettingDialog from "../components/SettingsDialog";
import { isTouchDevice, showErrorMessage, showOkMessage } from "../helpers";
import { useLayoutRuntimeWsBindings } from "../hooks/layout/useLayoutRuntimeWsBindings";
import { useLayoutPageBootstrap } from "../hooks/layout/useLayoutPageBootstrap";
import { BaseElement } from "../models/editor/core/BaseElement";
import { Layout } from "../models/editor/core/Layout";
import { ExtendedRouteButtonElement } from "../models/editor/elements/ExtendedRouteButtonElement";
import { type EditorTool } from "../models/editor/types/EditorTypes";
import { layoutStore } from "../services/layoutStore";
import { routeGraphStore } from "../services/routeGraphStore";
import { wsApi } from "../services/wsApi";
import { wsClient } from "../services/wsClient";


type LayoutPageProps = {
  onGoHome: () => void;
};

const HEADER_HEIGHT = 50;
const FOOTER_HEIGHT = 40;
const LOCO_PANEL_WIDTH = 380;
const PROPERTY_PANEL_WIDTH = 320;
const EDIT_MODE_KEY = "dcc-express.editor.editMode";
const LOCOPANEL_COLLAPSED = "dcc-express.editor.locoPanelCollapsed";
const PROPERTYPANEL_COLLAPSED = "dcc-express.editor.propertyPanelCollapsed";
const MAX_HISTORY = 100;

export default function LayoutPage({ onGoHome }: LayoutPageProps) {
  const [toolbarOpened, setToolbarOpened] = useState(true);
  const [locoDialogOpened, setLocoDialogOpened] = useState(false);
  const [locos, setLocos] = useState<Loco[]>([]);
  const [tool, setTool] = useState<EditorTool>({ mode: "cursor", elementType: "general" });
  const [pickerOpened, setPickerOpened] = useState(false);
  const [layout, setLayout] = useState<Layout>(new Layout());
  const [selectedElement, setSelectedElement] = useState<BaseElement | null>(null);
  const [invalidateCounter, setInvalidateCounter] = useState(0);
  const [fitCounter] = useState(0);

  const [commandCenterOpened, setCommandCenterOpened] = useState(false);
  const [commandCenter, setCommandCenter] = useState<CommandCenter>(new CommandCenter());
  const [commandCenterAlive, setCommandCenterAlive] = useState(false);
  const [commandCenterPower, setCommandCenterPower] = useState(false);

  const [routesString, setRoutesString] = useState<string>("");

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const layoutRef = useRef(layout);
  const locosRef = useRef(locos);
  const layoutLoadedRef = useRef(false);

  const [turnoutSelection, setTurnoutSelection] = useState<boolean>(false);
  const [canvasBusy, setCanvasBusy] = useState(false);
  const [canvasBusyText, setCanvasBusyText] = useState("Loading...");

  const [editMode, setEditMode] = useState<boolean>(() => {
    try {
      if (isTouchDevice()) return false;
      const raw = localStorage.getItem(EDIT_MODE_KEY);
      return raw === "true";
    } catch {
      return false;
    }
  });

  const [locoPanelCollapsed, setLocoPanelCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(LOCOPANEL_COLLAPSED);
      return raw === "true";
    } catch {
      return false;
    }
  });

  const [propertyPanelCollapsed, setPropertyPanelCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(PROPERTYPANEL_COLLAPSED);
      return raw === "true";
    } catch {
      return false;
    }
  });

  const [settingsDialogOpened, setSettingsDialogOpened] = useState(false);

  useEffect(() => {
    const unsubscribe = layoutStore.subscribe(() => {
      setInvalidateCounter((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    layoutRef.current = layout;
    layoutStore.setLayout(layout);
  }, [layout]);

  useEffect(() => {
    locosRef.current = locos;
  }, [locos]);

  useEffect(() => {
    try {
      localStorage.setItem(EDIT_MODE_KEY, String(editMode));
    } catch {
      // ignore
    }
  }, [editMode]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCOPANEL_COLLAPSED, String(locoPanelCollapsed));
    } catch {
      // ignore
    }
  }, [locoPanelCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(PROPERTYPANEL_COLLAPSED, String(propertyPanelCollapsed));
    } catch {
      // ignore
    }
  }, [propertyPanelCollapsed]);

  useEffect(() => {
    const previousEditMode = previousEditModeRef.current;

    previousEditModeRef.current = editMode;

    if (!editMode) {
      setTool({ mode: "cursor", elementType: "general" });
      setPickerOpened(false);
      setTurnoutSelection(false);

      /**
       * Csak valódi editMode true -> false váltáskor frissítünk.
       * Első rendernél / layout betöltés előtt NEM.
       */
      if (
        previousEditMode === true &&
        layoutLoadedRef.current
      ) {
        void refreshServerRuntimeLayout();
      }

      return;
    }

    // Szerkesztő módba lépve a korábbi gráf/debug állapot már elavulhat
    routeGraphStore.clear();
    layoutRef.current.resetRoutes();
    setInvalidateCounter((prev) => prev + 1);
  }, [editMode]);

  // useEffect(() => {
  //   if (editMode) {
  //     return;
  //   }

  //   const existingGraph = routeGraphStore.getGraph();

  //   layoutRef.current.checkRoutes(existingGraph);

  //   setInvalidateCounter((prev) => prev + 1);
  // }, [editMode]);

  const previousEditModeRef = useRef(editMode);

  const {
    loadLocos,
    loadLayoutFromServer,
    saveLayoutToServer,
    refreshServerRuntimeLayout,
  } = useLayoutPageBootstrap({
    layoutRef,
    layoutLoadedRef,
    setLayout,
    setLocos,
    setCommandCenter,
    setUndoStack,
    setRedoStack,
    setInvalidateCounter,
  });

  const createLayoutSnapshot = useCallback((source: Layout): string => {
    return JSON.stringify(source);
  }, []);

  const pushHistorySnapshot = useCallback(() => {
    const snapshot = createLayoutSnapshot(layoutRef.current);

    setUndoStack((prev) => {
      const last = prev[prev.length - 1];
      if (last === snapshot) {
        return prev;
      }

      const next = [...prev, snapshot];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });

    setRedoStack([]);
  }, [createLayoutSnapshot]);

  const undo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) {
        return prevUndo;
      }

      const currentSnapshot = createLayoutSnapshot(layoutRef.current);
      const previousSnapshot = prevUndo[prevUndo.length - 1];
      const restoredLayout = Layout.fromJSON(JSON.parse(previousSnapshot!));

      setRedoStack((prevRedo) => {
        const next = [...prevRedo, currentSnapshot];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });

      setLayout(restoredLayout);
      routeGraphStore.clear();

      return prevUndo.slice(0, -1);
    });
  }, [createLayoutSnapshot]);

  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) {
        return prevRedo;
      }

      const currentSnapshot = createLayoutSnapshot(layoutRef.current);
      const nextSnapshot = prevRedo[prevRedo.length - 1];
      const restoredLayout = Layout.fromJSON(JSON.parse(nextSnapshot!));

      setUndoStack((prevUndo) => {
        const next = [...prevUndo, currentSnapshot];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });

      setLayout(restoredLayout);
      routeGraphStore.clear();
      return prevRedo.slice(0, -1);
    });
  }, [createLayoutSnapshot]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {

      const isCtrl = ev.ctrlKey || ev.metaKey;
      if (isCtrl && ev.key.toLowerCase() === "s") {
        ev.preventDefault();
        saveLayoutToServer();
        //void saveCommandCentersToServer();
      }
      const target = ev.target as HTMLElement | null;
      const tagName = target?.tagName;

      const isTypingField =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable === true;

      if (isTypingField) {
        return;
      }

      if (ev.key === "Escape") {
        setTool({ mode: "cursor", elementType: "general" });
        return;
      }

      if (ev.key.toLowerCase() === "e" && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        ev.preventDefault();
        setEditMode((prev) => !prev);
        return;
      }




    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandCenter]);

  useEffect(() => {
    const onHistoryKeys = (ev: KeyboardEvent) => {
      const key = ev.key.toLowerCase();

      if (ev.ctrlKey && !ev.shiftKey && key === "z") {
        ev.preventDefault();
        undo();
        return;
      }

      if ((ev.ctrlKey && key === "y") || (ev.ctrlKey && ev.shiftKey && key === "z")) {
        ev.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onHistoryKeys);
    return () => window.removeEventListener("keydown", onHistoryKeys);
  }, [undo, redo]);


  useEffect(() => {
    const unsubscribe = routeGraphStore.subscribe(() => {
      layoutRef.current.applyRouteGraphRuntime(
        routeGraphStore.getTrackRuntime()
      );

      setInvalidateCounter((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useLayoutRuntimeWsBindings({
    layoutRef,
    locosRef,
    setInvalidateCounter,
    setCommandCenterAlive,
    setCommandCenterPower,
  });

  const selectedElementChanged = (e: BaseElement | null) => {
    setSelectedElement(e);
  };

  // const handleUpdateSelectedElement = (_updated: BaseElement | null) => {
  //   routeGraphStore.clear();
  //   setInvalidateCounter((prev) => prev + 1);
  // };

  const handleUpdateSelectedElement = (updated: BaseElement | null) => {
    // Az ExtendedRouteButton beállításai
    // nem módosítják a pálya topológiáját,
    // ezért nem töröljük a route graphot.
    if (!(updated instanceof ExtendedRouteButtonElement)) {
      routeGraphStore.clear();
    }

    setInvalidateCounter((prev) => prev + 1);
  };
  const handleSettingClick = () => {
    setSettingsDialogOpened(true);
  };

  const onFitLayout = () => {
    const canvas = document.querySelector(".track-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    canvas.focus();

    const event = new KeyboardEvent("keydown", {
      key: "f",
      bubbles: true,
    });

    window.dispatchEvent(event);
  };

  const handleCommandCenterSaved = (cc: CommandCenter) => {
    //loadCommandCentersFromServer();
    setCommandCenter(cc)
  };

  // const handleRunRouteProcess = () => {
  //   const graph = layoutRef.current.processRoutes();
  //   setInvalidateCounter((v) => v + 1);
  //   return graph;
  // };


  const handleLayoutChange: React.Dispatch<React.SetStateAction<Layout>> = (
    value
  ) => {
    routeGraphStore.clear();
    setLayout(value);
  };

  return (
    <>
      <FullscreenLoader visible={canvasBusy} text={canvasBusyText} />
      <CommandCenterDialog
        opened={commandCenterOpened}
        onClose={() => setCommandCenterOpened(false)}
        onSave={handleCommandCenterSaved}
        commandCenter={commandCenter}
      />

      <LocoDialog
        opened={locoDialogOpened}
        onClose={() => setLocoDialogOpened(false)}
        onSaved={async () => {
          await loadLocos();
        }}
      />

      <ElementPickerDialog
        opened={pickerOpened}
        onClose={() => setPickerOpened(false)}
        onPick={(elementType) => {
          setTool({ mode: "draw", elementType });
        }}
      />

      <SettingDialog
        opened={settingsDialogOpened}
        onClose={() => setSettingsDialogOpened(false)}
      />

      <AppShell
        header={{ height: toolbarOpened ? HEADER_HEIGHT : 0 }}
        footer={{ height: FOOTER_HEIGHT }}
        padding="xs"
      >
        <ActionIcon
          variant="filled"
          size="md"
          radius="xl"
          color="blue"
          onClick={() => setToolbarOpened((v) => !v)}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={toolbarOpened ? "Hide toolbar" : "Show toolbar"}
          style={{
            position: "fixed",
            top: 12,
            left: 8,
            zIndex: 5000,
            boxShadow: "var(--mantine-shadow-md)",
          }}
        >
          {toolbarOpened ? (
            <IconChevronUp size={16} />
          ) : (
            <IconChevronDown size={16} />
          )}
        </ActionIcon>

        <AppShell.Header>
          {true && (
            <Box
              pl={0}
              h="100%"
              style={{
                opacity: toolbarOpened ? 1 : 0,
                pointerEvents: toolbarOpened ? "auto" : "none",
                overflow: "hidden",
                transition: "opacity 120ms ease",
              }}
            >
              <TopMenuBar
                editMode={editMode}
                onEditModeChange={setEditMode}
                onGoHome={onGoHome}
                onOpenLocos={() => setLocoDialogOpened(true)}
                locoPanelCollapsed={locoPanelCollapsed}
                onToggleLocoPanel={() => setLocoPanelCollapsed((v) => !v)}
                propertyPanelCollapsed={propertyPanelCollapsed}
                onTogglePropertyPanel={() => setPropertyPanelCollapsed((v) => !v)}
                tool={tool}
                onCursorToolClick={() =>
                  setTool({ mode: "cursor", elementType: tool.elementType })
                }
                onOpenElementPicker={() => setPickerOpened(true)}
                onSaveLayout={saveLayoutToServer}
                onLoadLayout={loadLayoutFromServer}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                onSettingsClick={handleSettingClick}
                onDeleteToolClick={() =>
                  setTool({ mode: "delete", elementType: tool.elementType })
                }
                onFitLayout={onFitLayout}
                onOpenCommandCenterDialog={() => setCommandCenterOpened(true)}
              />
            </Box>
          )}
        </AppShell.Header>
        <AppShell.Main>
          {/* <Stack gap="xs" h="calc(100vh - 60px - 34px - 20px)"> */}
          <Stack
            gap="xs"
            h={`calc(100vh - ${toolbarOpened ? HEADER_HEIGHT : 0
              }px - ${FOOTER_HEIGHT}px - 20px)`}
          >
            <Group
              gap="xs"
              wrap="nowrap"
              align="stretch"
              style={{ flex: 1, minHeight: 0 }}
            >
              <Box
                style={{
                  width: locoPanelCollapsed ? 0 : LOCO_PANEL_WIDTH,
                  transition: "width 0.2s ease",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {/* {!locoPanelCollapsed && <LocoPanel locos={locos} />} */}
                <LocoPanel locos={locos} />
              </Box>

              <Box
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: "relative",
                }}
                h="100%"
              >
                <PanelHandle
                  side="left"
                  collapsed={locoPanelCollapsed}
                  onToggle={() => setLocoPanelCollapsed((v) => !v)}
                  style={{ left: 1 }}
                />

                <PanelHandle
                  side="right"
                  collapsed={propertyPanelCollapsed}
                  onToggle={() => setPropertyPanelCollapsed((v) => !v)}
                  style={{ right: 1 }}
                />

                <Card withBorder radius="sm" p="xs" h="100%">
                  <Box
                    h="100%"
                    style={{
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px solid var(--mantine-color-dark-4)",
                    }}
                  >
                    <TrackCanvas
                      editMode={editMode}
                      tool={tool}
                      layout={layout}

                      onLayoutChange={handleLayoutChange}
                      onBeforeLayoutChange={pushHistorySnapshot}
                      selectedElement={selectedElement}
                      onSelectedElementChange={selectedElementChanged}
                      invalidateCounter={invalidateCounter}
                      onInvalidate={() => setInvalidateCounter((v) => v + 1)}
                      fitCounter={fitCounter}
                      turnoutSelectionMode={turnoutSelection}
                      setBusy={(busy, text) => { setCanvasBusy(busy); if (text) setCanvasBusyText(text); }}
                      locos={locos}
                    />
                  </Box>
                </Card>
              </Box>

              <Box
                style={{
                  width: propertyPanelCollapsed ? 0 : PROPERTY_PANEL_WIDTH,
                  transition: "width 0.2s ease",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {!propertyPanelCollapsed && (
                  <Card withBorder radius="xs" p="xs" h="100%">
                    <RightPropertyPanel
                      selectedElement={selectedElement}
                      invalidate={invalidateCounter}
                      onUpdateSelectedElement={handleUpdateSelectedElement}
                      editMode={editMode}
                      opened={!propertyPanelCollapsed}
                      turnoutSelectionMode={turnoutSelection}
                      setTurnoutSelectionMode={setTurnoutSelection}
                      layout={layout}
                      onLayoutChange={setLayout}
                      routes={routesString}

                      //setBusy={setBusy}
                      setBusy={(busy, text) => { setCanvasBusy(busy); if (text) setCanvasBusyText(text); }}
                    />
                  </Card>
                )}
              </Box>
            </Group>
          </Stack>
        </AppShell.Main>

        <AppShell.Footer>
          <StatusBar />
        </AppShell.Footer>
      </AppShell>
    </>
  );
}
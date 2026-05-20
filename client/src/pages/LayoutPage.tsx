import { useEffect, useRef, useState } from "react";

import { Loco } from "../../../common/src/types";
import { CommandCenter } from "../api/commandCentersApi";
import { useLayoutHistory } from "../hooks/layout/useLayoutHistory";
import { useLayoutPageUiState } from "../hooks/layout/useLayoutPageUiState";
import { useLayoutEditModeRuntime } from "../hooks/layout/useLayoutEditModeRuntime";
import { useLayoutPageShortcuts } from "../hooks/layout/useLayoutPageShortcuts";
import { useLayoutRouteGraphBinding } from "../hooks/layout/useLayoutRouteGraphBinding";
import { useLayoutPageBootstrap } from "../hooks/layout/useLayoutPageBootstrap";
import { useLayoutRuntimeWsBindings } from "../hooks/layout/useLayoutRuntimeWsBindings";
import LayoutPageView from "./layout/LayoutPageView";
import { BaseElementView } from "../models/editor/core/BaseElementView";
import { LayoutView } from "../models/editor/core/LayoutView";
import { ExtendedRouteButtonElementView } from "../models/editor/elements/ExtendedRouteButtonElementView";
import { type EditorTool } from "../models/editor/types/EditorTypes";
import { layoutStore } from "../services/layoutStore";
import { routeGraphStore } from "../services/routeGraphStore";
import { useTranslation } from "react-i18next";

type LayoutPageProps = {
  onGoHome: () => void;
};

export default function LayoutPage({
  onGoHome,
}: LayoutPageProps) {
  const { t } = useTranslation();
  const [toolbarOpened, setToolbarOpened] =
    useState(true);

  const [locoDialogOpened, setLocoDialogOpened] =
    useState(false);

  const [locos, setLocos] =
    useState<Loco[]>([]);

  const [tool, setTool] =
    useState<EditorTool>({
      mode: "cursor",
      elementType: "general",
    });

  const [pickerOpened, setPickerOpened] =
    useState(false);

  const [layout, setLayout] =
    useState<LayoutView>(new LayoutView());

  const [
    selectedElement,
    setSelectedElement,
  ] =
    useState<BaseElementView | null>(null);

  const [
    invalidateCounter,
    setInvalidateCounter,
  ] =
    useState(0);

  const [
    fitCounter,
    setFitCounter,
  ] =
    useState(0);

  const [
    commandCenterOpened,
    setCommandCenterOpened,
  ] =
    useState(false);

  const [
    commandCenter,
    setCommandCenter,
  ] =
    useState<CommandCenter>(
      new CommandCenter()
    );

  const [routesString] =
    useState<string>("");

  const layoutRef =
    useRef(layout);

  const locosRef =
    useRef(locos);

  const layoutLoadedRef =
    useRef(false);

  const [
    turnoutSelection,
    setTurnoutSelection,
  ] =
    useState<boolean>(false);

  const [canvasBusy, setCanvasBusy] =
    useState(false);

  const [
    canvasBusyText,
    setCanvasBusyText,
  ] =
    useState(t("common.loading"));

  const {
    editMode,
    setEditMode,
    locoPanelCollapsed,
    setLocoPanelCollapsed,
    propertyPanelCollapsed,
    setPropertyPanelCollapsed,
  } = useLayoutPageUiState();

  const [
    settingsDialogOpened,
    setSettingsDialogOpened,
  ] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      layoutStore.subscribe(() => {
        setInvalidateCounter(
          previous => previous + 1
        );
      });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    layoutRef.current =
      layout;

    layoutStore.setLayout(layout);
  }, [layout]);

  useEffect(() => {
    locosRef.current =
      locos;
  }, [locos]);

  const {
    setUndoStack,
    setRedoStack,
    canUndo,
    canRedo,
    pushHistorySnapshot,
    undo,
    redo,
  } = useLayoutHistory({
    layoutRef,
    setLayout,
  });

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

  useLayoutEditModeRuntime({
    editMode,
    layoutRef,
    layoutLoadedRef,
    refreshServerRuntimeLayout,
    setTool,
    setPickerOpened,
    setTurnoutSelection,
    setInvalidateCounter,
  });

  useLayoutPageShortcuts({
    saveLayoutToServer,
    setTool,
    setEditMode,
  });

  useLayoutRouteGraphBinding({
    layoutRef,
    setInvalidateCounter,
  });

  useLayoutRuntimeWsBindings({
    layoutRef,
    locosRef,
    setInvalidateCounter,
  });

  const handleUpdateSelectedElement = (
    updated: BaseElementView | null
  ): void => {
    /**
     * Az ExtendedRouteButton beállításai
     * nem módosítják a pálya topológiáját,
     * ezért nem töröljük a route graphot.
     */
    if (
      !(updated instanceof ExtendedRouteButtonElementView)
    ) {
      routeGraphStore.clear();
    }

    setInvalidateCounter(
      previous => previous + 1
    );
  };

  const onFitLayout = (): void => {
    setFitCounter(previous => previous + 1);
  };

  const handleCommandCenterSaved = (
    nextCommandCenter: CommandCenter
  ): void => {
    setCommandCenter(
      nextCommandCenter
    );
  };

  const handleLayoutChange:
    React.Dispatch<
      React.SetStateAction<LayoutView>
    > =
    value => {
      routeGraphStore.clear();
      setLayout(value);
    };

  return (
    <LayoutPageView
      onGoHome={onGoHome}
      toolbarOpened={toolbarOpened}
      setToolbarOpened={setToolbarOpened}
      canvasBusy={canvasBusy}
      canvasBusyText={canvasBusyText}
      setCanvasBusy={setCanvasBusy}
      setCanvasBusyText={setCanvasBusyText}
      commandCenterOpened={commandCenterOpened}
      setCommandCenterOpened={
        setCommandCenterOpened
      }
      commandCenter={commandCenter}
      onCommandCenterSaved={
        handleCommandCenterSaved
      }
      locoDialogOpened={locoDialogOpened}
      setLocoDialogOpened={
        setLocoDialogOpened
      }
      onLocosSaved={loadLocos}
      pickerOpened={pickerOpened}
      setPickerOpened={setPickerOpened}
      settingsDialogOpened={
        settingsDialogOpened
      }
      setSettingsDialogOpened={
        setSettingsDialogOpened
      }
      editMode={editMode}
      setEditMode={setEditMode}
      locoPanelCollapsed={
        locoPanelCollapsed
      }
      setLocoPanelCollapsed={
        setLocoPanelCollapsed
      }
      propertyPanelCollapsed={
        propertyPanelCollapsed
      }
      setPropertyPanelCollapsed={
        setPropertyPanelCollapsed
      }
      tool={tool}
      setTool={setTool}
      saveLayoutToServer={
        saveLayoutToServer
      }
      loadLayoutFromServer={
        loadLayoutFromServer
      }
      canUndo={canUndo}
      canRedo={canRedo}
      undo={undo}
      redo={redo}
      onSettingsClick={() =>
        setSettingsDialogOpened(true)
      }
      onFitLayout={onFitLayout}
      locos={locos}
      layout={layout}
      onLayoutChange={
        handleLayoutChange
      }
      onBeforeLayoutChange={
        pushHistorySnapshot
      }
      selectedElement={
        selectedElement
      }
      onSelectedElementChange={
        setSelectedElement
      }
      invalidateCounter={
        invalidateCounter
      }
      setInvalidateCounter={
        setInvalidateCounter
      }
      fitCounter={fitCounter}
      turnoutSelection={
        turnoutSelection
      }
      setTurnoutSelection={
        setTurnoutSelection
      }
      onUpdateSelectedElement={
        handleUpdateSelectedElement
      }
      routesString={routesString}
    />
  );
}

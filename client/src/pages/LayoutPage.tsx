import { useEffect, useRef, useState } from "react";

import { Loco } from "../../../common/src/types";
import { useLayoutHistory } from "../hooks/layout/useLayoutHistory";
import { useLayoutPageUiState } from "../hooks/layout/useLayoutPageUiState";
import { useLayoutEditModeRuntime } from "../hooks/layout/useLayoutEditModeRuntime";
import { useLayoutPageShortcuts } from "../hooks/layout/useLayoutPageShortcuts";
import { useLayoutRouteGraphBinding } from "../hooks/layout/useLayoutRouteGraphBinding";
import { useLayoutPageBootstrap } from "../hooks/layout/useLayoutPageBootstrap";
import { useLayoutRuntimeWsBindings } from "../hooks/layout/useLayoutRuntimeWsBindings";
import { useLevelCrossingBlinkTask } from "../hooks/layout/useLevelCrossingBlinkTask";
import LayoutPageView from "./layout/LayoutPageView";
import { BaseElementView } from "../models/editor/core/BaseElementView";
import { LayoutView } from "../models/editor/core/LayoutView";
import { ExtendedRouteButtonElementView } from "../models/editor/elements/ExtendedRouteButtonElementView";
import { TrackSignalElementView } from "../models/editor/elements/TrackSignalElementView";
import { type EditorTool } from "../models/editor/types/EditorTypes";
import { layoutStore } from "../services/layoutStore";
import { routeGraphStore } from "../services/routeGraphStore";
import { useTranslation } from "react-i18next";
import { wsClient } from "../services/wsClient";
import { wsApi } from "../services/wsApi";
import { loadSignalLogicRulesWs, saveSignalLogicRulesWs } from "../api/signalLogicWsApi";
import { generateId, showErrorMessage } from "../helpers";

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

  const [
    blockActionsDialogOpened,
    setBlockActionsDialogOpened,
  ] = useState(false);

  const [
    requestedBlockActionsBlockId,
    setRequestedBlockActionsBlockId,
  ] = useState<string | null>(null);

  const [
    signalLogicDialogOpened,
    setSignalLogicDialogOpened,
  ] = useState(false);

  const [
    requestedSignalLogicAddress,
    setRequestedSignalLogicAddress,
  ] = useState<number | null>(null);

  const [
    levelCrossingLogicDialogOpened,
    setLevelCrossingLogicDialogOpened,
  ] = useState(false);

  const [
    requestedLevelCrossingElementId,
    setRequestedLevelCrossingElementId,
  ] = useState<string | null>(null);

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
    rightPanelMode,
    setRightPanelMode,
  } = useLayoutPageUiState();

  const [
    appSettingsDialogOpened,
    setAppSettingsDialogOpened,
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
    locosRef.current = locos;
    if (layoutLoadedRef.current && wsClient.isConnected()) {
      wsApi.getBlocks();
    }
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

  useLevelCrossingBlinkTask({
    editMode,
    layout,
    layoutRef,
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
    if (
      !(updated instanceof ExtendedRouteButtonElementView)
    ) {
      routeGraphStore.clear();
    }

    setInvalidateCounter(
      previous => previous + 1
    );
  };

  const openBlockActionsDialogForBlock = (blockId: string): void => {
    setRequestedBlockActionsBlockId(blockId);
    setBlockActionsDialogOpened(true);
  };

  const openLevelCrossingLogicDialogForElement = (elementId: string): void => {
    setRequestedLevelCrossingElementId(elementId);
    setLevelCrossingLogicDialogOpened(true);
  };

  const prepareSignalLogicRuleGroup = async (
    signalAddress: number
  ): Promise<void> => {
    const result = await loadSignalLogicRulesWs();
    const groups = [...result.document.groups];
    const existingIndex = groups.findIndex(
      group => group.signalAddress === signalAddress
    );

    if (existingIndex >= 0) {
      const existingGroup = groups.splice(existingIndex, 1)[0];

      if (!existingGroup) return;

      groups.unshift(existingGroup);

      if (existingIndex > 0) {
        await saveSignalLogicRulesWs({
          ...result.document,
          groups,
        });
      }

      return;
    }

    const signal = layoutRef.current
      .getAllElements()
      .find((element): element is TrackSignalElementView =>
        element instanceof TrackSignalElementView &&
        element.address === signalAddress
      );

    if (!signal) {
      return;
    }

    const group = {
      id: generateId(),
      signalAddress,
      defaultAspect: "red" as const,
      rules: [{
        id: generateId(),
        aspect: "green" as const,
        conditions: [],
      }],
    };

    await saveSignalLogicRulesWs({
      ...result.document,
      groups: [group, ...groups],
    });
  };

  const openSignalLogicDialogForSignal = async (signalAddress: number): Promise<void> => {
    setRequestedSignalLogicAddress(signalAddress);

    try {
      await prepareSignalLogicRuleGroup(signalAddress);
    } catch (error) {
      showErrorMessage(
        t("common.error"),
        error instanceof Error
          ? error.message
          : String(error)
      );
    } finally {
      setSignalLogicDialogOpened(true);
    }
  };

  const onFitLayout = (): void => {
    setFitCounter(previous => previous + 1);
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
      locoDialogOpened={locoDialogOpened}
      setLocoDialogOpened={
        setLocoDialogOpened
      }
      blockActionsDialogOpened={
        blockActionsDialogOpened
      }
      setBlockActionsDialogOpened={
        setBlockActionsDialogOpened
      }
      requestedBlockActionsBlockId={
        requestedBlockActionsBlockId
      }
      onRequestedBlockActionsBlockIdConsumed={() =>
        setRequestedBlockActionsBlockId(null)
      }
      onOpenBlockActionsForBlock={
        openBlockActionsDialogForBlock
      }
      signalLogicDialogOpened={
        signalLogicDialogOpened
      }
      setSignalLogicDialogOpened={
        setSignalLogicDialogOpened
      }
      requestedSignalLogicAddress={
        requestedSignalLogicAddress
      }
      onRequestedSignalLogicAddressConsumed={() =>
        setRequestedSignalLogicAddress(null)
      }
      onOpenSignalLogicForSignal={
        openSignalLogicDialogForSignal
      }
      levelCrossingLogicDialogOpened={
        levelCrossingLogicDialogOpened
      }
      setLevelCrossingLogicDialogOpened={
        setLevelCrossingLogicDialogOpened
      }
      requestedLevelCrossingElementId={
        requestedLevelCrossingElementId
      }
      onRequestedLevelCrossingElementIdConsumed={() =>
        setRequestedLevelCrossingElementId(null)
      }
      onOpenLevelCrossingLogicForElement={
        openLevelCrossingLogicDialogForElement
      }
      onLocosSaved={loadLocos}
      pickerOpened={pickerOpened}
      setPickerOpened={setPickerOpened}
      appSettingsDialogOpened={
        appSettingsDialogOpened
      }
      setAppSettingsDialogOpened={
        setAppSettingsDialogOpened
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
      rightPanelMode={rightPanelMode}
      setRightPanelMode={setRightPanelMode}
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
      onOpenAppSettingsDialog={() =>
        setAppSettingsDialogOpened(true)
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
      turnoutSelection={turnoutSelection}
      setTurnoutSelection={setTurnoutSelection}
      onUpdateSelectedElement={
        handleUpdateSelectedElement
      }
      routesString={routesString}
    />
  );
}

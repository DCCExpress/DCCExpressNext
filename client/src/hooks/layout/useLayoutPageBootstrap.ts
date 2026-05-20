// client/src/hooks/layout/useLayoutPageBootstrap.ts

import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import {
  getLayout,
  getLocos,
  refreshLayoutRuntime,
  saveLayout,
} from "../../api/http";

import {
  CommandCenter,
  loadCommandCenters,
} from "../../api/commandCentersApi";

import {
  showErrorMessage,
  showOkMessage,
} from "../../helpers";

import {
  wsApi,
} from "../../services/wsApi";

import {
  wsClient,
} from "../../services/wsClient";

import {
  layoutStore,
} from "../../services/layoutStore";

import {
  routeGraphStore,
} from "../../services/routeGraphStore";

import {
  scriptEngine,
} from "../../services/scriptEngine";

import {
  locoStore,
} from "../../services/locoStore";

import {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import type {
  Loco,
} from "../../../../common/src/types";

type StringStackSetter =
  Dispatch<SetStateAction<string[]>>;

type NumberSetter =
  Dispatch<SetStateAction<number>>;

type LayoutSetter =
  Dispatch<SetStateAction<LayoutView>>;

type LocoSetter =
  Dispatch<SetStateAction<Loco[]>>;

type CommandCenterSetter =
  Dispatch<SetStateAction<CommandCenter>>;

export type UseLayoutPageBootstrapParams = {
  layoutRef: MutableRefObject<LayoutView>;
  layoutLoadedRef: MutableRefObject<boolean>;
  setLayout: LayoutSetter;
  setLocos: LocoSetter;
  setCommandCenter: CommandCenterSetter;
  setUndoStack: StringStackSetter;
  setRedoStack: StringStackSetter;
  setInvalidateCounter: NumberSetter;
};

export type UseLayoutPageBootstrapResult = {
  loadLocos: () => Promise<void>;
  loadLayoutFromServer: () => Promise<void>;
  saveLayoutToServer: () => Promise<void>;
  refreshServerRuntimeLayout: () => Promise<void>;
};

export function useLayoutPageBootstrap({
  layoutRef,
  layoutLoadedRef,
  setLayout,
  setLocos,
  setCommandCenter,
  setUndoStack,
  setRedoStack,
  setInvalidateCounter,
}: UseLayoutPageBootstrapParams): UseLayoutPageBootstrapResult {
  const loadLocos = useCallback(async (): Promise<void> => {
    try {
      const data =
        await getLocos();

      setLocos(data);
      locoStore.setLocos(data);
    } catch (error) {
      console.error(
        "Nem sikerült betölteni a mozdonyokat:",
        error
      );

      showErrorMessage(
        "Error",
        "Failed to load locomotives: " + error
      );

      setLocos([]);
    }
  }, [setLocos]);

  const requestInitialRuntimeSync = useCallback((): void => {
    if (!layoutLoadedRef.current) {
      return;
    }

    if (!wsClient.isConnected()) {
      return;
    }

    wsApi.getBlocks();
    wsApi.getRouteReservations();
  }, [layoutLoadedRef]);

  const loadLayoutFromServer = useCallback(async (): Promise<void> => {
    try {
      const loaded =
        await getLayout();

      const nextLayout =
        LayoutView.fromJSON(loaded);

      setLayout(nextLayout);
      layoutStore.setLayout(nextLayout);
      routeGraphStore.clear();

      try {
        const graph =
          await routeGraphStore.ensureLoaded();

        nextLayout.applyRouteGraphRuntime(
          routeGraphStore.getTrackRuntime()
        );

        nextLayout.checkRoutes(graph);

        setInvalidateCounter(prev => prev + 1);
      } catch (error) {
        console.warn(
          "[RouteGraph] Could not preload graph after layout load:",
          error
        );
      }

      setUndoStack([]);
      setRedoStack([]);

      layoutLoadedRef.current = true;
      requestInitialRuntimeSync();
    } catch (error) {
      console.error(error);

      showErrorMessage(
        "Error",
        "Failed to load layout: " + error
      );
    }
  }, [
    layoutLoadedRef,
    requestInitialRuntimeSync,
    setInvalidateCounter,
    setLayout,
    setRedoStack,
    setUndoStack,
  ]);

  const saveLayoutToServer = useCallback(async (): Promise<void> => {
    await saveLayout(layoutRef.current);

    routeGraphStore.invalidate();

    showOkMessage(
      "",
      "LayoutView saved!"
    );
  }, [layoutRef]);

  const refreshServerRuntimeLayout = useCallback(async (): Promise<void> => {
    try {
      await refreshLayoutRuntime(layoutRef.current);

      routeGraphStore.invalidate();

      const graph =
        await routeGraphStore.ensureLoaded();

      layoutRef.current.applyRouteGraphRuntime(
        routeGraphStore.getTrackRuntime()
      );

      layoutRef.current.checkRoutes(graph);

      setInvalidateCounter(prev => prev + 1);

      showOkMessage(
        "Runtime layout",
        "Server runtime layout refreshed."
      );
    } catch (error) {
      showErrorMessage(
        "Runtime layout",
        error instanceof Error
          ? error.message
          : "Could not refresh server runtime layout."
      );
    }
  }, [layoutRef, setInvalidateCounter]);

  const loadCommandCentersFromServer = useCallback(async (): Promise<void> => {
    try {
      const data =
        await loadCommandCenters();

      if (!data) {
        setCommandCenter(
          new CommandCenter()
        );

        return;
      }

      setCommandCenter(
        new CommandCenter(data)
      );
    } catch (error) {
      console.error(
        "Nem sikerült betölteni a parancsközpontot:",
        error
      );

      showErrorMessage(
        "Error",
        "Failed to load command center: " + error
      );
    }
  }, [setCommandCenter]);

  const loadScriptFromServer = useCallback((): void => {
    scriptEngine.loadScript();
  }, []);

  const loadPartsFromServer = useCallback(async (): Promise<void> => {
    await loadLocos();
    await loadLayoutFromServer();
    await loadCommandCentersFromServer();
    loadScriptFromServer();

    setInvalidateCounter(prev => prev + 1);
  }, [
    loadCommandCentersFromServer,
    loadLayoutFromServer,
    loadLocos,
    loadScriptFromServer,
    setInvalidateCounter,
  ]);

  useEffect(() => {
    const unsubscribe =
      wsClient.subscribeStatus(status => {
        if (status === "connected") {
          requestInitialRuntimeSync();
        }
      });

    return () => {
      unsubscribe();
    };
  }, [requestInitialRuntimeSync]);

  useEffect(() => {
    void loadPartsFromServer();
  }, [loadPartsFromServer]);

  return {
    loadLocos,
    loadLayoutFromServer,
    saveLayoutToServer,
    refreshServerRuntimeLayout,
  };
}

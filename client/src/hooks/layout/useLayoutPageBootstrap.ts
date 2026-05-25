// client/src/hooks/layout/useLayoutPageBootstrap.ts

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useTranslation } from "react-i18next";

import {
  getLocosWs,
} from "../../api/locosWsApi";

import {
  getLayoutWs,
  refreshLayoutRuntimeWs,
  saveLayoutWs,
} from "../../api/layoutWsApi";

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
  SerializedLayoutDto,
} from "../../../../common/src/layout/layoutDto";

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

function serializeLayoutView(
  layout: LayoutView
): SerializedLayoutDto {
  return JSON.parse(
    JSON.stringify(layout)
  ) as SerializedLayoutDto;
}

export type UseLayoutPageBootstrapParams = {
  layoutRef: MutableRefObject<LayoutView>;
  layoutLoadedRef: MutableRefObject<boolean>;
  setLayout: LayoutSetter;
  setLocos: LocoSetter;
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
  setUndoStack,
  setRedoStack,
  setInvalidateCounter,
}: UseLayoutPageBootstrapParams): UseLayoutPageBootstrapResult {
  const { t } = useTranslation();
  const bootStartedRef = useRef(false);

  const loadLocos = useCallback(async (): Promise<void> => {
    try {
      const data =
        await getLocosWs();

      setLocos(data);
      locoStore.setLocos(data);
    } catch (error) {
      console.error(
        "Nem sikerült betölteni a mozdonyokat:",
        error
      );

      showErrorMessage(
        t("common.error"),
        t("layout.messages.loadLocosFailed", {
          error: String(error),
        })
      );

      setLocos([]);
    }
  }, [setLocos, t]);

  const requestInitialRuntimeSync = useCallback((): void => {
    if (!layoutLoadedRef.current) {
      return;
    }

    if (!wsClient.isConnected()) {
      return;
    }

    wsApi.getLayoutRuntimeSnapshot();
  }, [layoutLoadedRef]);

  const loadLayoutFromServer = useCallback(async (): Promise<void> => {
    try {
      const loaded =
        await getLayoutWs();

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
        t("common.error"),
        t("layout.messages.loadLayoutFailed", {
          error: String(error),
        })
      );
    }
  }, [
    layoutLoadedRef,
    requestInitialRuntimeSync,
    setInvalidateCounter,
    setLayout,
    setRedoStack,
    setUndoStack,
    t,
  ]);

  const saveLayoutToServer = useCallback(async (): Promise<void> => {
    await saveLayoutWs(
      serializeLayoutView(layoutRef.current)
    );

    routeGraphStore.invalidate();

    showOkMessage(
      "",
      t("layout.messages.saved")
    );
  }, [layoutRef, t]);

  const refreshServerRuntimeLayout = useCallback(async (): Promise<void> => {
    try {
      await refreshLayoutRuntimeWs(
        serializeLayoutView(layoutRef.current)
      );

      routeGraphStore.invalidate();

      const graph =
        await routeGraphStore.ensureLoaded();

      layoutRef.current.applyRouteGraphRuntime(
        routeGraphStore.getTrackRuntime()
      );

      layoutRef.current.checkRoutes(graph);

      setInvalidateCounter(prev => prev + 1);

      showOkMessage(
        t("layout.runtimeTitle"),
        t("layout.messages.runtimeRefreshed")
      );
    } catch (error) {
      showErrorMessage(
        t("layout.runtimeTitle"),
        error instanceof Error
          ? error.message
          : t("layout.messages.runtimeRefreshFailed")
      );
    }
  }, [layoutRef, setInvalidateCounter, t]);

  const loadScriptFromServer = useCallback((): void => {
    scriptEngine.loadScript();
  }, []);

  const loadPartsFromServer = useCallback(async (): Promise<void> => {
    await loadLocos();
    await loadLayoutFromServer();
    loadScriptFromServer();

    setInvalidateCounter(prev => prev + 1);
  }, [
    loadLayoutFromServer,
    loadLocos,
    loadScriptFromServer,
    setInvalidateCounter,
  ]);

  const bootstrapFromWelcome = useCallback((): void => {
    if (!wsClient.isConnected()) {
      return;
    }

    if (layoutLoadedRef.current) {
      requestInitialRuntimeSync();
      return;
    }

    if (bootStartedRef.current) {
      return;
    }

    bootStartedRef.current = true;

    void loadPartsFromServer().catch(error => {
      bootStartedRef.current = false;
      console.error("[Layout bootstrap] Failed after ws:welcome:", error);
    });
  }, [
    layoutLoadedRef,
    loadPartsFromServer,
    requestInitialRuntimeSync,
  ]);

  useEffect(() => {
    const unsubscribeWelcome =
      wsClient.on("ws:welcome", () => {
        bootstrapFromWelcome();
      });

    return () => {
      unsubscribeWelcome();
    };
  }, [bootstrapFromWelcome]);

  useEffect(() => {
    if (wsClient.isConnected()) {
      bootstrapFromWelcome();
    }
  }, [bootstrapFromWelcome]);

  return {
    loadLocos,
    loadLayoutFromServer,
    saveLayoutToServer,
    refreshServerRuntimeLayout,
  };
}

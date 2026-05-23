// client/src/components/track-canvas/trackCanvasRouteActions.ts

import type {
  TFunction,
} from "i18next";

import {
  showErrorMessage,
  showOkMessage,
  showWarningMessage,
  sleep,
} from "../../helpers";

import {
  isTurnoutElement,
  type LayoutView,
} from "../../models/editor/core/LayoutView";

import type {
  ExtendedRouteButtonElementView,
} from "../../models/editor/elements/ExtendedRouteButtonElementView";

import type {
  RouteButtonElementView,
} from "../../models/editor/elements/RouteButtonElementView";

import {
  routeGraphStore,
} from "../../services/routeGraphStore";

import {
  wsApi,
} from "../../services/wsApi";

export type RouteBusySetter = (
  busy: boolean,
  text?: string
) => void;

export type TrackCanvasRouteActionContext = {
  t: TFunction;
  commandCenterLocked: boolean;
  setBusy?: RouteBusySetter;
};

export async function executeRouteButton(
  routeButton: RouteButtonElementView,
  layout: LayoutView,
  context: TrackCanvasRouteActionContext
): Promise<void> {
  const { t, commandCenterLocked, setBusy } =
    context;

  if (commandCenterLocked) {
    showWarningMessage(
      t("common.error"),
      t("routesPanel.commandCenterBusy")
    );

    return;
  }

  const elements =
    layout.getAllElements();

  wsApi.routeLock();
  setBusy?.(
    true,
    t("routesPanel.routeIsBeingSet")
  );

  await sleep(1000);

  try {
    for (const routeTurnout of routeButton.routeTurnouts) {
      const element = elements.find(
        candidate => candidate.id === routeTurnout.turnoutId
      );

      if (!isTurnoutElement(element)) {
        continue;
      }

      wsApi.setTurnout(
        element.turnoutAddress,
        routeTurnout.closed
      );

      await sleep(1000);
    }
  } finally {
    wsApi.routeUnlock();
    setBusy?.(false);
  }
}

export async function executeExtendedRouteButton(
  routeButton: ExtendedRouteButtonElementView,
  context: TrackCanvasRouteActionContext
): Promise<void> {
  const { t, commandCenterLocked } =
    context;

  if (!routeButton.fromBlockId || !routeButton.toBlockId) {
    showWarningMessage(
      t("common.error"),
      t("routesPanel.automaticRouteMissingBlocks")
    );

    return;
  }

  try {
    const graph =
      await routeGraphStore.ensureLoaded();

    if (!graph) {
      showWarningMessage(
        t("common.error"),
        t("routesPanel.noServerGraph")
      );

      return;
    }

    const fromBlock =
      graph.findBlockById(routeButton.fromBlockId);

    const toBlock =
      graph.findBlockById(routeButton.toBlockId);

    if (!fromBlock || !toBlock) {
      showWarningMessage(
        t("common.error"),
        t("routesPanel.configuredBlocksMissing")
      );

      return;
    }

    if (routeButton.active) {
      wsApi.releaseRouteReservation(
        fromBlock.name,
        toBlock.name
      );

      showOkMessage(
        t("routesPanel.releaseRequest"),
        t("routesPanel.releaseRequested", {
          from: fromBlock.label,
          to: toBlock.label,
        })
      );

      return;
    }

    if (commandCenterLocked) {
      showWarningMessage(
        t("common.error"),
        t("routesPanel.commandCenterBusy")
      );

      return;
    }

    wsApi.reserveRoute(
      fromBlock.name,
      toBlock.name
    );

    showOkMessage(
      t("routesPanel.routeRequest"),
      t("routesPanel.reservationRequested", {
        from: fromBlock.label,
        to: toBlock.label,
      })
    );
  } catch (error) {
    showErrorMessage(
      t("common.error"),
      error instanceof Error
        ? error.message
        : t("routesPanel.automaticRouteFailed")
    );
  }
}

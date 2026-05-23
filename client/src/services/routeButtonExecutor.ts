// client/src/services/routeButtonExecutor.ts

import {
  isTurnoutElement,
  type LayoutView,
} from "../models/editor/core/LayoutView";

import type {
  RouteButtonElementView,
} from "../models/editor/elements/RouteButtonElementView";

import {
  sleep,
} from "../helpers";

import {
  wsApi,
} from "./wsApi";

type ExecuteLegacyRouteButtonParams = {
  routeButton: RouteButtonElementView;
  layout: LayoutView;
  commandCenterLocked: boolean;
  busyText?: string;
  setBusy?: (busy: boolean, text?: string) => void;
  onCommandCenterBusy?: () => void;
};

export async function executeLegacyRouteButton({
  routeButton,
  layout,
  commandCenterLocked,
  busyText,
  setBusy,
  onCommandCenterBusy,
}: ExecuteLegacyRouteButtonParams): Promise<boolean> {
  if (commandCenterLocked) {
    onCommandCenterBusy?.();
    return false;
  }

  if (routeButton.routeTurnouts.length === 0) {
    return false;
  }

  const elements =
    layout.getAllElements();

  wsApi.routeLock();
  setBusy?.(true, busyText);

  await sleep(1000);

  try {
    for (const routeTurnout of routeButton.routeTurnouts) {
      const turnout = elements.find(
        element => element.id === routeTurnout.turnoutId
      );

      if (!isTurnoutElement(turnout)) {
        continue;
      }

      /**
       * Legacy RouteButton stores physical command-center state.
       * Keep this unchanged here. Logical C/T display is handled only
       * by the property-panel UI using turnoutClosedValue.
       */
      wsApi.setTurnout(
        turnout.turnoutAddress,
        routeTurnout.closed
      );

      await sleep(1000);
    }

    return true;
  } finally {
    wsApi.routeUnlock();
    setBusy?.(false);
  }
}

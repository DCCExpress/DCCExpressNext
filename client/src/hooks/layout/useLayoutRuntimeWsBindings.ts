// client/src/hooks/layout/useLayoutRuntimeWsBindings.ts

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  Loco,
} from "../../../../common/src/types";

import {
  ELEMENT_TYPES,
} from "../../../../common/src/layout/elementTypes";

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
  showOkMessage,
  showWarningMessage,
} from "../../helpers";

import type {
  Layout,
} from "../../models/editor/core/Layout";

import {
  TrackSensorElementView,
} from "../../models/editor/elements/TrackSensorElementView";

import {
  TrackTurnoutLeftElementView,
} from "../../models/editor/elements/TrackTurnoutLeftElementView";

import {
  TrackTurnoutRightElementView,
} from "../../models/editor/elements/TrackTurnoutRightElementView";

import {
  TrackSignalElementView,
} from "../../models/editor/elements/TrackSignalElementView";

import {
  BlockElementView,
} from "../../models/editor/elements/BlockElementView";

import {
  ExtendedRouteButtonElement,
} from "../../models/editor/elements/ExtendedRouteButtonElement";

type InvalidateSetter =
  Dispatch<SetStateAction<number>>;

export type UseLayoutRuntimeWsBindingsParams = {
  layoutRef: MutableRefObject<Layout>;
  locosRef: MutableRefObject<Loco[]>;
  setInvalidateCounter: InvalidateSetter;
};

export function useLayoutRuntimeWsBindings({
  layoutRef,
  locosRef,
  setInvalidateCounter,
}: UseLayoutRuntimeWsBindingsParams): void {
  useEffect(() => {
    const invalidateLayout = (): void => {
      setInvalidateCounter(prev => prev + 1);
    };

    const syncExtendedRouteButtonActiveState = (
      busy: boolean,
      fromBlockName?: string,
      toBlockName?: string
    ): boolean => {
      if (!fromBlockName || !toBlockName) {
        return false;
      }

      const graph =
        routeGraphStore.getGraph();

      if (!graph) {
        return false;
      }

      let changed = false;

      const elements =
        layoutRef.current.getAllElements();

      for (const elem of elements) {
        if (!(elem instanceof ExtendedRouteButtonElement)) {
          continue;
        }

        const fromBlock =
          graph.findBlockById(elem.fromBlockId);

        const toBlock =
          graph.findBlockById(elem.toBlockId);

        if (!fromBlock || !toBlock) {
          continue;
        }

        const isSameRoute =
          fromBlock.name === fromBlockName &&
          toBlock.name === toBlockName;

        if (!isSameRoute) {
          continue;
        }

        if (elem.active !== busy) {
          elem.active = busy;
          changed = true;
        }
      }

      return changed;
    };

    const unsubscribeSensor =
      wsClient.on(
        "sensorChanged",
        data => {
          console.log("bejött sensor:", data);

          const elements =
            layoutRef.current.getAllElements();

          let changed = false;

          for (const element of elements) {
            if (element.type !== ELEMENT_TYPES.TRACK_SENSOR) {
              continue;
            }

            const sensor =
              element as TrackSensorElementView;

            if (sensor.address === data.address) {
              sensor.on = data.on;
              changed = true;
            }
          }

          if (changed) {
            invalidateLayout();
          }
        }
      );

    const unsubscribeTurnout =
      wsClient.on(
        "turnoutChanged",
        data => {
          console.log("turnoutChanged:", data);

          const elements =
            layoutRef.current.getAllElements();

          let changed = false;

          for (const element of elements) {
            if (
              element.type === ELEMENT_TYPES.TRACK_TURNOUT_LEFT
            ) {
              const turnout =
                element as TrackTurnoutLeftElementView;

              if (turnout.turnoutAddress === data.address) {
                turnout.turnoutClosed = data.closed;
                changed = true;
              }

              continue;
            }

            if (
              element.type === ELEMENT_TYPES.TRACK_TURNOUT_RIGHT
            ) {
              const turnout =
                element as TrackTurnoutRightElementView;

              if (turnout.turnoutAddress === data.address) {
                turnout.turnoutClosed = data.closed;
                changed = true;
              }
            }
          }

          if (changed) {
            const existingGraph =
              routeGraphStore.getGraph();

            layoutRef.current.checkRoutes(existingGraph);
            invalidateLayout();
          }
        }
      );

    const unsubscribeAccessory =
      wsClient.on(
        "accessoryChanged",
        data => {
          console.log("accessoryChanged:", data);

          const elements =
            layoutRef.current.getAllElements();

          let changed = false;

          for (const element of elements) {
            if (!(element instanceof TrackSignalElementView)) {
              continue;
            }

            if (
              element.address <= data.address &&
              element.lastAddress >= data.address
            ) {
              element.setValue(data.address, data.active);
              changed = true;
            }
          }

          if (changed) {
            invalidateLayout();
          }
        }
      );

    const unsubscribeBlockStateChanged =
      wsClient.on(
        "blockStateChanged",
        data => {
          console.log("blockStateChanged:", data);

          for (const [blockId, blockState] of Object.entries(data)) {
            const element =
              layoutRef.current.getElementById(blockId);

            if (
              !element ||
              element.type !== ELEMENT_TYPES.TRACK_BLOCK
            ) {
              continue;
            }

            const blockElement =
              element as BlockElementView;

            blockElement.locoAddress =
              locosRef.current.find(
                loco => loco.id === blockState.locoId
              )?.address ?? 0;
          }

          invalidateLayout();
        }
      );

    const unsubscribeCommandRejected =
      wsClient.on(
        "commandRejected",
        data => {
          if (data.lockOwner !== wsApi.clientUuid) {
            showWarningMessage(
              "Warning",
              data.reason
            );
          }
        }
      );

    const unsubscribeRouteReservationRejected =
      wsClient.on(
        "routeReservationRejected",
        data => {
          showWarningMessage(
            "Route reservation",
            data.reason
          );
        }
      );

    const unsubscribeRouteReservationChanged =
      wsClient.on(
        "routeReservationChanged",
        data => {
          const routeButtonChanged =
            syncExtendedRouteButtonActiveState(
              data.busy,
              data.fromBlockName,
              data.toBlockName
            );

          layoutStore.setElementsBusyByIds(
            data.elementIds,
            data.busy
          );

          layoutStore.setTurnoutsBusyByAddresses(
            data.turnoutAddresses,
            data.busy
          );

          if (routeButtonChanged) {
            invalidateLayout();
          }
        }
      );

    const unsubscribeAllRouteReservationsCleared =
      wsClient.on(
        "allRouteReservationsCleared",
        () => {
          layoutStore.clearAllBusy();
        }
      );

    const unsubscribeRouteReleased =
      wsClient.on(
        "routeReservationReleased",
        data => {
          const partiallyRetained =
            data.retainedSectionNames.length > 0 ||
            data.retainedTurnoutAddresses.length > 0;

          if (partiallyRetained) {
            showWarningMessage(
              "Route release",
              `${data.fromBlockName} → ${data.toBlockName} feloldva, de egyes elemek továbbra is foglaltak.`
            );

            return;
          }

          showOkMessage(
            "Route release",
            `${data.fromBlockName} → ${data.toBlockName} felszabadult.`
          );
        }
      );

    const unsubscribeRouteReleaseRejected =
      wsClient.on(
        "routeReservationReleaseRejected",
        data => {
          showWarningMessage(
            "Route release",
            data.reason
          );
        }
      );

    const unsubscribeTaskWaitingForLoco =
      wsClient.on(
        "taskWaitingForLoco",
        data => {
          showWarningMessage(
            "Task waiting",
            `${data.taskName}: ${data.message}`
          );
        }
      );

    const unsubscribeTaskCycleCompleted =
      wsClient.on(
        "taskCycleCompleted",
        data => {
          showOkMessage(
            "Task completed",
            `${data.taskName}: ${data.message}`
          );
        }
      );

    return () => {
      unsubscribeSensor();
      unsubscribeTurnout();
      unsubscribeAccessory();
      unsubscribeCommandRejected();
      unsubscribeBlockStateChanged();
      unsubscribeRouteReservationChanged();
      unsubscribeRouteReservationRejected();
      unsubscribeRouteReleaseRejected();
      unsubscribeRouteReleased();
      unsubscribeAllRouteReservationsCleared();
      unsubscribeTaskWaitingForLoco();
      unsubscribeTaskCycleCompleted();
    };
  }, [
    layoutRef,
    locosRef,
    setInvalidateCounter,
  ]);
}

// server/src/ws/handlers/wsRouteMessageHandlers.ts

import {
  routeGraphRuntimeStore,
} from "../../services/routeGraphRuntimeStore.js";

import {
  railwayTopologyStore,
} from "../../services/railwayTopologyStore.js";

import {
  logError,
} from "../../utility.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleRouteMessage: WsMessageHandler = async ({
  ws,
  msg,
  commandCenter,
  sendToClient,
  broadcast,
}) => {
  switch (msg.type) {
    case "reserveRoute": {
      const fromBlockName =
        msg.data?.fromBlockName;

      const toBlockName =
        msg.data?.toBlockName;

      if (
        typeof fromBlockName !== "string" ||
        typeof toBlockName !== "string"
      ) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: "Invalid reserveRoute payload.",
          },
        });

        return true;
      }

      const graph =
        routeGraphRuntimeStore.getGraph();

      if (!graph) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: "Nincs aktív szerveroldali route graph.",
          },
        });

        return true;
      }

      const solution =
        graph.findRouteBetweenBlockNames(
          fromBlockName,
          toBlockName
        );

      if (!solution) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: `Nincs útvonal: ${fromBlockName} → ${toBlockName}`,
          },
        });

        return true;
      }

      const topology =
        railwayTopologyStore.getTopology();

      if (!topology) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: "Nincs aktív szerveroldali topology.",
          },
        });

        return true;
      }

      const reservation =
        routeGraphRuntimeStore.tryReserveRoute(
          fromBlockName,
          toBlockName,
          solution
        );

      if (!reservation.ok) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: reservation.error,
          },
        });

        return true;
      }

      /**
       * A route foglalása már sikerült,
       * ezt rögtön broadcastoljuk minden kliensnek.
       */
      broadcast({
        type: "routeReservationChanged",
        data: {
          busy: true,
          sectionNames:
            reservation.reservation.sectionNames,
          elementIds:
            routeGraphRuntimeStore.getElementIdsForSections(
              reservation.reservation.sectionNames
            ),
          turnoutAddresses:
            reservation.reservation.turnoutAddresses,
          fromBlockName,
          toBlockName,
        },
      });

      /**
       * A fizikai váltóállítás idejére lockoljuk a command centert.
       * Ettől villog a StatusBar busy/lock jelzése.
       */
      commandCenter.locked = true;
      commandCenter.lockOwnerUUID = msg.uuid;

      broadcast({
        type: "commandCenterLockChanged",
        data: {
          locked: true,
          lockOwner: commandCenter.lockOwnerUUID,
          reason: "route",
        },
      });

      try {
        /**
         * A graph logikai closed értékét átfordítjuk
         * az adott váltó fizikai command-center boolean értékére.
         */
        for (const turnoutState of solution.turnoutStates) {
          const turnout =
            topology
              .getTurnouts()
              .find(
                item =>
                  item.turnoutAddress === turnoutState.address
              );

          if (!turnout) {
            logError(
              `[RouteReserve] Turnout not found in topology: ${turnoutState.address}`
            );

            continue;
          }

          const physicalClosed =
            turnoutState.closed === turnout.turnoutClosedValue;

          await commandCenter.setTurnout(
            turnoutState.address,
            physicalClosed
          );

          commandCenter.saveRuntimeState();

          await new Promise<void>(resolve =>
            setTimeout(resolve, 500)
          );
        }
      } finally {
        /**
         * A műveleti lockot akkor is elengedjük,
         * ha váltóállítás közben történik valami gebasz.
         *
         * FONTOS:
         * Ez csak a command center lock,
         * maga a route reservation továbbra is megmarad.
         */
        commandCenter.locked = false;
        commandCenter.lockOwnerUUID = null;

        broadcast({
          type: "commandCenterLockChanged",
          data: {
            locked: false,
            lockOwner: null,
            reason: null,
          },
        });
      }

      return true;
    }

    case "releaseRouteReservation": {
      const fromBlockName =
        msg.data?.fromBlockName;

      const toBlockName =
        msg.data?.toBlockName;

      if (
        typeof fromBlockName !== "string" ||
        typeof toBlockName !== "string"
      ) {
        sendToClient(ws, {
          type: "routeReservationReleaseRejected",
          data: {
            reason: "Invalid releaseRouteReservation payload.",
          },
        });

        return true;
      }

      const result =
        routeGraphRuntimeStore.releaseRouteReservation(
          fromBlockName,
          toBlockName
        );

      if (!result.ok) {
        sendToClient(ws, {
          type: "routeReservationReleaseRejected",
          data: {
            reason: result.error,
          },
        });

        return true;
      }

      broadcast({
        type: "routeReservationChanged",
        data: {
          busy: false,
          sectionNames: result.releasedSectionNames,
          elementIds:
            routeGraphRuntimeStore.getElementIdsForSections(
              result.releasedSectionNames
            ),
          turnoutAddresses:
            result.releasedTurnoutAddresses,
          fromBlockName,
          toBlockName,
        },
      });

      sendToClient(ws, {
        type: "routeReservationReleased",
        data: {
          fromBlockName,
          toBlockName,
          releasedSectionNames: result.releasedSectionNames,
          retainedSectionNames: result.retainedSectionNames,
          releasedTurnoutAddresses:
            result.releasedTurnoutAddresses,
          retainedTurnoutAddresses:
            result.retainedTurnoutAddresses,
        },
      });

      return true;
    }

    case "clearAllRouteReservations": {
      routeGraphRuntimeStore.clearAllBusy();

      broadcast({
        type: "allRouteReservationsCleared",
        data: {},
      });

      return true;
    }

    case "getRouteReservations": {
      const reservations =
        routeGraphRuntimeStore.getActiveReservations();

      for (const reservation of reservations) {
        sendToClient(ws, {
          type: "routeReservationChanged",
          data: {
            busy: true,
            sectionNames:
              reservation.sectionNames,
            elementIds:
              routeGraphRuntimeStore.getElementIdsForSections(
                reservation.sectionNames
              ),
            turnoutAddresses:
              reservation.turnoutAddresses,
            fromBlockName:
              reservation.fromBlockName,
            toBlockName:
              reservation.toBlockName,
          },
        });
      }

      return true;
    }

    default:
      return false;
  }
};

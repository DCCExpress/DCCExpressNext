// server/src/ws/wsRuntimeConfiguration.ts

import {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  CommandCenterSimulator,
} from "../commandCenter/simulator.js";

import {
  routeGraphRuntimeStore,
} from "../services/routeGraphRuntimeStore.js";

import {
  scriptRuntimeStore,
} from "../services/scriptRuntimeStore.js";

import {
  taskRuntimeStore,
} from "../services/taskRuntimeStore.js";

import {
  fastClockRuntimeStore,
} from "../services/fastClockRuntimeStore.js";

import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";


import {
  runtimeVariableService,
} from "../services/runtimeVariableService.js";

type BroadcastMessage = (
  message: TypedServerWsMessage
) => void;

type WsRuntimeConfigurationParams = {
  broadcast: BroadcastMessage;
  getCommandCenter: () => CommandCenter | null;
  getLogicalTurnoutState: (
    address: number
  ) => boolean | null;
};

export function configureWebSocketRuntimes({
  broadcast,
  getCommandCenter,
  getLogicalTurnoutState,
}: WsRuntimeConfigurationParams): void {

  runtimeVariableService.setBroadcast(message => {
    broadcast(message);
  });

  scriptRuntimeStore.configure({
    broadcast: message => {
      broadcast(message);
    },

    commands: {
      setTrackPower: async (on: boolean) => {
        const commandCenter =
          getCommandCenter();

        if (!commandCenter) {
          return false;
        }

        return commandCenter.setTrackPower(on);
      },

      emergencyStop: async () => {
        const commandCenter =
          getCommandCenter();

        if (!commandCenter) {
          return false;
        }

        return commandCenter.emergencyStop();
      },

      setTurnout: async (
        address: number,
        closed: boolean
      ) => {
        const commandCenter =
          getCommandCenter();

        if (!commandCenter) {
          return false;
        }

        return commandCenter.setTurnout(
          address,
          closed
        );
      },

      getTurnoutState: (
        address: number
      ) => {
        return getLogicalTurnoutState(address);
      },

      setLocoFunction: async (
        address: number,
        fn: number,
        active: boolean
      ) => {
        const commandCenter =
          getCommandCenter();

        if (!commandCenter) {
          return false;
        }

        return commandCenter.setLocoFunction(
          address,
          fn,
          active
        );
      },

      setBasicAccessory: async (
        address: number,
        active: boolean
      ) => {
        const commandCenter =
          getCommandCenter();

        if (!commandCenter) {
          return false;
        }

        return commandCenter.setBasicAccessory(
          address,
          active
        );
      },

      isTurnoutBusy: (
        address: number
      ) => {
        return routeGraphRuntimeStore.isTurnoutBusy(
          address
        );
      },
    },
  });

  taskRuntimeStore.configure({
    broadcast: message => {
      broadcast(message);
    },

    getBlockState: (
      blockId: string
    ) => {
      return getCommandCenter()?.getBlockState(blockId) ?? null;
    },

    getSimulatorCommandCenter: () => {
      const commandCenter =
        getCommandCenter();

      return commandCenter instanceof CommandCenterSimulator
        ? commandCenter
        : null;
    },
  });

  fastClockRuntimeStore.configure({
    broadcast: message => {
      broadcast(message);
    },
  });
}

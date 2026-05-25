// server/src/ws/wsInitialSnapshots.ts

import type {
  WebSocket,
} from "ws";

import type {
  PowerInfo,
  TypedServerWsMessage,
  WsPowerInfoPayload,
} from "../../../common/src/types.js";

import type {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  scriptRuntimeStore,
} from "../services/scriptRuntimeStore.js";

import {
  taskRuntimeStore,
} from "../services/taskRuntimeStore.js";

import {
  fastClockRuntimeStore,
} from "../services/fastClockRuntimeStore.js";

import {
  runtimeVariableService,
} from "../services/runtimeVariableService.js";

import {
  serverRuntimeStatsStore,
} from "../services/serverRuntimeStatsStore.js";

type SendToClient = (
  ws: WebSocket,
  message: TypedServerWsMessage
) => void;

type InitialSnapshotParams = {
  ws: WebSocket;
  commandCenter: CommandCenter | null;
  sendToClient: SendToClient;
};

function toWsPowerInfoPayload(
  powerInfo: PowerInfo
): WsPowerInfoPayload {
  return {
    emergencyStop: powerInfo.emergencyStop,
    trackVoltageOn: powerInfo.trackVoltageOn,
    trackVoltageOff: !powerInfo.trackVoltageOn,
    shortCircuit: powerInfo.shortCircuit,
    programmingModeActive: false,
  };
}

export function sendInitialWebSocketSnapshots({
  ws,
  commandCenter,
  sendToClient,
}: InitialSnapshotParams): void {
  sendToClient(ws, {
    type: "ws:welcome",
    data: {
      message: "Connected",
    },
  });

  sendToClient(ws, {
    type: "scriptDocumentChanged",
    data: scriptRuntimeStore.getDocument(),
  });

  sendToClient(ws, {
    type: "scriptStateChanged",
    data: scriptRuntimeStore.getCurrentState(),
  });

  sendToClient(ws, {
    type: "taskManagerSnapshotChanged",
    data: taskRuntimeStore.getSnapshot(),
  });

  sendToClient(ws, {
    type: "fastClockChanged",
    data: fastClockRuntimeStore.getSnapshot(),
  });

  sendToClient(ws, {
    type: "runtimeVariablesSnapshot",
    data: runtimeVariableService.getSnapshot(),
  });

  sendToClient(ws, {
    type: "serverRuntimeStatsChanged",
    data: serverRuntimeStatsStore.getSnapshot(),
  });

  if (!commandCenter) {
    sendToClient(ws, {
      type: "commandCenterInfo",
      data: {
        alive: false,
      },
    });

    return;
  }

  commandCenter.clientConnected();

  const powerInfo = commandCenter.getPowerInfo();

  sendToClient(ws, {
    type: "commandCenterInfo",
    data: {
      alive: commandCenter.isAlive(),
      name: commandCenter.getName(),
      connectionString: commandCenter.getConnectionString(),
      power: powerInfo.trackVoltageOn,
    },
  });

  sendToClient(ws, {
    type: "powerInfo",
    data: toWsPowerInfoPayload(powerInfo),
  });

  sendToClient(ws, {
    type: "commandCenterLockChanged",
    data: {
      locked: commandCenter.locked,
      lockOwner: commandCenter.lockOwnerUUID ?? null,
      reason: commandCenter.locked
        ? "route"
        : null,
    },
  });
}

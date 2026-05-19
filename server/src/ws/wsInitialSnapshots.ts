// server/src/ws/wsInitialSnapshots.ts

import type {
  WebSocket,
} from "ws";

import type {
  AccessoryChangedMessage,
  CommandCenterInfo,
  TurnoutChangedMessage,
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
  log,
} from "../utility.js";

type SendToClient = (
  ws: WebSocket,
  message: unknown
) => void;

type InitialSnapshotParams = {
  ws: WebSocket;
  commandCenter: CommandCenter | null;
  sendToClient: SendToClient;
};

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

  if (!commandCenter) {
    sendToClient(ws, {
      type: "commandCenterInfo",
      data: {
        alive: false,
      },
    } as CommandCenterInfo);

    return;
  }

  commandCenter.clientConnected();

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

  const locos =
    commandCenter.getLocos();

  for (const loco of locos) {
    sendToClient(ws, {
      type: "locoState",
      data: {
        loco,
      },
    });
  }

  const turnouts =
    commandCenter.getTurnouts();

  log("Turnouts", turnouts);

  for (const turnout of turnouts) {
    const msg: TurnoutChangedMessage = {
      type: "turnoutChanged",
      data: {
        address: turnout.address,
        closed: turnout.closed,
      },
    };

    sendToClient(ws, msg);
  }

  commandCenter.getBlocks();

  const accessories =
    commandCenter.getAccessories();

  for (const accessory of accessories) {
    const msg: AccessoryChangedMessage = {
      type: "accessoryChanged",
      data: {
        address: accessory.address,
        active: accessory.active,
      },
    };

    sendToClient(ws, msg);
  }
}

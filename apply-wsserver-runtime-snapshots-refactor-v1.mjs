#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  wsServer: path.join(
    ROOT,
    "server/src/ws/wsServer.ts"
  ),
  runtimeConfiguration: path.join(
    ROOT,
    "server/src/ws/wsRuntimeConfiguration.ts"
  ),
  initialSnapshots: path.join(
    ROOT,
    "server/src/ws/wsInitialSnapshots.ts"
  ),
};

function fail(message) {
  throw new Error(message);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }

  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Írva: ${path.relative(ROOT, file)}`);
}

function getEol(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    fail(`${label}: nem találtam a keresett mintát.`);
  }

  return source.replace(search, replacement);
}

function insertAfter(source, marker, insertion, label) {
  const index = source.indexOf(marker);

  if (index < 0) {
    fail(`${label}: nem találtam a beszúrási pontot.`);
  }

  return (
    source.slice(0, index + marker.length) +
    insertion +
    source.slice(index + marker.length)
  );
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);

  if (start < 0) {
    fail(`${label}: nem találtam a kezdő markert.`);
  }

  const end = source.indexOf(endMarker, start + startMarker.length);

  if (end < 0) {
    fail(`${label}: nem találtam a záró markert.`);
  }

  return (
    source.slice(0, start) +
    replacement +
    source.slice(end)
  );
}

function removeNamedFunction(source, functionName, label) {
  const regex =
    new RegExp(
      String.raw`^[ \t]*function[ \t]+${functionName}[ \t]*\(`,
      "m"
    );

  const match =
    regex.exec(source);

  if (!match) {
    fail(`${label}: nem találtam ezt a függvényt: ${functionName}`);
  }

  const start =
    match.index;

  const openBrace =
    source.indexOf("{", start);

  if (openBrace < 0) {
    fail(`${label}: nem találtam nyitó kapcsos zárójelet: ${functionName}`);
  }

  let depth = 0;

  for (let i = openBrace; i < source.length; i++) {
    const char =
      source[i];

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        let end = i + 1;

        while (
          end < source.length &&
          (source[end] === "\r" || source[end] === "\n")
        ) {
          end++;
        }

        return (
          source.slice(0, start) +
          source.slice(end)
        );
      }
    }
  }

  fail(`${label}: nem találtam a függvény végét: ${functionName}`);
}

const RUNTIME_CONFIGURATION = `// server/src/ws/wsRuntimeConfiguration.ts

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

type BroadcastMessage = (
  message: unknown
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
`;

const INITIAL_SNAPSHOTS = `// server/src/ws/wsInitialSnapshots.ts

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
`;

function patchWsServer() {
  let source =
    read(FILES.wsServer);

  const eol =
    getEol(source);

  source = replaceOnce(
    source,
    'import { AccessoryChangedMessage, CommandCenterInfo, TurnoutChangedMessage, WsMessage } from "../../../common/src/types.js";',
    'import { WsMessage } from "../../../common/src/types.js";',
    "wsServer types import egyszerűsítés"
  );

  if (!source.includes('from "./wsRuntimeConfiguration.js";')) {
    source = insertAfter(
      source,
      'import { fastClockRuntimeStore } from "../services/fastClockRuntimeStore.js";',
      [
        "",
        'import { configureWebSocketRuntimes } from "./wsRuntimeConfiguration.js";',
        'import { sendInitialWebSocketSnapshots } from "./wsInitialSnapshots.js";',
      ].join(eol),
      "wsServer új ws helper importok"
    );
  }

  const commentedLegacyBlockStart =
    [
      "",
      "",
      '// type SetTurnoutMessage = {',
    ].join(eol);

  const sendToClientMarker =
    [
      "",
      "",
      "function sendToClient(ws: WebSocket, message: unknown) {",
    ].join(eol);

  if (source.includes(commentedLegacyBlockStart)) {
    source = replaceBetween(
      source,
      commentedLegacyBlockStart,
      sendToClientMarker,
      sendToClientMarker,
      "wsServer régi kommentelt típusmaradványok törlése"
    );
  }

  if (source.includes("function configureScriptRuntime(")) {
    source = removeNamedFunction(
      source,
      "configureScriptRuntime",
      "configureScriptRuntime törlése"
    );
  }

  if (source.includes("function configureFastClockRuntime(")) {
    source = removeNamedFunction(
      source,
      "configureFastClockRuntime",
      "configureFastClockRuntime törlése"
    );
  }

  if (source.includes("function configureTaskRuntime(")) {
    source = removeNamedFunction(
      source,
      "configureTaskRuntime",
      "configureTaskRuntime törlése"
    );
  }

  source = replaceOnce(
    source,
    [
      "  configureScriptRuntime();",
      "  configureTaskRuntime();",
      "  configureFastClockRuntime();",
    ].join(eol),
    [
      "  configureWebSocketRuntimes({",
      "    broadcast: message => {",
      "      broadcastAll(message);",
      "    },",
      "",
      "    getCommandCenter: () => commandCenter,",
      "    getLogicalTurnoutState,",
      "  });",
    ].join(eol),
    "wsServer runtime konfigurálás lecserélése"
  );

  const snapshotStart =
    [
      "    sendToClient(ws, {",
      '      type: "ws:welcome",',
    ].join(eol);

  const messageHandlerStart =
    '    ws.on("message", async (message) => {';

  source = replaceBetween(
    source,
    snapshotStart,
    messageHandlerStart,
    [
      "    sendInitialWebSocketSnapshots({",
      "      ws,",
      "      commandCenter,",
      "      sendToClient,",
      "    });",
      "",
      messageHandlerStart,
    ].join(eol),
    "wsServer kezdeti snapshot blokk kiszervezése"
  );

  write(
    FILES.wsServer,
    source
  );
}

try {
  console.log("DCCExpressNext – wsServer runtime + initial snapshots refactor patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  write(
    FILES.runtimeConfiguration,
    RUNTIME_CONFIGURATION
  );

  write(
    FILES.initialSnapshots,
    INITIAL_SNAPSHOTS
  );

  patchWsServer();

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

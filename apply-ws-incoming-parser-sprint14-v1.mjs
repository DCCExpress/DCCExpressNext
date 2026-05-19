#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  wsTypes: path.join(
    ROOT,
    "common/src/wsTypes.ts"
  ),
  incomingParser: path.join(
    ROOT,
    "server/src/ws/wsIncomingClientMessageParser.ts"
  ),
  wsServer: path.join(
    ROOT,
    "server/src/ws/wsServer.ts"
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

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    fail(`${label}: nem találtam a keresett mintát.`);
  }

  console.log(`  · ${label}`);
  return source.replace(search, replacement);
}

function patchWsTypes() {
  let source = read(FILES.wsTypes);

  if (!source.includes("export const CLIENT_WS_MESSAGE_TYPES")) {
    const marker = `export type ClientWsMessageType =
  keyof ClientWsPayloadMap;
`;

    const replacement = `${marker}
export const CLIENT_WS_MESSAGE_TYPES = [
  "setTrackPower",
  "emergencyStop",
  "setLoco",
  "getLoco",
  "setLocoFunction",
  "setTurnout",
  "setSensor",
  "setBasicAccessory",
  "setBlock",
  "setBlockRemove",
  "setBlocksReset",
  "getBlocks",
  "routeLock",
  "routeUnlock",
  "reserveRoute",
  "releaseRouteReservation",
  "clearAllRouteReservations",
  "getRouteReservations",
  "runScript",
  "stopScript",
  "getScriptRuntimeState",
  "startTask",
  "finishTask",
  "abortTask",
  "pauseTask",
  "resumeTask",
  "finishAllTasks",
  "abortAllTasks",
  "getTaskRuntimeState",
] as const satisfies readonly ClientWsMessageType[];

export function isClientWsMessageType(
  value: unknown
): value is ClientWsMessageType {
  return (
    typeof value === "string" &&
    (CLIENT_WS_MESSAGE_TYPES as readonly string[]).includes(value)
  );
}
`;

    source = replaceOnce(
      source,
      marker,
      replacement,
      "wsTypes.ts: ismert kliens WS message type lista + guard"
    );
  } else {
    console.log("- Kihagyva: CLIENT_WS_MESSAGE_TYPES már létezik.");
  }

  write(FILES.wsTypes, source);
}

const INCOMING_PARSER = `// server/src/ws/wsIncomingClientMessageParser.ts

import type {
  ClientWsMessageUnion,
} from "../../../common/src/types.js";

import {
  isClientWsMessageType,
} from "../../../common/src/types.js";

export type IncomingClientWsMessageParseResult =
  | {
      ok: true;
      message: ClientWsMessageUnion;
    }
  | {
      ok: false;
      reason: string;
    };

export function parseIncomingClientWsMessage(
  rawText: string
): IncomingClientWsMessageParseResult {
  let parsed: unknown;

  try {
    parsed =
      JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      reason: "Invalid JSON payload.",
    };
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return {
      ok: false,
      reason: "WebSocket message must be an object.",
    };
  }

  const candidate =
    parsed as Record<string, unknown>;

  if (!isClientWsMessageType(candidate.type)) {
    return {
      ok: false,
      reason: "Unknown WebSocket message type.",
    };
  }

  if (
    typeof candidate.uuid !== "string" ||
    candidate.uuid.trim().length === 0
  ) {
    return {
      ok: false,
      reason: "WebSocket message UUID is missing or invalid.",
    };
  }

  /**
   * A teljes payload-validálást külön, következő sprintben érdemes
   * szépen hozzáadni message-típusonként.
   *
   * Itt már biztosan:
   * - objektum jött,
   * - ismert kliens message type van benne,
   * - érvényes kliens UUID érkezett.
   */
  return {
    ok: true,
    message: candidate as ClientWsMessageUnion,
  };
}
`;

function patchWsServer() {
  let source = read(FILES.wsServer);

  source = replaceOnce(
    source,
    `import type {
  ClientWsMessageUnion,
} from "../../../common/src/types.js";`,
    ``,
    "wsServer.ts: közvetlen ClientWsMessageUnion import törlése"
  );

  if (!source.includes('from "./wsIncomingClientMessageParser.js";')) {
    source = replaceOnce(
      source,
      `import {
  routeIncomingWebSocketMessage,
} from "./wsMessageRouter.js";`,
      `import {
  routeIncomingWebSocketMessage,
} from "./wsMessageRouter.js";

import {
  parseIncomingClientWsMessage,
} from "./wsIncomingClientMessageParser.js";`,
      "wsServer.ts: incoming message parser import"
    );
  }

  source = replaceOnce(
    source,
    `      try {
        const msg =
          JSON.parse(text) as ClientWsMessageUnion;

        if (msg.uuid) {
          clientUUID =
            msg.uuid;
        }

        log("Received message of type:", msg.type);

        await routeIncomingWebSocketMessage({
          ws,
          msg,
          commandCenter: currentCommandCenter,
          sendToClient,
          broadcast: broadcastAll,
        });
      } catch (error) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: String(error),
          },
        });
      }`,
    `      const parseResult =
        parseIncomingClientWsMessage(text);

      if (!parseResult.ok) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: parseResult.reason,
          },
        });

        return;
      }

      const msg =
        parseResult.message;

      clientUUID =
        msg.uuid;

      log("Received message of type:", msg.type);

      try {
        await routeIncomingWebSocketMessage({
          ws,
          msg,
          commandCenter: currentCommandCenter,
          sendToClient,
          broadcast: broadcastAll,
        });
      } catch (error) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: String(error),
          },
        });
      }`,
    "wsServer.ts: vak JSON cast helyett parser/guard használata"
  );

  write(FILES.wsServer, source);
}

try {
  console.log("DCCExpressNext – WS incoming parser Sprint 14 patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchWsTypes();
  write(FILES.incomingParser, INCOMING_PARSER);
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

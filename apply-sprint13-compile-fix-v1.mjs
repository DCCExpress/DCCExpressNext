#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  wsTypes: path.join(
    ROOT,
    "common/src/wsTypes.ts"
  ),
  scriptHandler: path.join(
    ROOT,
    "server/src/ws/handlers/wsScriptMessageHandlers.ts"
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
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
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

  if (!source.includes("  setSensor: {")) {
    source = replaceOnce(
      source,
      `  setTurnout: {
    address: number;
    closed: boolean;
  };

  setBasicAccessory: {`,
      `  setTurnout: {
    address: number;
    closed: boolean;
  };

  setSensor: {
    address: number;
    on: boolean;
  };

  setBasicAccessory: {`,
      "wsTypes.ts: setSensor bekerül a ClientWsPayloadMap-be"
    );
  } else {
    console.log("- Kihagyva: setSensor már benne van a ClientWsPayloadMap-ben.");
  }

  if (source.includes(`export type SetSensorMessage = {
  type: "setSensor";
  data: {
    address: number;
    on: boolean;
  };
  uuid: string;
};`)) {
    source = replaceOnce(
      source,
      `export type SetSensorMessage = {
  type: "setSensor";
  data: {
    address: number;
    on: boolean;
  };
  uuid: string;
};`,
      `export type SetSensorMessage =
  TypedClientWsMessage<"setSensor">;`,
      "wsTypes.ts: SetSensorMessage alias egységesítése"
    );
  } else if (source.includes(`export type SetSensorMessage =
  TypedClientWsMessage<"setSensor">;`)) {
    console.log("- Kihagyva: SetSensorMessage már egységesítve van.");
  } else {
    fail("wsTypes.ts: nem találtam felismerhető SetSensorMessage definíciót.");
  }

  write(FILES.wsTypes, source);
}

function patchScriptHandler() {
  let source = read(FILES.scriptHandler);

  if (!source.includes("ScriptRunSource")) {
    source = replaceOnce(
      source,
      `import {
  scriptRuntimeStore,
} from "../../services/scriptRuntimeStore.js";`,
      `import {
  scriptRuntimeStore,
} from "../../services/scriptRuntimeStore.js";

import type {
  ScriptRunSource,
} from "../../services/scriptRuntimeStore.js";`,
      "wsScriptMessageHandlers.ts: ScriptRunSource import"
    );
  } else {
    console.log("- Kihagyva: ScriptRunSource import már jelen van.");
  }

  if (!source.includes("function normalizeScriptRunSource(")) {
    source = replaceOnce(
      source,
      `import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleScriptMessage`,
      `import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function normalizeScriptRunSource(
  value: unknown
): ScriptRunSource {
  switch (value) {
    case "property-panel":
    case "route-button":
    case "control-panel":
    case "auto-start":
    case "unknown":
      return value;

    default:
      return "unknown";
  }
}

export const handleScriptMessage`,
      "wsScriptMessageHandlers.ts: ScriptRunSource normalizáló helper"
    );
  } else {
    console.log("- Kihagyva: ScriptRunSource normalizáló helper már létezik.");
  }

  source = replaceOnce(
    source,
    `        const source =
          typeof msg.data?.source === "string"
            ? msg.data.source
            : "unknown";`,
    `        const source =
          normalizeScriptRunSource(
            msg.data?.source
          );`,
    "wsScriptMessageHandlers.ts: source string -> ScriptRunSource normalizálás"
  );

  write(FILES.scriptHandler, source);
}

try {
  console.log("DCCExpressNext – Sprint 13 compile fix patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchWsTypes();
  patchScriptHandler();

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

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  wsTypes: path.join(
    ROOT,
    "common/src/wsTypes.ts"
  ),
  handlerTypes: path.join(
    ROOT,
    "server/src/ws/handlers/wsHandlerTypes.ts"
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

  if (source.includes("export type ClientWsMessageUnion")) {
    console.log("- Kihagyva: ClientWsMessageUnion már létezik.");
    return;
  }

  const marker = `export type TypedClientWsMessage<
  TType extends ClientWsMessageType = ClientWsMessageType
> = {
  [K in TType]: {
    type: K;
    data: ClientWsPayloadMap[K];
    uuid: string;
  };
}[TType];
`;

  const replacement = `${marker}
export type ClientWsMessageUnion = {
  [K in ClientWsMessageType]: TypedClientWsMessage<K>;
}[ClientWsMessageType];
`;

  source = replaceOnce(
    source,
    marker,
    replacement,
    "wsTypes.ts: ClientWsMessageUnion beszúrása"
  );

  write(FILES.wsTypes, source);
}

function patchHandlerTypes() {
  let source = read(FILES.handlerTypes);

  source = replaceOnce(
    source,
    `import type {
  WsMessage,
} from "../../../../common/src/types.js";`,
    `import type {
  ClientWsMessageUnion,
} from "../../../../common/src/types.js";`,
    "wsHandlerTypes.ts: WsMessage import -> ClientWsMessageUnion"
  );

  source = replaceOnce(
    source,
    `  msg: WsMessage;`,
    `  msg: ClientWsMessageUnion;`,
    "wsHandlerTypes.ts: handler context msg típusa"
  );

  write(FILES.handlerTypes, source);
}

function patchWsServer() {
  let source = read(FILES.wsServer);

  source = replaceOnce(
    source,
    `import type {
  WsMessage,
} from "../../../common/src/types.js";`,
    `import type {
  ClientWsMessageUnion,
} from "../../../common/src/types.js";`,
    "wsServer.ts: WsMessage import -> ClientWsMessageUnion"
  );

  source = replaceOnce(
    source,
    `        const msg =
          JSON.parse(text) as WsMessage;`,
    `        const msg =
          JSON.parse(text) as ClientWsMessageUnion;`,
    "wsServer.ts: parsed incoming message union cast"
  );

  write(FILES.wsServer, source);
}

try {
  console.log("DCCExpressNext – Server Client WS Union Sprint 13 patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchWsTypes();
  patchHandlerTypes();
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

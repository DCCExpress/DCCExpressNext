// server/src/services/commandCenterConfigStore.ts

import fs from "node:fs/promises";
import path from "node:path";

import type {
  CommandCenterType,
} from "../../../common/src/types.js";

import {
  dataDir,
} from "../paths.js";

export interface CommandCenterConfig {
  name: string;
  type: CommandCenterType;
  simulator: {};
  z21: {
    host?: string;
    port?: number;
  };
  dccexTcp: {
    host?: string;
    port?: number;
    init?: string;
  };
  dccexSerial: {
    serialPort?: string;
    baudRate?: number;
    init?: string;
  };
  autoConnect?: boolean;
}

export let CurrentCommandCenterConfig: CommandCenterConfig | null = null;

let cbCommandCenterConfigLoaded:
  | ((conf: CommandCenterConfig | null) => void)
  | null = null;

function resolveFilePath(): string {
  return path.resolve(
    dataDir,
    "command-centers.json"
  );
}

function isValidCommandCenterType(
  value: unknown
): value is CommandCenterType {
  return (
    value === "z21" ||
    value === "dcc-ex-tcp" ||
    value === "dcc-ex-serial" ||
    value === "simulator"
  );
}

export function setCommandCenterConfigLoadedCallback(
  cb: (conf: CommandCenterConfig | null) => void
): void {
  cbCommandCenterConfigLoaded = cb;
}

export async function readCommandCenter(): Promise<CommandCenterConfig | null> {
  const filePath = resolveFilePath();

  try {
    const content = await fs.readFile(
      filePath,
      "utf8"
    );

    CurrentCommandCenterConfig =
      JSON.parse(content) as CommandCenterConfig;
  } catch {
    CurrentCommandCenterConfig = null;
    console.log(
      "READCOMMANDCENTER:",
      "Nem sikerült beolvasni a parancsközpontot.",
      filePath
    );
  }

  return CurrentCommandCenterConfig;
}

async function writeCommandCenter(
  item: CommandCenterConfig
): Promise<void> {
  const filePath = resolveFilePath();

  try {
    await fs.mkdir(
      path.dirname(filePath),
      { recursive: true }
    );

    await fs.writeFile(
      filePath,
      JSON.stringify(item, null, 2),
      "utf8"
    );
  } catch {
    console.log(
      "WRITCOMMANDCENTER:",
      "Nem sikerült elmenteni a parancsközpontot:",
      filePath
    );
  }
}

export function normalizeCommandCenter(
  input: Partial<CommandCenterConfig>
): CommandCenterConfig {
  return {
    name: typeof input.name === "string"
      ? input.name
      : "",
    type: isValidCommandCenterType(input.type)
      ? input.type
      : "simulator",
    simulator: {},
    z21: {
      host: typeof input.z21?.host === "string"
        ? input.z21.host
        : "192.168.1.100",
      port: typeof input.z21?.port === "number"
        ? input.z21.port
        : 21105,
    },
    dccexTcp: {
      host: typeof input.dccexTcp?.host === "string"
        ? input.dccexTcp.host
        : "",
      port: typeof input.dccexTcp?.port === "number"
        ? input.dccexTcp.port
        : 2560,
      init: typeof input.dccexTcp?.init === "string"
        ? input.dccexTcp.init
        : "",
    },
    dccexSerial: {
      serialPort: typeof input.dccexSerial?.serialPort === "string"
        ? input.dccexSerial.serialPort
        : "",
      baudRate: typeof input.dccexSerial?.baudRate === "number"
        ? input.dccexSerial.baudRate
        : 115200,
      init: typeof input.dccexSerial?.init === "string"
        ? input.dccexSerial.init
        : "",
    },
    autoConnect: typeof input.autoConnect === "boolean"
      ? input.autoConnect
      : false,
  };
}

export async function saveCommandCenterConfig(
  input: Partial<CommandCenterConfig>
): Promise<CommandCenterConfig> {
  const item = normalizeCommandCenter(input);

  if (!item.name.trim()) {
    throw new Error("A név megadása kötelező.");
  }

  await writeCommandCenter(item);
  CurrentCommandCenterConfig = item;

  cbCommandCenterConfigLoaded?.(item);

  return item;
}

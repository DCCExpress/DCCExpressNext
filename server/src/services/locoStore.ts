// server/src/services/locoStore.ts

import fs from "node:fs/promises";
import path from "node:path";

import type {
  Loco,
} from "../../../common/src/types.js";

import {
  dataDir,
} from "../paths.js";

function resolveFilePath(): string {
  return path.resolve(dataDir, "locos.json");
}

export async function readLocos(): Promise<Loco[]> {
  const filePath = resolveFilePath();

  try {
    const content = await fs.readFile(filePath, "utf8");

    return JSON.parse(content) as Loco[];
  } catch {
    console.log(
      "READLOCOS:",
      "Nem sikerült beolvasni a mozdonyokat."
    );

    return [];
  }
}

export async function writeLocos(
  locos: Loco[]
): Promise<void> {
  const filePath = resolveFilePath();

  try {
    await fs.mkdir(
      path.dirname(filePath),
      { recursive: true }
    );

    await fs.writeFile(
      filePath,
      JSON.stringify(locos, null, 2),
      "utf8"
    );
  } catch {
    console.log(
      "WRITELOCOS:",
      "Nem sikerült elmenteni a mozdonyokat."
    );
  }
}

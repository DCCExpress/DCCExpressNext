// server/src/services/dataFileStore.ts

import fs from "node:fs/promises";
import path from "node:path";

import {
  dataDir,
} from "../paths.js";

export function safeDataFilePath(fileName: string): string {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("Missing file name");
  }

  const normalized = fileName.replaceAll("\\", "/");

  if (normalized.includes("..")) {
    throw new Error("Invalid file name");
  }

  const fullPath = path.resolve(dataDir, normalized);
  const root = path.resolve(dataDir);

  if (
    !fullPath.startsWith(root + path.sep) &&
    fullPath !== root
  ) {
    throw new Error("Invalid file path");
  }

  return fullPath;
}

export async function readDataFile(
  fileName: string
): Promise<string> {
  const filePath = safeDataFilePath(fileName);

  return fs.readFile(filePath, "utf8");
}

export async function writeDataFile(
  fileName: string,
  content: string
): Promise<void> {
  const filePath = safeDataFilePath(fileName);

  await fs.mkdir(
    path.dirname(filePath),
    { recursive: true }
  );

  await fs.writeFile(
    filePath,
    content,
    "utf8"
  );
}

export async function readDataJsonFile(
  fileName: string
): Promise<unknown> {
  const content = await readDataFile(fileName);

  return JSON.parse(content);
}

export async function writeDataJsonFile(
  fileName: string,
  data: unknown
): Promise<void> {
  await writeDataFile(
    fileName,
    JSON.stringify(data, null, 2)
  );
}

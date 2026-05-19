// server/src/services/tasks/taskPersistence.ts

import fs from "node:fs/promises";
import path from "node:path";

import {
  dataDir,
} from "../../paths.js";

import type {
  SavedTrainTask,
} from "../../../../common/src/task.js";

const tasksFilePath =
  path.resolve(dataDir, "tasks.json");

export async function ensureTaskStorage(): Promise<void> {
  await fs.mkdir(
    path.dirname(tasksFilePath),
    {
      recursive: true,
    }
  );
}

export async function writeSavedTrainTasks(
  tasks: readonly SavedTrainTask[]
): Promise<void> {
  await ensureTaskStorage();

  await fs.writeFile(
    tasksFilePath,
    JSON.stringify(tasks, null, 2),
    "utf8"
  );
}

export async function readSavedTrainTaskEntries(): Promise<unknown[]> {
  await ensureTaskStorage();

  try {
    const raw =
      await fs.readFile(
        tasksFilePath,
        "utf8"
      );

    const parsed =
      JSON.parse(raw) as unknown;

    return Array.isArray(parsed)
      ? parsed
      : (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray(
          (parsed as {
            tasks?: unknown;
          }).tasks
        )
      )
        ? (
          parsed as {
            tasks: unknown[];
          }
        ).tasks
        : [];
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
        error !== null &&
        "code" in error
        ? String(
          (
            error as {
              code?: unknown;
            }
          ).code
        )
        : "";

    if (code !== "ENOENT") {
      console.error(
        "[TaskRuntimeStore] Failed to read tasks.json:",
        error
      );
    }

    return [];
  }
}

export function normalizeSavedTrainTask(
  raw: unknown
): SavedTrainTask | null {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return null;
  }

  const item =
    raw as Record<string, unknown>;

  const id =
    typeof item.id === "string"
      ? item.id
      : "";

  const name =
    typeof item.name === "string"
      ? item.name
      : "";

  const targetSpeed =
    typeof item.targetSpeed === "number"
      ? item.targetSpeed
      : Number.NaN;

  const fromBlockId =
    typeof item.fromBlockId === "string"
      ? item.fromBlockId
      : "";

  const toBlockId =
    typeof item.toBlockId === "string"
      ? item.toBlockId
      : "";

  const createdAt =
    typeof item.createdAt === "number"
      ? item.createdAt
      : Date.now();

  if (
    !id ||
    !name ||
    !Number.isFinite(targetSpeed) ||
    targetSpeed < 0 ||
    !fromBlockId ||
    !toBlockId
  ) {
    return null;
  }

  return {
    id,
    name,
    targetSpeed,
    fromBlockId,
    toBlockId,
    createdAt,
  };
}

// client/src/api/fileWsApi.ts

import type {
  FileCommandAction,
} from "../../../common/src/clientWsCommands";

import {
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

async function sendFileCommand(
  action: FileCommandAction,
  fileName: string,
  payload: {
    content?: string;
    data?: unknown;
  } = {}
) {
  const requestId = generateId();

  const response = await wsApi.request(
    "fileCommand",
    {
      requestId,
      action,
      fileName,
      ...(payload.content !== undefined
        ? { content: payload.content }
        : {}),
      ...(payload.data !== undefined
        ? { data: payload.data }
        : {}),
    },
    "fileResponse",
    data => data.requestId === requestId
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "File WebSocket command failed."
    );
  }

  return response;
}

export async function readTextFileWs(
  fileName: string
): Promise<string> {
  const response = await sendFileCommand(
    "readText",
    fileName
  );

  return response.content ?? "";
}

export async function writeTextFileWs(
  fileName: string,
  content: string
): Promise<void> {
  await sendFileCommand(
    "writeText",
    fileName,
    { content }
  );
}

export async function readJsonFileWs<T = unknown>(
  fileName: string
): Promise<T> {
  const response = await sendFileCommand(
    "readJson",
    fileName
  );

  return response.data as T;
}

export async function writeJsonFileWs(
  fileName: string,
  data: unknown
): Promise<void> {
  await sendFileCommand(
    "writeJson",
    fileName,
    { data }
  );
}

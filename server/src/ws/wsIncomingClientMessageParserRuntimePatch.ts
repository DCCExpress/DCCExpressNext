// server/src/ws/wsIncomingClientMessageParserRuntimePatch.ts

import type {
  ClientWsMessageUnion,
} from "../../../common/src/types.js";

import {
  parseIncomingClientWsMessage,
  type IncomingClientWsMessageParseResult,
} from "./wsIncomingClientMessageParser.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSignalLogicRuntimeAction(value: unknown): value is "state" | "start" | "stop" {
  return value === "state" || value === "start" || value === "stop";
}

export function parseIncomingClientWsMessageWithRuntimeActions(
  rawText: string
): IncomingClientWsMessageParseResult {
  const baseResult = parseIncomingClientWsMessage(rawText);

  if (baseResult.ok) {
    return baseResult;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return baseResult;
  }

  if (!isRecord(parsed)) {
    return baseResult;
  }

  if (parsed.type !== "signalLogicCommand") {
    return baseResult;
  }

  if (typeof parsed.uuid !== "string" || parsed.uuid.trim().length === 0) {
    return baseResult;
  }

  if (!isRecord(parsed.data)) {
    return baseResult;
  }

  if (typeof parsed.data.requestId !== "string" || parsed.data.requestId.trim().length === 0) {
    return baseResult;
  }

  if (!isSignalLogicRuntimeAction(parsed.data.action)) {
    return baseResult;
  }

  return {
    ok: true,
    message: {
      type: "signalLogicCommand",
      uuid: parsed.uuid,
      data: {
        requestId: parsed.data.requestId,
        action: parsed.data.action,
      },
    } as ClientWsMessageUnion,
  };
}

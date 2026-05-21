// server/src/ws/wsIncomingClientMessageParser.ts

import type {
  ClientWsMessageType,
  ClientWsMessageUnion,
  ClientWsPayloadMap,
  Direction,
  ReservationOwnerType,
  ScriptRunSource,
} from "../../../common/src/types.js";

import {
  isClientWsMessageType,
  isRuntimeVariableKey,
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

type PayloadParseResult<TType extends ClientWsMessageType> =
  | {
    ok: true;
    data: ClientWsPayloadMap[TType];
  }
  | {
    ok: false;
    reason: string;
  };

type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is UnknownRecord {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isDirection(
  value: unknown
): value is Direction {
  return (
    value === "forward" ||
    value === "reverse"
  );
}

function isScriptRunSource(
  value: unknown
): value is ScriptRunSource {
  return (
    value === "property-panel" ||
    value === "route-button" ||
    value === "control-panel" ||
    value === "auto-start" ||
    value === "unknown"
  );
}

function invalidPayload(
  type: ClientWsMessageType,
  detail: string
): {
  ok: false;
  reason: string;
} {
  return {
    ok: false,
    reason: `Invalid ${type} payload: ${detail}`,
  };
}

function isReservationOwnerType(
  value: unknown
): value is ReservationOwnerType {
  return (
    value === "task" ||
    value === "client" ||
    value === "system"
  );
}

function parseEmptyPayload<
  TType extends ClientWsMessageType
>(
  type: TType,
  data: unknown
): PayloadParseResult<TType> {
  if (
    data !== undefined &&
    !isRecord(data)
  ) {
    return invalidPayload(
      type,
      "data must be an object when present."
    );
  }

  return {
    ok: true,
    data: {} as ClientWsPayloadMap[TType],
  };
}

function parsePayload<
  TType extends ClientWsMessageType
>(
  type: TType,
  data: unknown
): PayloadParseResult<TType> {
  switch (type) {
    case "setTrackPower": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.on !== "boolean") {
        return invalidPayload(type, "on must be boolean.");
      }

      return {
        ok: true,
        data: {
          on: data.on,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "setProgrammingPower": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.on !== "boolean") {
        return invalidPayload(type, "on must be boolean.");
      }

      return {
        ok: true,
        data: {
          on: data.on,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "emergencyStop":
    case "setBlocksReset":
    case "getBlocks":
    case "routeLock":
    case "routeUnlock":
    case "clearAllRouteReservations":
    case "getRouteReservations":
    case "stopScript":
    case "getScriptRuntimeState":
    case "finishAllTasks":
    case "abortAllTasks":
    case "getTaskRuntimeState":
    case "getRuntimeVariables":
      return parseEmptyPayload(type, data);

    case "writeDccExDirectCommand": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.command !== "string") {
        return invalidPayload(type, "command must be string.");
      }

      return {
        ok: true,
        data: {
          command: data.command,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "setLoco": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.locoAddress !== "number") {
        return invalidPayload(type, "locoAddress must be number.");
      }

      if (typeof data.speed !== "number") {
        return invalidPayload(type, "speed must be number.");
      }

      if (!isDirection(data.direction)) {
        return invalidPayload(
          type,
          "direction must be forward or reverse."
        );
      }

      return {
        ok: true,
        data: {
          locoAddress: data.locoAddress,
          speed: data.speed,
          direction: data.direction,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "getLoco": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.locoAddress !== "number") {
        return invalidPayload(type, "locoAddress must be number.");
      }

      return {
        ok: true,
        data: {
          locoAddress: data.locoAddress,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "setLocoFunction": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.locoAddress !== "number") {
        return invalidPayload(type, "locoAddress must be number.");
      }

      if (typeof data.functionNumber !== "number") {
        return invalidPayload(type, "functionNumber must be number.");
      }

      if (typeof data.active !== "boolean") {
        return invalidPayload(type, "active must be boolean.");
      }

      return {
        ok: true,
        data: {
          locoAddress: data.locoAddress,
          functionNumber: data.functionNumber,
          active: data.active,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "reserveLoco": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.locoAddress !== "number") {
        return invalidPayload(type, "locoAddress must be number.");
      }

      if (typeof data.ownerId !== "string") {
        return invalidPayload(type, "ownerId must be string.");
      }

      if (!isReservationOwnerType(data.ownerType)) {
        return invalidPayload(
          type,
          "ownerType must be task, client or system."
        );
      }

      if (
        data.ownerName !== undefined &&
        typeof data.ownerName !== "string"
      ) {
        return invalidPayload(type, "ownerName must be string when present.");
      }

      if (
        data.reason !== undefined &&
        typeof data.reason !== "string"
      ) {
        return invalidPayload(type, "reason must be string when present.");
      }

      return {
        ok: true,
        data: {
          locoAddress: data.locoAddress,
          ownerId: data.ownerId,
          ownerType: data.ownerType,
          ...(typeof data.ownerName === "string"
            ? { ownerName: data.ownerName }
            : {}),
          ...(typeof data.reason === "string"
            ? { reason: data.reason }
            : {}),
        } as ClientWsPayloadMap[TType],
      };
    }

    case "releaseLocoReservation": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.locoAddress !== "number") {
        return invalidPayload(type, "locoAddress must be number.");
      }

      if (typeof data.ownerId !== "string") {
        return invalidPayload(type, "ownerId must be string.");
      }

      return {
        ok: true,
        data: {
          locoAddress: data.locoAddress,
          ownerId: data.ownerId,
        } as ClientWsPayloadMap[TType],
      };
    }
    case "setTurnout": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.address !== "number") {
        return invalidPayload(type, "address must be number.");
      }

      if (typeof data.closed !== "boolean") {
        return invalidPayload(type, "closed must be boolean.");
      }

      return {
        ok: true,
        data: {
          address: data.address,
          closed: data.closed,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "setSensor": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.address !== "number") {
        return invalidPayload(type, "address must be number.");
      }

      if (typeof data.on !== "boolean") {
        return invalidPayload(type, "on must be boolean.");
      }

      return {
        ok: true,
        data: {
          address: data.address,
          on: data.on,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "setBasicAccessory": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.address !== "number") {
        return invalidPayload(type, "address must be number.");
      }

      if (typeof data.active !== "boolean") {
        return invalidPayload(type, "active must be boolean.");
      }

      return {
        ok: true,
        data: {
          address: data.address,
          active: data.active,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "setBlock":
    case "setBlockRemove": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.blockId !== "string") {
        return invalidPayload(type, "blockId must be string.");
      }

      if (
        data.locoId !== null &&
        typeof data.locoId !== "string"
      ) {
        return invalidPayload(
          type,
          "locoId must be string or null."
        );
      }

      return {
        ok: true,
        data: {
          blockId: data.blockId,
          locoId: data.locoId,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "reserveRoute":
    case "releaseRouteReservation": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.fromBlockName !== "string") {
        return invalidPayload(type, "fromBlockName must be string.");
      }

      if (typeof data.toBlockName !== "string") {
        return invalidPayload(type, "toBlockName must be string.");
      }

      return {
        ok: true,
        data: {
          fromBlockName: data.fromBlockName,
          toBlockName: data.toBlockName,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "runScript": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (
        data.script !== undefined &&
        typeof data.script !== "string"
      ) {
        return invalidPayload(type, "script must be string when present.");
      }

      if (!isScriptRunSource(data.source)) {
        return invalidPayload(
          type,
          "source must be a supported ScriptRunSource."
        );
      }

      if (
        data.elementId !== null &&
        typeof data.elementId !== "string"
      ) {
        return invalidPayload(
          type,
          "elementId must be string or null."
        );
      }

      return {
        ok: true,
        data: {
          ...(typeof data.script === "string"
            ? {
              script: data.script,
            }
            : {}),
          source: data.source,
          elementId: data.elementId,
        } as ClientWsPayloadMap[TType],
      };
    }

    case "startTask":
    case "finishTask":
    case "abortTask":
    case "pauseTask":
    case "resumeTask": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (typeof data.taskIdOrName !== "string") {
        return invalidPayload(type, "taskIdOrName must be string.");
      }

      return {
        ok: true,
        data: {
          taskIdOrName: data.taskIdOrName,
        } as ClientWsPayloadMap[TType],
      };
    }
    case "setRuntimeVariable": {
      if (!isRecord(data)) {
        return invalidPayload(type, "data must be an object.");
      }

      if (!isRuntimeVariableKey(data.key)) {
        return invalidPayload(type, "key must be a known runtime variable.");
      }

      if (
        data.key === "editor.editMode" &&
        typeof data.value !== "boolean"
      ) {
        return invalidPayload(type, "editor.editMode value must be boolean.");
      }

      return {
        ok: true,
        data: {
          key: data.key,
          value: data.value,
        } as ClientWsPayloadMap[TType],
      };
    }



    default:
      return invalidPayload(
        type,
        "no parser exists for this message type."
      );
  }
}

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

  if (!isRecord(parsed)) {
    return {
      ok: false,
      reason: "WebSocket message must be an object.",
    };
  }

  if (!isClientWsMessageType(parsed.type)) {
    return {
      ok: false,
      reason: "Unknown WebSocket message type.",
    };
  }

  if (
    typeof parsed.uuid !== "string" ||
    parsed.uuid.trim().length === 0
  ) {
    return {
      ok: false,
      reason: "WebSocket message UUID is missing or invalid.",
    };
  }

  const payloadResult =
    parsePayload(
      parsed.type,
      parsed.data
    );

  if (!payloadResult.ok) {
    return payloadResult;
  }

  return {
    ok: true,
    message: {
      type: parsed.type,
      data: payloadResult.data,
      uuid: parsed.uuid,
    } as ClientWsMessageUnion,
  };
}

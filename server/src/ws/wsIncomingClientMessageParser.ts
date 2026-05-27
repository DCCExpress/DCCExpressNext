// server/src/ws/wsIncomingClientMessageParser.ts

import type {
  AppSettingsCommandAction,
  AutomationCommandAction,
  BlockAutomationCommandAction,
  ClientWsMessageType,
  ClientWsMessageUnion,
  ClientWsPayloadMap,
  CommandCenterConfigCommandAction,
  Direction,
  FastClockCommandAction,
  FileCommandAction,
  LayoutCommandAction,
  LevelCrossingCommandAction,
  LocosCommandAction,
  ReservationOwnerType,
  ScriptDocumentCommandAction,
  ScriptRunSource,
  SignalLogicCommandAction,
  TaskManagerCommandAction,
} from "../../../common/src/types.js";

import {
  isClientWsMessageType,
  isRuntimeVariableKey,
} from "../../../common/src/types.js";

export type IncomingClientWsMessageParseResult =
  | { ok: true; message: ClientWsMessageUnion }
  | { ok: false; reason: string };

type PayloadParseResult<TType extends ClientWsMessageType> =
  | { ok: true; data: ClientWsPayloadMap[TType] }
  | { ok: false; reason: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function ok<TType extends ClientWsMessageType>(
  data: unknown
): PayloadParseResult<TType> {
  return {
    ok: true,
    data: data as ClientWsPayloadMap[TType],
  };
}

function isDirection(value: unknown): value is Direction {
  return value === "forward" || value === "reverse";
}

function isReservationOwnerType(value: unknown): value is ReservationOwnerType {
  return value === "task" || value === "client" || value === "system";
}

function isScriptRunSource(value: unknown): value is ScriptRunSource {
  return (
    value === "property-panel" ||
    value === "route-button" ||
    value === "control-panel" ||
    value === "auto-start" ||
    value === "unknown"
  );
}

function isLayoutCommandAction(value: unknown): value is LayoutCommandAction {
  return value === "load" || value === "save" || value === "refreshRuntime" || value === "getRouteGraph";
}

function isLocosCommandAction(value: unknown): value is LocosCommandAction {
  return value === "load" || value === "save";
}

function isScriptDocumentCommandAction(value: unknown): value is ScriptDocumentCommandAction {
  return value === "load" || value === "save";
}

function isCommandCenterConfigCommandAction(value: unknown): value is CommandCenterConfigCommandAction {
  return value === "load" || value === "save";
}

function isAppSettingsCommandAction(value: unknown): value is AppSettingsCommandAction {
  return value === "load" || value === "save";
}

function isSignalLogicCommandAction(value: unknown): value is SignalLogicCommandAction {
  return (
    value === "load" ||
    value === "save" ||
    value === "start" ||
    value === "stop" ||
    value === "state" ||
    value === "integrityCheck" ||
    value === "deleteOrphanSignals"
  );
}

function isBlockAutomationCommandAction(value: unknown): value is BlockAutomationCommandAction {
  return (
    value === "load" ||
    value === "save" ||
    value === "integrityCheck" ||
    value === "deleteOrphanBlocks"
  );
}

function isLevelCrossingCommandAction(value: unknown): value is LevelCrossingCommandAction {
  return (
    value === "load" ||
    value === "save" ||
    value === "start" ||
    value === "stop" ||
    value === "snapshot" ||
    value === "evaluateOnce"
  );
}

function isAutomationCommandAction(value: unknown): value is AutomationCommandAction {
  return (
    value === "snapshot" ||
    value === "start" ||
    value === "stop" ||
    value === "evaluateOnce"
  );
}

function isTaskManagerCommandAction(value: unknown): value is TaskManagerCommandAction {
  return (
    value === "snapshot" ||
    value === "add" ||
    value === "update" ||
    value === "delete" ||
    value === "save" ||
    value === "reload" ||
    value === "start" ||
    value === "pause" ||
    value === "resume" ||
    value === "finish" ||
    value === "abort" ||
    value === "startAll" ||
    value === "pauseAll" ||
    value === "finishAll" ||
    value === "abortAll"
  );
}

function isFastClockCommandAction(value: unknown): value is FastClockCommandAction {
  return value === "snapshot" || value === "run" || value === "pause" || value === "reset" || value === "setSpeed";
}

function isFileCommandAction(value: unknown): value is FileCommandAction {
  return value === "readText" || value === "writeText" || value === "readJson" || value === "writeJson";
}

function invalidPayload(type: ClientWsMessageType, detail: string): { ok: false; reason: string } {
  return { ok: false, reason: `Invalid ${type} payload: ${detail}` };
}

function parseEmptyPayload<TType extends ClientWsMessageType>(
  type: TType,
  data: unknown
): PayloadParseResult<TType> {
  if (data !== undefined && !isRecord(data)) {
    return invalidPayload(type, "data must be an object when present.");
  }

  return ok<TType>({});
}

function parseRequestCommandBase<TType extends ClientWsMessageType>(
  type: TType,
  data: unknown
): { ok: true; data: UnknownRecord & { requestId: string; action: unknown } } | { ok: false; reason: string } {
  if (!isRecord(data)) {
    return invalidPayload(type, "data must be an object.");
  }

  if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) {
    return invalidPayload(type, "requestId must be string.");
  }

  return {
    ok: true,
    data: data as UnknownRecord & { requestId: string; action: unknown },
  };
}

function parseTaskManagerCommand<TType extends ClientWsMessageType>(
  type: TType,
  data: unknown
): PayloadParseResult<TType> {
  const base = parseRequestCommandBase(type, data);

  if (!base.ok) {
    return base;
  }

  const input = base.data;

  if (input.action === "testLocoActionList") {
    if (typeof input.locoId !== "string" || input.locoId.trim().length === 0) {
      return invalidPayload(type, "locoId must be string.");
    }

    if (
      input.hook !== "beforeStart" &&
      input.hook !== "afterStart" &&
      input.hook !== "beforeStop" &&
      input.hook !== "afterStop"
    ) {
      return invalidPayload(type, "hook is invalid.");
    }

    return ok<TType>({
      requestId: input.requestId,
      action: input.action,
      locoId: input.locoId,
      hook: input.hook,
    });
  }

  if (input.action === "testBlockActionList") {
    if (typeof input.blockId !== "string" || input.blockId.trim().length === 0) {
      return invalidPayload(type, "blockId must be string.");
    }

    if (input.hook !== "onTrainEnter" && input.hook !== "onTrainLeave") {
      return invalidPayload(type, "hook is invalid.");
    }

    if (!Array.isArray(input.actions)) {
      return invalidPayload(type, "actions must be an array.");
    }

    if (input.blockName !== undefined && typeof input.blockName !== "string") {
      return invalidPayload(type, "blockName must be string when present.");
    }

    return ok<TType>({
      requestId: input.requestId,
      action: input.action,
      blockId: input.blockId,
      hook: input.hook,
      actions: input.actions,
      ...(typeof input.blockName === "string" ? { blockName: input.blockName } : {}),
    });
  }

  if (!isTaskManagerCommandAction(input.action)) {
    return invalidPayload(type, "action is invalid.");
  }

  if (
    (
      input.action === "update" ||
      input.action === "delete" ||
      input.action === "start" ||
      input.action === "pause" ||
      input.action === "resume" ||
      input.action === "finish" ||
      input.action === "abort"
    ) &&
    typeof input.taskId !== "string"
  ) {
    return invalidPayload(type, "taskId must be string for this action.");
  }

  if ((input.action === "add" || input.action === "update") && !isRecord(input.input)) {
    return invalidPayload(type, "input must be an object for add and update.");
  }

  return ok<TType>({
    requestId: input.requestId,
    action: input.action,
    ...(typeof input.taskId === "string" ? { taskId: input.taskId } : {}),
    ...(isRecord(input.input) ? { input: input.input } : {}),
  });
}

function parsePayload<TType extends ClientWsMessageType>(
  type: TType,
  data: unknown
): PayloadParseResult<TType> {
  switch (type) {
    case "setTrackPower":
    case "setProgrammingPower": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.on !== "boolean") return invalidPayload(type, "on must be boolean.");
      return ok<TType>({ on: data.on });
    }

    case "emergencyStop":
    case "setBlocksReset":
    case "getBlocks":
    case "getLayoutRuntimeSnapshot":
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
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.command !== "string") return invalidPayload(type, "command must be string.");
      return ok<TType>({ command: data.command });
    }

    case "setLoco": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.speed !== "number") return invalidPayload(type, "speed must be number.");
      if (!isDirection(data.direction)) return invalidPayload(type, "direction must be forward or reverse.");
      return ok<TType>({
        locoAddress: data.locoAddress,
        speed: data.speed,
        direction: data.direction,
      });
    }

    case "getLoco": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      return ok<TType>({ locoAddress: data.locoAddress });
    }

    case "setLocoFunction": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.functionNumber !== "number") return invalidPayload(type, "functionNumber must be number.");
      if (typeof data.active !== "boolean") return invalidPayload(type, "active must be boolean.");
      return ok<TType>({
        locoAddress: data.locoAddress,
        functionNumber: data.functionNumber,
        active: data.active,
      });
    }

    case "reserveLoco": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.ownerId !== "string") return invalidPayload(type, "ownerId must be string.");
      if (!isReservationOwnerType(data.ownerType)) return invalidPayload(type, "ownerType must be task, client or system.");
      if (data.ownerName !== undefined && typeof data.ownerName !== "string") return invalidPayload(type, "ownerName must be string when present.");
      if (data.reason !== undefined && typeof data.reason !== "string") return invalidPayload(type, "reason must be string when present.");
      return ok<TType>({
        locoAddress: data.locoAddress,
        ownerId: data.ownerId,
        ownerType: data.ownerType,
        ...(typeof data.ownerName === "string" ? { ownerName: data.ownerName } : {}),
        ...(typeof data.reason === "string" ? { reason: data.reason } : {}),
      });
    }

    case "releaseLocoReservation": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.ownerId !== "string") return invalidPayload(type, "ownerId must be string.");
      return ok<TType>({ locoAddress: data.locoAddress, ownerId: data.ownerId });
    }

    case "setTurnout": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.address !== "number") return invalidPayload(type, "address must be number.");
      if (typeof data.closed !== "boolean") return invalidPayload(type, "closed must be boolean.");
      return ok<TType>({ address: data.address, closed: data.closed });
    }

    case "setSensor": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.address !== "number") return invalidPayload(type, "address must be number.");
      if (typeof data.on !== "boolean") return invalidPayload(type, "on must be boolean.");
      return ok<TType>({ address: data.address, on: data.on });
    }

    case "setBasicAccessory": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.address !== "number") return invalidPayload(type, "address must be number.");
      if (typeof data.active !== "boolean") return invalidPayload(type, "active must be boolean.");
      return ok<TType>({ address: data.address, active: data.active });
    }

    case "setBlock":
    case "setBlockRemove": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.blockId !== "string") return invalidPayload(type, "blockId must be string.");
      if (data.locoId !== null && typeof data.locoId !== "string") {
        return invalidPayload(type, "locoId must be string or null.");
      }
      return ok<TType>({ blockId: data.blockId, locoId: data.locoId });
    }

    case "reserveRoute":
    case "releaseRouteReservation": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.fromBlockName !== "string") return invalidPayload(type, "fromBlockName must be string.");
      if (typeof data.toBlockName !== "string") return invalidPayload(type, "toBlockName must be string.");
      return ok<TType>({
        fromBlockName: data.fromBlockName,
        toBlockName: data.toBlockName,
      });
    }

    case "layoutCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isLayoutCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if ((base.data.action === "save" || base.data.action === "refreshRuntime") && !isRecord(base.data.layout)) {
        return invalidPayload(type, "layout must be an object for save and refreshRuntime.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(isRecord(base.data.layout) ? { layout: base.data.layout } : {}),
      });
    }

    case "locosCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isLocosCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (base.data.action === "save" && !Array.isArray(base.data.locos)) {
        return invalidPayload(type, "locos must be an array for save.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(Array.isArray(base.data.locos) ? { locos: base.data.locos } : {}),
      });
    }

    case "scriptDocumentCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isScriptDocumentCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (base.data.action === "save" && !isRecord(base.data.document)) {
        return invalidPayload(type, "document must be an object for save.");
      }
      if (isRecord(base.data.document)) {
        if (base.data.document.content !== undefined && typeof base.data.document.content !== "string") {
          return invalidPayload(type, "document.content must be string when present.");
        }
        if (base.data.document.autoStart !== undefined && typeof base.data.document.autoStart !== "boolean") {
          return invalidPayload(type, "document.autoStart must be boolean when present.");
        }
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(isRecord(base.data.document) ? { document: base.data.document } : {}),
      });
    }

    case "commandCenterConfigCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isCommandCenterConfigCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (base.data.action === "save" && !isRecord(base.data.config)) {
        return invalidPayload(type, "config must be an object for save.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(isRecord(base.data.config) ? { config: base.data.config } : {}),
      });
    }

    case "appSettingsCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isAppSettingsCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (base.data.action === "save" && !isRecord(base.data.settings)) {
        return invalidPayload(type, "settings must be an object for save.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(isRecord(base.data.settings) ? { settings: base.data.settings } : {}),
      });
    }

    case "signalLogicCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isSignalLogicCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (base.data.action === "save" && !isRecord(base.data.document)) {
        return invalidPayload(type, "document must be an object for save.");
      }
      if (base.data.action === "deleteOrphanSignals" && !Array.isArray(base.data.signalAddresses)) {
        return invalidPayload(type, "signalAddresses must be an array for deleteOrphanSignals.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(isRecord(base.data.document) ? { document: base.data.document } : {}),
        ...(Array.isArray(base.data.signalAddresses)
          ? {
              signalAddresses: base.data.signalAddresses.filter(
                (address): address is number => typeof address === "number"
              ),
            }
          : {}),
      });
    }

    case "blockAutomationCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isBlockAutomationCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (base.data.action === "save" && !isRecord(base.data.document)) {
        return invalidPayload(type, "document must be an object for save.");
      }
      if (base.data.action === "deleteOrphanBlocks" && !Array.isArray(base.data.blockIds)) {
        return invalidPayload(type, "blockIds must be an array for deleteOrphanBlocks.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(isRecord(base.data.document) ? { document: base.data.document } : {}),
        ...(Array.isArray(base.data.blockIds)
          ? {
              blockIds: base.data.blockIds.filter(
                (blockId): blockId is string => typeof blockId === "string"
              ),
            }
          : {}),
      });
    }

    case "levelCrossingCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isLevelCrossingCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (base.data.action === "save" && !isRecord(base.data.document)) {
        return invalidPayload(type, "document must be an object for save.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(isRecord(base.data.document) ? { document: base.data.document } : {}),
      });
    }

    case "automationCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isAutomationCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
      });
    }

    case "taskManagerCommand":
      return parseTaskManagerCommand(type, data);

    case "fastClockCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isFastClockCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (
        base.data.action === "setSpeed" &&
        (
          typeof base.data.speed !== "number" ||
          !Number.isFinite(base.data.speed) ||
          base.data.speed < 1
        )
      ) {
        return invalidPayload(type, "speed must be a number greater than or equal to 1.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        ...(typeof base.data.speed === "number" ? { speed: base.data.speed } : {}),
      });
    }

    case "fileCommand": {
      const base = parseRequestCommandBase(type, data);
      if (!base.ok) return base;
      if (!isFileCommandAction(base.data.action)) return invalidPayload(type, "action is invalid.");
      if (typeof base.data.fileName !== "string" || base.data.fileName.trim().length === 0) {
        return invalidPayload(type, "fileName must be string.");
      }
      if (base.data.action === "writeText" && typeof base.data.content !== "string") {
        return invalidPayload(type, "content must be string for writeText.");
      }
      return ok<TType>({
        requestId: base.data.requestId,
        action: base.data.action,
        fileName: base.data.fileName,
        ...(typeof base.data.content === "string" ? { content: base.data.content } : {}),
        ...(base.data.data !== undefined ? { data: base.data.data } : {}),
      });
    }

    case "runScript": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (data.script !== undefined && typeof data.script !== "string") {
        return invalidPayload(type, "script must be string when present.");
      }
      if (!isScriptRunSource(data.source)) {
        return invalidPayload(type, "source must be a supported ScriptRunSource.");
      }
      if (data.elementId !== null && typeof data.elementId !== "string") {
        return invalidPayload(type, "elementId must be string or null.");
      }
      return ok<TType>({
        ...(typeof data.script === "string" ? { script: data.script } : {}),
        source: data.source,
        elementId: data.elementId,
      });
    }

    case "startTask":
    case "finishTask":
    case "abortTask":
    case "pauseTask":
    case "resumeTask": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.taskIdOrName !== "string") {
        return invalidPayload(type, "taskIdOrName must be string.");
      }
      return ok<TType>({ taskIdOrName: data.taskIdOrName });
    }

    case "setRuntimeVariable": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (!isRuntimeVariableKey(data.key)) {
        return invalidPayload(type, "key must be a known runtime variable.");
      }
      if (data.key === "editor.editMode" && typeof data.value !== "boolean") {
        return invalidPayload(type, "editor.editMode value must be boolean.");
      }
      return ok<TType>({ key: data.key, value: data.value });
    }

    case "setEditorEditMode": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.editMode !== "boolean") return invalidPayload(type, "editMode must be boolean.");
      return ok<TType>({ editMode: data.editMode });
    }

    default:
      return invalidPayload(type, "no parser exists for this message type.");
  }
}

export function parseIncomingClientWsMessage(rawText: string): IncomingClientWsMessageParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, reason: "Invalid JSON payload." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: "WebSocket message must be an object." };
  }

  if (!isClientWsMessageType(parsed.type)) {
    return { ok: false, reason: "Unknown WebSocket message type." };
  }

  if (typeof parsed.uuid !== "string" || parsed.uuid.trim().length === 0) {
    return { ok: false, reason: "WebSocket message UUID is missing or invalid." };
  }

  const payloadResult = parsePayload(parsed.type, parsed.data);

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

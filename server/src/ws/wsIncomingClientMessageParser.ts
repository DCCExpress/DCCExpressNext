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

function isDirection(value: unknown): value is Direction {
  return value === "forward" || value === "reverse";
}

function isReservationOwnerType(value: unknown): value is ReservationOwnerType {
  return value === "task" || value === "client" || value === "system";
}

function isScriptRunSource(value: unknown): value is ScriptRunSource {
  return value === "property-panel" || value === "route-button" || value === "control-panel" || value === "auto-start" || value === "unknown";
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
    value === "snapshot" || value === "add" || value === "update" || value === "delete" ||
    value === "save" || value === "reload" || value === "start" || value === "pause" ||
    value === "resume" || value === "finish" || value === "abort" || value === "startAll" ||
    value === "pauseAll" || value === "finishAll" || value === "abortAll"
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

function parseEmptyPayload<TType extends ClientWsMessageType>(type: TType, data: unknown): PayloadParseResult<TType> {
  if (data !== undefined && !isRecord(data)) return invalidPayload(type, "data must be an object when present.");
  return { ok: true, data: {} as ClientWsPayloadMap[TType] };
}

function parseTaskManagerCommand<TType extends ClientWsMessageType>(type: TType, data: unknown): PayloadParseResult<TType> {
  if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
  if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");

  if (data.action === "testLocoActionList") {
    if (typeof data.locoId !== "string" || data.locoId.trim().length === 0) return invalidPayload(type, "locoId must be string.");
    if (data.hook !== "beforeStart" && data.hook !== "afterStart" && data.hook !== "beforeStop" && data.hook !== "afterStop") return invalidPayload(type, "hook is invalid.");

    return {
      ok: true,
      data: {
        requestId: data.requestId,
        action: data.action,
        locoId: data.locoId,
        hook: data.hook,
      } as unknown as ClientWsPayloadMap<TType>,
    };
  }

  if (data.action === "testBlockActionList") {
    if (typeof data.blockId !== "string" || data.blockId.trim().length === 0) return invalidPayload(type, "blockId must be string.");
    if (data.hook !== "onTrainEnter" && data.hook !== "onTrainLeave") return invalidPayload(type, "hook is invalid.");
    if (!Array.isArray(data.actions)) return invalidPayload(type, "actions must be an array.");
    if (data.blockName !== undefined && typeof data.blockName !== "string") return invalidPayload(type, "blockName must be string when present.");

    return {
      ok: true,
      data: {
        requestId: data.requestId,
        action: data.action,
        blockId: data.blockId,
        hook: data.hook,
        actions: data.actions,
        ...(typeof data.blockName === "string" ? { blockName: data.blockName } : {}),
      } as unknown as ClientWsPayloadMap<TType>,
    };
  }

  if (!isTaskManagerCommandAction(data.action)) return invalidPayload(type, "action is invalid.");

  if ((data.action === "update" || data.action === "delete" || data.action === "start" || data.action === "pause" || data.action === "resume" || data.action === "finish" || data.action === "abort") && typeof data.taskId !== "string") {
    return invalidPayload(type, "taskId must be string for this action.");
  }

  if ((data.action === "add" || data.action === "update") && !isRecord(data.input)) {
    return invalidPayload(type, "input must be an object for add and update.");
  }

  return {
    ok: true,
    data: {
      requestId: data.requestId,
      action: data.action,
      ...(typeof data.taskId === "string" ? { taskId: data.taskId } : {}),
      ...(isRecord(data.input) ? { input: data.input } : {}),
    } as ClientWsPayloadMap<TType>,
  };
}

function parsePayload<TType extends ClientWsMessageType>(type: TType, data: unknown): PayloadParseResult<TType> {
  switch (type) {
    case "setTrackPower":
    case "setProgrammingPower": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.on !== "boolean") return invalidPayload(type, "on must be boolean.");
      return { ok: true, data: { on: data.on } as ClientWsPayloadMap<TType> };
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
      return { ok: true, data: { command: data.command } as ClientWsPayloadMap<TType> };
    }

    case "setLoco": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.speed !== "number") return invalidPayload(type, "speed must be number.");
      if (!isDirection(data.direction)) return invalidPayload(type, "direction must be forward or reverse.");
      return { ok: true, data: { locoAddress: data.locoAddress, speed: data.speed, direction: data.direction } as ClientWsPayloadMap<TType> };
    }

    case "getLoco": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      return { ok: true, data: { locoAddress: data.locoAddress } as ClientWsPayloadMap<TType> };
    }

    case "setLocoFunction": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.functionNumber !== "number") return invalidPayload(type, "functionNumber must be number.");
      if (typeof data.active !== "boolean") return invalidPayload(type, "active must be boolean.");
      return { ok: true, data: { locoAddress: data.locoAddress, functionNumber: data.functionNumber, active: data.active } as ClientWsPayloadMap<TType> };
    }

    case "reserveLoco": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.ownerId !== "string") return invalidPayload(type, "ownerId must be string.");
      if (!isReservationOwnerType(data.ownerType)) return invalidPayload(type, "ownerType must be task, client or system.");
      if (data.ownerName !== undefined && typeof data.ownerName !== "string") return invalidPayload(type, "ownerName must be string when present.");
      if (data.reason !== undefined && typeof data.reason !== "string") return invalidPayload(type, "reason must be string when present.");
      return { ok: true, data: { locoAddress: data.locoAddress, ownerId: data.ownerId, ownerType: data.ownerType, ...(typeof data.ownerName === "string" ? { ownerName: data.ownerName } : {}), ...(typeof data.reason === "string" ? { reason: data.reason } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "releaseLocoReservation": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.locoAddress !== "number") return invalidPayload(type, "locoAddress must be number.");
      if (typeof data.ownerId !== "string") return invalidPayload(type, "ownerId must be string.");
      return { ok: true, data: { locoAddress: data.locoAddress, ownerId: data.ownerId } as ClientWsPayloadMap<TType> };
    }

    case "setTurnout": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.address !== "number") return invalidPayload(type, "address must be number.");
      if (typeof data.closed !== "boolean") return invalidPayload(type, "closed must be boolean.");
      return { ok: true, data: { address: data.address, closed: data.closed } as ClientWsPayloadMap<TType> };
    }

    case "setSensor": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.address !== "number") return invalidPayload(type, "address must be number.");
      if (typeof data.on !== "boolean") return invalidPayload(type, "on must be boolean.");
      return { ok: true, data: { address: data.address, on: data.on } as ClientWsPayloadMap<TType> };
    }

    case "setBasicAccessory": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.address !== "number") return invalidPayload(type, "address must be number.");
      if (typeof data.active !== "boolean") return invalidPayload(type, "active must be boolean.");
      return { ok: true, data: { address: data.address, active: data.active } as ClientWsPayloadMap<TType> };
    }

    case "setBlock":
    case "setBlockRemove": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.blockId !== "string") return invalidPayload(type, "blockId must be string.");
      if (data.locoId !== null && typeof data.locoId !== "string") return invalidPayload(type, "locoId must be string or null.");
      return { ok: true, data: { blockId: data.blockId, locoId: data.locoId } as ClientWsPayloadMap<TType> };
    }

    case "reserveRoute":
    case "releaseRouteReservation": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.fromBlockName !== "string") return invalidPayload(type, "fromBlockName must be string.");
      if (typeof data.toBlockName !== "string") return invalidPayload(type, "toBlockName must be string.");
      return { ok: true, data: { fromBlockName: data.fromBlockName, toBlockName: data.toBlockName } as ClientWsPayloadMap<TType> };
    }

    case "layoutCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isLayoutCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if ((data.action === "save" || data.action === "refreshRuntime") && !isRecord(data.layout)) return invalidPayload(type, "layout must be an object for save and refreshRuntime.");
      return { ok: true, data: { requestId: data.requestId, action: data.action, ...(isRecord(data.layout) ? { layout: data.layout } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "locosCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isLocosCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "save" && !Array.isArray(data.locos)) return invalidPayload(type, "locos must be an array for save.");
      return { ok: true, data: { requestId: data.requestId, action: data.action, ...(Array.isArray(data.locos) ? { locos: data.locos } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "scriptDocumentCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isScriptDocumentCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "save" && !isRecord(data.document)) return invalidPayload(type, "document must be an object for save.");
      if (isRecord(data.document)) {
        if (data.document.content !== undefined && typeof data.document.content !== "string") return invalidPayload(type, "document.content must be string when present.");
        if (data.document.autoStart !== undefined && typeof data.document.autoStart !== "boolean") return invalidPayload(type, "document.autoStart must be boolean when present.");
      }
      return { ok: true, data: { requestId: data.requestId, action: data.action, ...(isRecord(data.document) ? { document: data.document } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "commandCenterConfigCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isCommandCenterConfigCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "save" && !isRecord(data.config)) return invalidPayload(type, "config must be an object for save.");
      return { ok: true, data: { requestId: data.requestId, action: data.action, ...(isRecord(data.config) ? { config: data.config } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "appSettingsCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isAppSettingsCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "save" && !isRecord(data.settings)) return invalidPayload(type, "settings must be an object for save.");
      return { ok: true, data: { requestId: data.requestId, action: data.action, ...(isRecord(data.settings) ? { settings: data.settings } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "signalLogicCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isSignalLogicCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "save" && !isRecord(data.document)) return invalidPayload(type, "document must be an object for save.");
      if (data.action === "deleteOrphanSignals" && !Array.isArray(data.signalAddresses)) return invalidPayload(type, "signalAddresses must be an array for deleteOrphanSignals.");
      return {
        ok: true,
        data: {
          requestId: data.requestId,
          action: data.action,
          ...(isRecord(data.document) ? { document: data.document } : {}),
          ...(Array.isArray(data.signalAddresses) ? { signalAddresses: data.signalAddresses.filter((address): address is number => typeof address === "number") } : {}),
        } as ClientWsPayloadMap<TType>,
      };
    }

    case "blockAutomationCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isBlockAutomationCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "save" && !isRecord(data.document)) return invalidPayload(type, "document must be an object for save.");
      if (data.action === "deleteOrphanBlocks" && !Array.isArray(data.blockIds)) return invalidPayload(type, "blockIds must be an array for deleteOrphanBlocks.");
      return {
        ok: true,
        data: {
          requestId: data.requestId,
          action: data.action,
          ...(isRecord(data.document) ? { document: data.document } : {}),
          ...(Array.isArray(data.blockIds) ? { blockIds: data.blockIds.filter((blockId): blockId is string => typeof blockId === "string") } : {}),
        } as ClientWsPayloadMap<TType>,
      };
    }

    case "levelCrossingCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isLevelCrossingCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "save" && !isRecord(data.document)) return invalidPayload(type, "document must be an object for save.");
      return {
        ok: true,
        data: {
          requestId: data.requestId,
          action: data.action,
          ...(isRecord(data.document) ? { document: data.document } : {}),
        } as ClientWsPayloadMap<TType>,
      };
    }

    case "automationCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isAutomationCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      return {
        ok: true,
        data: {
          requestId: data.requestId,
          action: data.action,
        } as ClientWsPayloadMap<TType>,
      };
    }

    case "taskManagerCommand":
      return parseTaskManagerCommand(type, data);

    case "fastClockCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isFastClockCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (data.action === "setSpeed" && (typeof data.speed !== "number" || !Number.isFinite(data.speed) || data.speed < 1)) return invalidPayload(type, "speed must be a number greater than or equal to 1.");
      return { ok: true, data: { requestId: data.requestId, action: data.action, ...(typeof data.speed === "number" ? { speed: data.speed } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "fileCommand": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.requestId !== "string" || data.requestId.trim().length === 0) return invalidPayload(type, "requestId must be string.");
      if (!isFileCommandAction(data.action)) return invalidPayload(type, "action is invalid.");
      if (typeof data.fileName !== "string" || data.fileName.trim().length === 0) return invalidPayload(type, "fileName must be string.");
      if (data.action === "writeText" && typeof data.content !== "string") return invalidPayload(type, "content must be string for writeText.");
      return { ok: true, data: { requestId: data.requestId, action: data.action, fileName: data.fileName, ...(typeof data.content === "string" ? { content: data.content } : {}), ...(data.data !== undefined ? { data: data.data } : {}) } as ClientWsPayloadMap<TType> };
    }

    case "runScript": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (data.script !== undefined && typeof data.script !== "string") return invalidPayload(type, "script must be string when present.");
      if (!isScriptRunSource(data.source)) return invalidPayload(type, "source must be a supported ScriptRunSource.");
      if (data.elementId !== null && typeof data.elementId !== "string") return invalidPayload(type, "elementId must be string or null.");
      return { ok: true, data: { ...(typeof data.script === "string" ? { script: data.script } : {}), source: data.source, elementId: data.elementId } as ClientWsPayloadMap<TType> };
    }

    case "startTask":
    case "finishTask":
    case "abortTask":
    case "pauseTask":
    case "resumeTask": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.taskIdOrName !== "string") return invalidPayload(type, "taskIdOrName must be string.");
      return { ok: true, data: { taskIdOrName: data.taskIdOrName } as ClientWsPayloadMap<TType> };
    }

    case "setRuntimeVariable": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (!isRuntimeVariableKey(data.key)) return invalidPayload(type, "key must be a known runtime variable.");
      if (data.key === "editor.editMode" && typeof data.value !== "boolean") return invalidPayload(type, "editor.editMode value must be boolean.");
      return { ok: true, data: { key: data.key, value: data.value } as ClientWsPayloadMap<TType> };
    }

    case "setEditorEditMode": {
      if (!isRecord(data)) return invalidPayload(type, "data must be an object.");
      if (typeof data.editMode !== "boolean") return invalidPayload(type, "editMode must be boolean.");
      return { ok: true, data: { editMode: data.editMode } as ClientWsPayloadMap<TType> };
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

  if (!isRecord(parsed)) return { ok: false, reason: "WebSocket message must be an object." };
  if (!isClientWsMessageType(parsed.type)) return { ok: false, reason: "Unknown WebSocket message type." };
  if (typeof parsed.uuid !== "string" || parsed.uuid.trim().length === 0) return { ok: false, reason: "WebSocket message UUID is missing or invalid." };

  const payloadResult = parsePayload(parsed.type, parsed.data);
  if (!payloadResult.ok) return payloadResult;

  return {
    ok: true,
    message: {
      type: parsed.type,
      data: payloadResult.data,
      uuid: parsed.uuid,
    } as ClientWsMessageUnion,
  };
}

// server/src/ws/wsIncomingClientMessageParser.ts
import { isClientWsMessageType, } from "../../../common/src/types.js";
function isRecord(value) {
    return (value !== null &&
        typeof value === "object" &&
        !Array.isArray(value));
}
function isDirection(value) {
    return (value === "forward" ||
        value === "reverse");
}
function isScriptRunSource(value) {
    return (value === "property-panel" ||
        value === "route-button" ||
        value === "control-panel" ||
        value === "auto-start" ||
        value === "unknown");
}
function invalidPayload(type, detail) {
    return {
        ok: false,
        reason: `Invalid ${type} payload: ${detail}`,
    };
}
function parseEmptyPayload(type, data) {
    if (data !== undefined &&
        !isRecord(data)) {
        return invalidPayload(type, "data must be an object when present.");
    }
    return {
        ok: true,
        data: {},
    };
}
function parsePayload(type, data) {
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
                },
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
            return parseEmptyPayload(type, data);
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
                return invalidPayload(type, "direction must be forward or reverse.");
            }
            return {
                ok: true,
                data: {
                    locoAddress: data.locoAddress,
                    speed: data.speed,
                    direction: data.direction,
                },
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
                },
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
                },
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
                },
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
                },
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
                },
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
            if (data.locoId !== null &&
                typeof data.locoId !== "string") {
                return invalidPayload(type, "locoId must be string or null.");
            }
            return {
                ok: true,
                data: {
                    blockId: data.blockId,
                    locoId: data.locoId,
                },
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
                },
            };
        }
        case "runScript": {
            if (!isRecord(data)) {
                return invalidPayload(type, "data must be an object.");
            }
            if (data.script !== undefined &&
                typeof data.script !== "string") {
                return invalidPayload(type, "script must be string when present.");
            }
            if (!isScriptRunSource(data.source)) {
                return invalidPayload(type, "source must be a supported ScriptRunSource.");
            }
            if (data.elementId !== null &&
                typeof data.elementId !== "string") {
                return invalidPayload(type, "elementId must be string or null.");
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
                },
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
                },
            };
        }
        default:
            return invalidPayload(type, "no parser exists for this message type.");
    }
}
export function parseIncomingClientWsMessage(rawText) {
    let parsed;
    try {
        parsed =
            JSON.parse(rawText);
    }
    catch {
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
    if (typeof parsed.uuid !== "string" ||
        parsed.uuid.trim().length === 0) {
        return {
            ok: false,
            reason: "WebSocket message UUID is missing or invalid.",
        };
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
        },
    };
}

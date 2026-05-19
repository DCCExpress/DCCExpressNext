// server/src/ws/wsIncomingClientMessageParser.ts
import { isClientWsMessageType, } from "../../../common/src/types.js";
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
    if (!parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)) {
        return {
            ok: false,
            reason: "WebSocket message must be an object.",
        };
    }
    const candidate = parsed;
    if (!isClientWsMessageType(candidate.type)) {
        return {
            ok: false,
            reason: "Unknown WebSocket message type.",
        };
    }
    if (typeof candidate.uuid !== "string" ||
        candidate.uuid.trim().length === 0) {
        return {
            ok: false,
            reason: "WebSocket message UUID is missing or invalid.",
        };
    }
    /**
     * A teljes payload-validálást külön, következő sprintben érdemes
     * szépen hozzáadni message-típusonként.
     *
     * Itt már biztosan:
     * - objektum jött,
     * - ismert kliens message type van benne,
     * - érvényes kliens UUID érkezett.
     */
    return {
        ok: true,
        message: candidate,
    };
}

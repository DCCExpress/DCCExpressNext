// server/src/ws/handlers/wsScriptMessageHandlers.ts
import { scriptRuntimeStore, } from "../../services/scriptRuntimeStore.js";
function normalizeScriptRunSource(value) {
    switch (value) {
        case "property-panel":
        case "route-button":
        case "control-panel":
        case "auto-start":
        case "unknown":
            return value;
        default:
            return "unknown";
    }
}
export const handleScriptMessage = async ({ ws, msg, sendToClient, }) => {
    switch (msg.type) {
        case "runScript": {
            try {
                const script = typeof msg.data?.script === "string"
                    ? msg.data.script
                    : undefined;
                const source = normalizeScriptRunSource(msg.data?.source);
                const elementId = typeof msg.data?.elementId === "string"
                    ? msg.data.elementId
                    : null;
                await scriptRuntimeStore.run(script, {
                    source,
                    elementId,
                });
            }
            catch (error) {
                sendToClient(ws, {
                    type: "scriptRejected",
                    data: {
                        reason: error instanceof Error
                            ? error.message
                            : String(error),
                    },
                });
            }
            return true;
        }
        case "stopScript":
            scriptRuntimeStore.stopCurrent();
            return true;
        case "getScriptRuntimeState":
            sendToClient(ws, {
                type: "scriptDocumentChanged",
                data: scriptRuntimeStore.getDocument(),
            });
            sendToClient(ws, {
                type: "scriptStateChanged",
                data: scriptRuntimeStore.getCurrentState(),
            });
            return true;
        default:
            return false;
    }
};

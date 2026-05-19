// server/src/ws/wsInitialSnapshots.ts
import { scriptRuntimeStore, } from "../services/scriptRuntimeStore.js";
import { taskRuntimeStore, } from "../services/taskRuntimeStore.js";
import { fastClockRuntimeStore, } from "../services/fastClockRuntimeStore.js";
import { log, } from "../utility.js";
export function sendInitialWebSocketSnapshots({ ws, commandCenter, sendToClient, }) {
    sendToClient(ws, {
        type: "ws:welcome",
        data: {
            message: "Connected",
        },
    });
    sendToClient(ws, {
        type: "scriptDocumentChanged",
        data: scriptRuntimeStore.getDocument(),
    });
    sendToClient(ws, {
        type: "scriptStateChanged",
        data: scriptRuntimeStore.getCurrentState(),
    });
    sendToClient(ws, {
        type: "taskManagerSnapshotChanged",
        data: taskRuntimeStore.getSnapshot(),
    });
    sendToClient(ws, {
        type: "fastClockChanged",
        data: fastClockRuntimeStore.getSnapshot(),
    });
    if (!commandCenter) {
        sendToClient(ws, {
            type: "commandCenterInfo",
            data: {
                alive: false,
            },
        });
        return;
    }
    commandCenter.clientConnected();
    sendToClient(ws, {
        type: "commandCenterLockChanged",
        data: {
            locked: commandCenter.locked,
            lockOwner: commandCenter.lockOwnerUUID ?? null,
            reason: commandCenter.locked
                ? "route"
                : null,
        },
    });
    const locos = commandCenter.getLocos();
    for (const loco of locos) {
        sendToClient(ws, {
            type: "locoState",
            data: {
                loco,
            },
        });
    }
    const turnouts = commandCenter.getTurnouts();
    log("Turnouts", turnouts);
    for (const turnout of turnouts) {
        sendToClient(ws, {
            type: "turnoutChanged",
            data: {
                address: turnout.address,
                closed: turnout.closed,
            },
        });
    }
    commandCenter.getBlocks();
    const accessories = commandCenter.getAccessories();
    for (const accessory of accessories) {
        sendToClient(ws, {
            type: "accessoryChanged",
            data: {
                address: accessory.address,
                active: accessory.active,
            },
        });
    }
}

// server/src/ws/handlers/wsCommandCenterMessageHandlers.ts
import { routeGraphRuntimeStore, } from "../../services/routeGraphRuntimeStore.js";
import { log, logError, } from "../../utility.js";
export const handleCommandCenterMessage = ({ ws, msg, commandCenter, sendToClient, broadcast, }) => {
    switch (msg.type) {
        case "setLoco": {
            const address = msg.data?.locoAddress;
            const speed = msg.data?.speed;
            const direction = msg.data?.direction;
            if (typeof address !== "number" ||
                typeof speed !== "number" ||
                (direction !== "forward" &&
                    direction !== "reverse")) {
                logError("Invalid setLoco payload:", msg.data);
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Invalid setLoco payload",
                    },
                });
                return true;
            }
            commandCenter
                .setLoco(address, speed, direction)
                .then(success => {
                log("Set loco result:", success);
                if (!success) {
                    broadcast({
                        type: "error",
                        data: {
                            message: "Failed to set loco",
                        },
                    });
                }
            });
            return true;
        }
        case "setLocoFunction": {
            const address = msg.data?.locoAddress;
            const fn = msg.data?.functionNumber;
            const active = msg.data?.active;
            if (typeof address !== "number" ||
                typeof fn !== "number" ||
                typeof active !== "boolean") {
                logError("Invalid setLocoFunction payload:", msg.data);
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Invalid setLocoFunction payload",
                    },
                });
                return true;
            }
            commandCenter
                .setLocoFunction(address, fn, active)
                .then(success => {
                log("Set loco function result:", success);
                if (!success) {
                    broadcast({
                        type: "error",
                        data: {
                            message: "Failed to set loco function",
                        },
                    });
                }
            });
            return true;
        }
        case "getLoco": {
            const address = msg.data?.locoAddress;
            if (typeof address !== "number") {
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Invalid getLoco payload",
                    },
                });
                return true;
            }
            commandCenter
                .getLoco(address)
                .then(loco => {
                log("getLoco result:", loco);
            })
                .catch(err => {
                logError("Failed to get loco:", err);
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Failed to get loco",
                    },
                });
            });
            return true;
        }
        case "setTurnout": {
            const address = msg.data?.address;
            const closed = msg.data?.closed;
            if (typeof address !== "number" ||
                typeof closed !== "boolean") {
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Invalid setTurnout payload",
                    },
                });
                return true;
            }
            /**
             * Ha a váltó aktív route foglalás része,
             * kézzel nem engedjük átállítani.
             */
            if (routeGraphRuntimeStore.isTurnoutBusy(address)) {
                sendToClient(ws, {
                    type: "commandRejected",
                    uuid: msg.uuid,
                    data: {
                        reason: `Turnout #${address} is reserved by an active route.`,
                        lockOwner: null,
                    },
                });
                return true;
            }
            /**
             * A meglévő command center műveleti lock is marad:
             * például route-beállítás közben se állítgatható kézzel.
             */
            if (commandCenter.locked &&
                commandCenter.lockOwnerUUID != msg.uuid) {
                sendToClient(ws, {
                    type: "commandRejected",
                    uuid: msg.uuid,
                    data: {
                        reason: "Command center busy",
                        lockOwner: commandCenter.lockOwnerUUID,
                    },
                });
                return true;
            }
            commandCenter
                .setTurnout(address, closed)
                .then(success => {
                log("Turnout set result:", success);
                if (!success) {
                    broadcast({
                        type: "error",
                        data: {
                            message: "Failed to set turnout",
                        },
                    });
                }
                else {
                    commandCenter.saveRuntimeState();
                }
            });
            return true;
        }
        case "setSensor": {
            const address = msg.data?.address;
            const on = msg.data?.on;
            if (typeof address !== "number" ||
                typeof on !== "boolean") {
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Invalid setSensor payload",
                    },
                });
            }
            return true;
        }
        case "setBasicAccessory": {
            const address = msg.data?.address;
            const active = msg.data?.active;
            if (typeof address !== "number" ||
                typeof active !== "boolean") {
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Invalid setBasicAccessory payload",
                    },
                });
                return true;
            }
            commandCenter
                .setBasicAccessory(address, active)
                .then(success => {
                log("Basic accessory set result:", success);
                if (!success) {
                    broadcast({
                        type: "error",
                        data: {
                            message: "Failed to set basic accessory",
                        },
                    });
                }
            });
            return true;
        }
        case "setTrackPower": {
            const on = msg.data?.on;
            if (typeof on !== "boolean") {
                sendToClient(ws, {
                    type: "error",
                    data: {
                        message: "Invalid setTrackPower payload",
                    },
                });
                return true;
            }
            commandCenter
                .setTrackPower(on)
                .then(success => {
                log("Set track power result:", success);
                if (!success) {
                    broadcast({
                        type: "error",
                        data: {
                            message: "Failed to set track power",
                        },
                    });
                }
            });
            return true;
        }
        case "emergencyStop": {
            commandCenter
                .emergencyStop()
                .then(success => {
                log("Emergency stop result:", success);
                if (!success) {
                    broadcast({
                        type: "error",
                        data: {
                            message: "Failed to emergency stop",
                        },
                    });
                }
            });
            return true;
        }
        case "setBlock":
            log("Setting block:", msg.data);
            commandCenter.setBlock(msg.data);
            return true;
        case "setBlockRemove":
            log("Removing loco from block:", msg.data);
            commandCenter.setBlockRemove(msg.data);
            return true;
        case "setBlocksReset":
            log("Resetting blocks");
            commandCenter.setBlocksReset();
            return true;
        case "getBlocks":
            log("Getting blocks");
            commandCenter.getBlocks();
            return true;
        default:
            return false;
    }
};

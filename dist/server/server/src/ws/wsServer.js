import { WebSocketServer, WebSocket } from "ws";
import { readCommandCenter, setCommandCenterConfigLoadedCallback } from "../routes/commandCenterRoutes.js";
import { CommandCenterSimulator } from "../commandCenter/simulator.js";
import { Z21CommandCenter } from "../commandCenter/z21CommandCenter.js";
import { log, logError } from "../utility.js";
import { routeGraphRuntimeStore } from "../services/routeGraphRuntimeStore.js";
import { railwayTopologyStore } from "../services/railwayTopologyStore.js";
// type SetTurnoutMessage = {
//   type: "setTurnout";
//   data: {
//     address: number;
//     closed: boolean;
//   };
// };
// type SetSensorMessage = {
//   type: "setSensor";
//   data: {
//     address: number;
//     on: boolean;
//   };
// };
// type CommandCenterInfo = {
//   type: "commandCenterInfo";
//   data: {
//     type: string;
//     alive: boolean;
//   }
// }
// type WsMessage =
//   | SetTurnoutMessage
//   | SetSensorMessage
//   | {
//       type: string;
//       data?: any;
//     };
function sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
function broadcast(wss, message, exclude) {
    const text = JSON.stringify(message);
    for (const client of wss.clients) {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(text);
        }
    }
}
function initCommandCenter(conf) {
    if (commandCenter) {
        commandCenter.stop().then(() => {
            log("Previous command center stopped");
        });
    }
    switch (conf?.type) {
        case "simulator":
            log("Starting command center:", conf.type);
            commandCenter = new CommandCenterSimulator("Simulator");
            commandCenter.start().then(() => {
                log("Command center started:", conf.type);
            }).catch(err => {
                console.error("Failed to start command center:", err);
            });
            break;
        case "z21":
            log("Starting command center:", "Z21");
            //commandCenter = new Z21CommandCenter("Z21", conf.z21.host!, conf.z21.port!);
            commandCenter = new Z21CommandCenter("Z21", conf.z21.host, conf.z21.port, broadcastAll);
            commandCenter
                .start()
                .then(() => {
                log("Command center started:", conf?.type);
            })
                .catch((err) => {
                console.error("Failed to start command center:", err);
            });
            break;
        default:
            commandCenter = new CommandCenterSimulator("Simulator");
            break;
    }
    commandCenter.onRuntimeStateLoaded((blocks, turnouts) => {
        console.log("[Server] Restored runtime state, rebroadcasting...");
        for (const [, block] of blocks) {
            broadcastAll({
                type: "blockChanged",
                data: block,
            });
        }
        for (const [, turnout] of turnouts) {
            broadcastAll({
                type: "turnoutChanged",
                data: turnout,
            });
        }
    });
}
let commandCenter = null; //new CommandCenterSimulator("Simulator");
setCommandCenterConfigLoadedCallback((conf) => {
    log("Command center config loaded:", conf);
    initCommandCenter(conf);
    // if (commandCenter)
    //   commandCenter.loadRuntimeState().then(() => {
    //     log("Runtime state loaded successfully");
    //   }).catch(err => {
    //     logError("Failed to load runtime state:", err);
    //   });
});
let wss;
export function broadcastAll(message, exclude) {
    broadcast(wss, message, exclude);
}
export function setupWebSocketServer(server) {
    readCommandCenter().then(conf => {
        log("Initial command center config:", conf);
        initCommandCenter(conf);
    }).catch(err => {
        logError("Failed to read initial command center config:", err);
    });
    wss = new WebSocketServer({
        server,
        path: "/ws",
    });
    wss.on("connection", (ws, req) => {
        log("WebSocket client connected:", req.socket.remoteAddress);
        let clientUUID = null;
        sendToClient(ws, {
            type: "ws:welcome",
            data: { message: "Connected" },
        });
        // sendToClient(ws, {
        //   type: "commandCenterInfo",
        //   data: { alive: false }
        // } as CommandCenterInfo)
        if (!commandCenter) {
            sendToClient(ws, {
                type: "commandCenterInfo",
                data: { alive: false },
            });
        }
        if (commandCenter) {
            commandCenter.clientConnected();
            sendToClient(ws, {
                type: "commandCenterLockChanged",
                data: {
                    locked: commandCenter.locked,
                    lockOwner: commandCenter.lockOwnerUUID ?? null,
                    reason: commandCenter.locked ? "route" : null,
                },
            });
            const locos = commandCenter.getLocos();
            for (const loco of locos) {
                sendToClient(ws, {
                    type: "locoState",
                    data: { loco },
                });
            }
            const turnouts = commandCenter.getTurnouts();
            log("Turnouts", turnouts);
            for (const turnout of turnouts) {
                const msg = {
                    type: "turnoutChanged",
                    data: {
                        address: turnout.address,
                        closed: turnout.closed,
                    },
                };
                sendToClient(ws, msg);
            }
            commandCenter.getBlocks();
            const accessories = commandCenter.getAccessories();
            for (const accessory of accessories) {
                const msg = {
                    type: "accessoryChanged",
                    data: {
                        address: accessory.address,
                        active: accessory.active,
                    },
                };
                sendToClient(ws, msg);
            }
            // const data = { type: "blockStateChanged", data: Object.fromEntries(commandCenter.blocks), uuid: null };
            // sendToClient(ws, data);
        }
        ws.on("message", async (message) => {
            const text = message.toString();
            log("WS incoming:", text);
            if (commandCenter) {
                //log("Current command center:", commandCenter.getName());
                try {
                    const msg = JSON.parse(text);
                    if (msg.uuid) {
                        clientUUID = msg.uuid;
                    }
                    log("Received message of type:", msg.type);
                    switch (msg.type) {
                        //===============================
                        // LOCK & UNLOCK
                        //===============================
                        case "routeLock": {
                            if (commandCenter.locked && commandCenter.lockOwnerUUID !== msg.uuid) {
                                sendToClient(ws, {
                                    type: "commandRejected",
                                    uuid: msg.uuid,
                                    data: {
                                        reason: "Command center busy",
                                        lockOwner: commandCenter.lockOwnerUUID,
                                    },
                                });
                                return;
                            }
                            commandCenter.locked = true;
                            commandCenter.lockOwnerUUID = msg.uuid;
                            broadcast(wss, {
                                type: "commandCenterLockChanged",
                                data: {
                                    locked: true,
                                    lockOwner: commandCenter.lockOwnerUUID,
                                },
                            });
                            return;
                        }
                        case "routeUnlock": {
                            if (commandCenter.lockOwnerUUID === msg.uuid) {
                                commandCenter.locked = false;
                                commandCenter.lockOwnerUUID = null;
                                broadcast(wss, {
                                    type: "commandCenterLockChanged",
                                    data: {
                                        locked: false,
                                        lockOwner: null,
                                    },
                                });
                            }
                            return;
                        }
                        // ================================
                        // GRAPH
                        // ================================
                        case "reserveRoute": {
                            const fromBlockName = msg.data?.fromBlockName;
                            const toBlockName = msg.data?.toBlockName;
                            if (typeof fromBlockName !== "string" ||
                                typeof toBlockName !== "string") {
                                sendToClient(ws, {
                                    type: "routeReservationRejected",
                                    data: {
                                        reason: "Invalid reserveRoute payload.",
                                    },
                                });
                                return;
                            }
                            const graph = routeGraphRuntimeStore.getGraph();
                            if (!graph) {
                                sendToClient(ws, {
                                    type: "routeReservationRejected",
                                    data: {
                                        reason: "Nincs aktív szerveroldali route graph.",
                                    },
                                });
                                return;
                            }
                            const solution = graph.findRouteBetweenBlockNames(fromBlockName, toBlockName);
                            if (!solution) {
                                sendToClient(ws, {
                                    type: "routeReservationRejected",
                                    data: {
                                        reason: `Nincs útvonal: ${fromBlockName} → ${toBlockName}`,
                                    },
                                });
                                return;
                            }
                            const reservation = routeGraphRuntimeStore.tryReserveRoute(fromBlockName, toBlockName, solution);
                            if (!reservation.ok) {
                                sendToClient(ws, {
                                    type: "routeReservationRejected",
                                    data: {
                                        reason: reservation.error,
                                    },
                                });
                                return;
                            }
                            const topology = railwayTopologyStore.getTopology();
                            if (!topology) {
                                sendToClient(ws, {
                                    type: "routeReservationRejected",
                                    data: {
                                        reason: "Nincs aktív szerveroldali topology.",
                                    },
                                });
                                return;
                            }
                            /**
                             * A graph logikai closed értékét itt fordítjuk át
                             * az adott váltó fizikai command-center boolean értékére.
                             */
                            for (const turnoutState of solution.turnoutStates) {
                                const turnout = topology
                                    .getTurnouts()
                                    .find(item => item.turnoutAddress === turnoutState.address);
                                if (!turnout) {
                                    logError(`[RouteReserve] Turnout not found in topology: ${turnoutState.address}`);
                                    continue;
                                }
                                const physicalClosed = turnoutState.closed === turnout.turnoutClosedValue;
                                if (commandCenter) {
                                    commandCenter.locked = true;
                                    commandCenter.lockOwnerUUID = msg.uuid;
                                    broadcast(wss, {
                                        type: "commandCenterLockChanged",
                                        data: {
                                            locked: true,
                                            lockOwner: commandCenter.lockOwnerUUID,
                                            reason: "route",
                                        },
                                    });
                                }
                                try {
                                    /**
                                     * A graph logikai closed értékét átfordítjuk
                                     * az adott váltó fizikai command-center boolean értékére.
                                     */
                                    for (const turnoutState of solution.turnoutStates) {
                                        const turnout = topology
                                            .getTurnouts()
                                            .find(item => item.turnoutAddress === turnoutState.address);
                                        if (!turnout) {
                                            logError(`[RouteReserve] Turnout not found in topology: ${turnoutState.address}`);
                                            continue;
                                        }
                                        const physicalClosed = turnoutState.closed === turnout.turnoutClosedValue;
                                        if (commandCenter) {
                                            await commandCenter.setTurnout(turnoutState.address, physicalClosed);
                                            commandCenter.saveRuntimeState();
                                        }
                                        await new Promise(resolve => setTimeout(resolve, 500));
                                    }
                                }
                                finally {
                                    /**
                                     * Akkor is feloldjuk a LOCK-ot,
                                     * ha közben valamelyik váltóállításnál gebasz lenne.
                                     */
                                    if (commandCenter) {
                                        commandCenter.locked = false;
                                        commandCenter.lockOwnerUUID = null;
                                        broadcast(wss, {
                                            type: "commandCenterLockChanged",
                                            data: {
                                                locked: false,
                                                lockOwner: null,
                                                reason: null,
                                            },
                                        });
                                    }
                                }
                                /**
                                 * A route maga továbbra is foglalt marad,
                                 * csak a command center "művelet közbeni busy" lockját oldjuk fel.
                                 */
                                broadcast(wss, {
                                    type: "routeReservationChanged",
                                    data: {
                                        busy: true,
                                        sectionNames: reservation.reservation.sectionNames,
                                        turnoutAddresses: reservation.reservation.turnoutAddresses,
                                        fromBlockName,
                                        toBlockName,
                                    },
                                });
                            }
                            return;
                        }
                        case "releaseRouteReservation": {
                            const fromBlockName = msg.data?.fromBlockName;
                            const toBlockName = msg.data?.toBlockName;
                            if (typeof fromBlockName !== "string" ||
                                typeof toBlockName !== "string") {
                                sendToClient(ws, {
                                    type: "routeReservationReleaseRejected",
                                    data: {
                                        reason: "Invalid releaseRouteReservation payload.",
                                    },
                                });
                                return;
                            }
                            const result = routeGraphRuntimeStore.releaseRouteReservation(fromBlockName, toBlockName);
                            if (!result.ok) {
                                sendToClient(ws, {
                                    type: "routeReservationReleaseRejected",
                                    data: {
                                        reason: result.error,
                                    },
                                });
                                return;
                            }
                            broadcast(wss, {
                                type: "routeReservationChanged",
                                data: {
                                    busy: false,
                                    sectionNames: result.releasedSectionNames,
                                    turnoutAddresses: result.releasedTurnoutAddresses,
                                    fromBlockName,
                                    toBlockName,
                                },
                            });
                            return;
                        }
                        case "clearAllRouteReservations": {
                            routeGraphRuntimeStore.clearAllBusy();
                            broadcast(wss, {
                                type: "allRouteReservationsCleared",
                                data: {},
                            });
                            return;
                        }
                        //===============================
                        // setLoco
                        //===============================
                        case "setLoco": {
                            const address = msg.data?.locoAddress;
                            const speed = msg.data?.speed;
                            const direction = msg.data?.direction;
                            if (typeof address !== "number" || typeof speed !== "number" || (direction !== "forward" && direction !== "reverse")) {
                                logError("Invalid setLoco payload:", msg.data);
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Invalid setLoco payload" },
                                });
                                return;
                            }
                            commandCenter.setLoco(address, speed, direction).then(success => {
                                log("Set loco result:", success);
                                if (!success) {
                                    broadcast(wss, {
                                        type: "error",
                                        data: { message: "Failed to set loco" },
                                    });
                                }
                                else {
                                    // Optionally, broadcast the new loco state to all clients
                                    // commandCenter!.getLoco(address).then(loco => {
                                    //   broadcast(wss, {
                                    //     type: "locoState",
                                    //     data: { loco },
                                    //   });
                                    // });
                                }
                            });
                            return;
                        }
                        //===============================
                        // setLocoFunction
                        //===============================
                        case "setLocoFunction": {
                            const address = msg.data?.locoAddress;
                            const fn = msg.data?.functionNumber;
                            const active = msg.data?.active;
                            if (typeof address !== "number" || typeof fn !== "number" || typeof active !== "boolean") {
                                logError("Invalid setLocoFunction payload:", msg.data);
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Invalid setLocoFunction payload" },
                                });
                                return;
                            }
                            commandCenter.setLocoFunction(address, fn, active).then(success => {
                                log("Set loco function result:", success);
                                if (!success) {
                                    broadcast(wss, {
                                        type: "error",
                                        data: { message: "Failed to set loco function" },
                                    });
                                }
                                else {
                                    // Optionally, broadcast the new loco state to all clients
                                    // commandCenter!.getLoco(address).then(loco => {
                                    //   log("Broadcasting loco state after function change:", loco);
                                    //   broadcast(wss, {
                                    //     type: "locoState",
                                    //     data: { loco },
                                    //   });
                                    // });
                                }
                            });
                            return;
                        }
                        //===============================
                        // getLoco
                        //===============================
                        case "getLoco": {
                            const address = msg.data?.locoAddress;
                            if (typeof address !== "number") {
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Invalid getLoco payload" },
                                });
                                return;
                            }
                            commandCenter.getLoco(address).then(loco => {
                                log("getLoco result:", loco);
                                // sendToClient(ws, {
                                //   type: "locoState",
                                //   data: { loco },
                                // });
                            }).catch(err => {
                                logError("Failed to get loco:", err);
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Failed to get loco" },
                                });
                            });
                            return;
                        }
                        //===============================
                        // setTurnout
                        //===============================
                        case "setTurnout": {
                            if (commandCenter.locked && commandCenter.lockOwnerUUID != msg.uuid) {
                                ws.send(JSON.stringify({
                                    type: "commandRejected",
                                    uuid: msg.uuid,
                                    data: {
                                        reason: "Command center busy",
                                        lockOwner: commandCenter.lockOwnerUUID,
                                    },
                                }));
                                return;
                            }
                            const address = msg.data?.address;
                            const closed = msg.data?.closed;
                            if (typeof address !== "number" || typeof closed !== "boolean") {
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Invalid setTurnout payload" },
                                });
                                return;
                            }
                            commandCenter.setTurnout(address, closed).then(success => {
                                log("Turnout set result:", success);
                                if (!success) {
                                    broadcast(wss, {
                                        type: "error",
                                        data: { message: "Failed to set turnout" },
                                    });
                                }
                                else {
                                    commandCenter?.saveRuntimeState();
                                }
                            });
                            return;
                        }
                        //===============================
                        // getSensor
                        //===============================
                        case "setSensor": {
                            const address = msg.data?.address;
                            const on = msg.data?.on;
                            if (typeof address !== "number" || typeof on !== "boolean") {
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Invalid setSensor payload" },
                                });
                                return;
                            }
                            return;
                        }
                        //===============================
                        // setBasicAccessory
                        //===============================
                        case "setBasicAccessory": {
                            const address = msg.data?.address;
                            const active = msg.data?.active;
                            if (typeof address !== "number" || typeof active !== "boolean") {
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Invalid setBasicAccessory payload" },
                                });
                                return;
                            }
                            commandCenter.setBasicAccessory(address, active).then(success => {
                                log("Basic accessory set result:", success);
                                if (!success) {
                                    broadcast(wss, {
                                        type: "error",
                                        data: { message: "Failed to set basic accessory" },
                                    });
                                }
                            });
                            return;
                        }
                        //==================================
                        // POWER
                        //==================================
                        case "setTrackPower": {
                            const on = msg.data?.on;
                            if (typeof on !== "boolean") {
                                sendToClient(ws, {
                                    type: "error",
                                    data: { message: "Invalid setTrackPower payload" },
                                });
                                return;
                            }
                            commandCenter.setTrackPower(on).then((success) => {
                                log("Set track power result:", success);
                                if (!success) {
                                    broadcast(wss, {
                                        type: "error",
                                        data: { message: "Failed to set track power" },
                                    });
                                }
                            });
                            return;
                        }
                        //==================================
                        // EMERGENCY STOP
                        //==================================
                        case "emergencyStop": {
                            commandCenter.emergencyStop().then((success) => {
                                log("Emergency stop result:", success);
                                if (!success) {
                                    broadcast(wss, {
                                        type: "error",
                                        data: { message: "Failed to emergency stop" },
                                    });
                                }
                            });
                            return;
                        }
                        //==================================
                        // SET BLOCK
                        //==================================
                        case "setBlock":
                            log("Setting block:", msg.data);
                            commandCenter.setBlock(msg.data);
                            break;
                        case "setBlockRemove":
                            log("Removing loco from block:", msg.data);
                            commandCenter.setBlockRemove(msg.data);
                            break;
                        case "setBlocksReset":
                            log("Resetting blocks");
                            commandCenter.setBlocksReset();
                            break;
                        case "getBlocks":
                            log("Getting blocks");
                            commandCenter.getBlocks();
                            break;
                        //==================================
                        // DEFAULT
                        //==================================
                        default: {
                            logError("Unknown message type:", msg.type);
                            sendToClient(ws, {
                                type: "error",
                                data: { message: "Unknown message type" },
                            });
                            //broadcast(wss, msg, ws);
                            return;
                        }
                    }
                }
                catch (error) {
                    sendToClient(ws, {
                        type: "error",
                        data: { message: String(error) },
                    });
                }
            }
            else {
                sendToClient(ws, {
                    type: "error",
                    data: { message: "No command center available" },
                });
            }
        });
        ws.on("close", () => {
            log("WebSocket client disconnected");
            if (commandCenter &&
                clientUUID &&
                commandCenter.lockOwnerUUID === clientUUID) {
                commandCenter.locked = false;
                commandCenter.lockOwnerUUID = null;
                broadcast(wss, {
                    type: "commandCenterLockChanged",
                    data: {
                        locked: false,
                        lockOwner: null,
                    },
                });
            }
        });
        ws.on("error", (error) => {
            console.error("WebSocket client error:", error);
        });
    });
    return wss;
}

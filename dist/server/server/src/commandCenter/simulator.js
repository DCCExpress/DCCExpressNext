// server/src/commandCenter/simulator.ts
import { CommandCenter, } from "./CommandCenter.js";
import { log, } from "../utility.js";
import { broadcastAll, } from "../ws/wsServer.js";
export class CommandCenterSimulator extends CommandCenter {
    alive = false;
    aliveTask = null;
    power = false;
    start() {
        log("Starting command center simulator...");
        this.alive = true;
        this.power = true;
        if (this.aliveTask) {
            clearInterval(this.aliveTask);
            this.aliveTask = null;
        }
        this.aliveTask = setInterval(() => {
            const msg = {
                type: "commandCenterInfo",
                data: {
                    alive: this.alive,
                    power: this.power,
                    type: "simulator",
                },
                uuid: this.lockOwnerUUID,
            };
            broadcastAll(msg);
        }, 1000);
        return Promise.resolve(true);
    }
    stop() {
        log("Stopping command center simulator...");
        this.alive = false;
        this.power = false;
        if (this.aliveTask) {
            clearInterval(this.aliveTask);
            this.aliveTask = null;
        }
        const msg = {
            type: "commandCenterInfo",
            data: {
                alive: this.alive,
                power: this.power,
                type: "simulator",
            },
            uuid: this.lockOwnerUUID,
        };
        broadcastAll(msg);
        return Promise.resolve(true);
    }
    getConnectionString() {
        return "simulator://local";
    }
    clientConnected() {
        // A kezdeti runtime snapshotokat a WebSocket réteg küldi ki.
    }
    setTurnout(address, closed) {
        log("Sim: setTurnout", {
            address,
            closed,
        });
        const turnout = this.getOrCreateTurnout(address);
        turnout.closed = closed;
        const msg = {
            type: "turnoutChanged",
            data: {
                address,
                closed,
            },
        };
        broadcastAll(msg);
        return Promise.resolve(true);
    }
    getTurnout(address) {
        return Promise.resolve(this.turnouts.get(address) ?? null);
    }
    setLoco(address, speed, direction) {
        const loco = this.getOrCreateLoco(address);
        loco.speed = speed;
        loco.direction = direction;
        broadcastAll({
            type: "locoState",
            data: {
                loco,
            },
        });
        return Promise.resolve(true);
    }
    setLocoFunction(address, fn, active) {
        const loco = this.getOrCreateLoco(address);
        loco.functions[fn] = active;
        broadcastAll({
            type: "locoState",
            data: {
                loco,
            },
        });
        return Promise.resolve(true);
    }
    getLoco(address) {
        return Promise.resolve(this.getOrCreateLoco(address));
    }
    setBasicAccessory(address, active) {
        const accessory = this.getOrCreateAccessory(address);
        accessory.active = active;
        const msg = {
            type: "accessoryChanged",
            data: {
                address,
                active,
            },
        };
        broadcastAll(msg);
        return Promise.resolve(true);
    }
    setTrackPower(on) {
        this.power = on;
        this.powerInfo.trackVoltageOn = on;
        this.powerInfo.emergencyStop = false;
        const powerInfo = {
            emergencyStop: false,
            trackVoltageOff: !on,
            trackVoltageOn: on,
            shortCircuit: false,
            programmingModeActive: false,
        };
        const state = {
            alive: this.alive,
            power: this.power,
            type: "simulator",
            trackPower: on,
            powerInfo,
        };
        broadcastAll({
            type: "z21SystemState",
            data: state,
        });
        broadcastAll({
            type: "powerInfo",
            data: powerInfo,
        });
        const commandCenterInfoMessage = {
            type: "commandCenterInfo",
            data: {
                alive: this.alive,
                power: this.power,
                type: "simulator",
            },
            uuid: this.lockOwnerUUID,
        };
        broadcastAll(commandCenterInfoMessage);
        return Promise.resolve(true);
    }
    emergencyStop() {
        log("Sim: emergencyStop");
        this.powerInfo.emergencyStop = true;
        for (const loco of this.locos.values()) {
            if (loco.speed === 0) {
                continue;
            }
            loco.speed = 0;
            broadcastAll({
                type: "locoState",
                data: {
                    loco,
                },
            });
        }
        const powerInfo = {
            emergencyStop: true,
            trackVoltageOff: !this.power,
            trackVoltageOn: this.power,
            shortCircuit: false,
            programmingModeActive: false,
        };
        broadcastAll({
            type: "powerInfo",
            data: powerInfo,
        });
        return Promise.resolve(true);
    }
    setSensor(address, on) {
        log("Sim: setSensor", {
            address,
            on,
        });
        this.sensors.set(address, {
            address,
            active: on,
        });
        broadcastAll({
            type: "sensorChanged",
            data: {
                address,
                on,
            },
        });
        return Promise.resolve(true);
    }
    getSensor(address) {
        return Promise.resolve(this.sensors.get(address) ?? null);
    }
}

import {
    CommandCenter,
} from "./CommandCenter.js";

import type {
    AccessoryInfo,
    LocoState,
    RBusInfo,
    RBusSensorInfo,
    SensorInfo,
    ServerWsMessageType,
    ServerWsPayloadMap,
    TurnoutInfo,
    TypedServerWsMessage,
    Z21SystemStatePayload,
} from "../../../common/src/types.js";
import { log, logError } from "../utility.js";
import { UdpClient, bufferToHex, type UdpMessage } from "./udpClient.js";


import {
    buildEmergencyStopPacket,
    buildGetLocoInfoPacket,
    buildGetTurnoutInfoPacket,
    buildSetBasicAccessoryPacket,
    buildSetLocoDrivePacket,
    buildSetLocoFunctionPacket,
    buildSetTrackPowerPacket,
    buildSetTurnoutPackets,
} from "./z21/z21CommandBuilders.js";

import {
    isTurnoutInfoPacket as isZ21TurnoutInfoPacket,
} from "./z21/z21Parsers.js";

import {
    isRBusDataChangedPacket as isZ21RBusDataChangedPacket,
} from "./z21/z21Parsers.js";

import {
    isLocoInfoPacket as isZ21LocoInfoPacket,
} from "./z21/z21Parsers.js";

import {
    decodeRBusSensors,
    isLocoInfoPacket,
    isRBusDataChangedPacket,
    isTurnoutInfoPacket,
    parseLocoInfoPacket,
    parseRBusDataChangedPacket,
    parseSystemStatePacket,
    parseTurnoutInfoPacket,
} from "./z21/z21Parsers.js";

const LAN_X_HEADER = 0x0040;

const LAN_X_TURNOUT_INFO = 0x43;

const LAN_X_LOCO_INFO = 0xef;


const LAN_SYSTEMSTATE_DATACHANGED = 0x0084;

const LAN_SET_BROADCASTFLAGS = 0x0050;

// Z21 broadcast flags
const BC_ALL = 0x00000001;
const BC_RBUS = 0x00000002;
const BC_SYSTEM_STATE = 0x00000100;

const LAN_RMBUS_DATACHANGED = 0x0080;

type WsBroadcaster = (
    message: TypedServerWsMessage
) => void;

export type Z21SystemState =
    Z21SystemStatePayload;

export class Z21CommandCenter extends CommandCenter {
    ip: string = "";
    port: number = 21105;
    udpClient: UdpClient;
    locoSubscribeTask: NodeJS.Timeout | undefined = undefined;

    buffer: unknown[] = [];

    public lastMessageReceived: number = Date.now();
    public pollingTask: NodeJS.Timeout | undefined;

    private lastSystemState: Z21SystemState | undefined = undefined;
    private readonly wsBroadcast: WsBroadcaster;
    timeoutMs: number = 1500;

    constructor(
        name: string,
        ip: string,
        port: number,
        wsBroadcast: WsBroadcaster
    ) {
        super(name);

        this.ip = ip;
        this.port = port;
        this.wsBroadcast = wsBroadcast;

        this.udpClient = new UdpClient({
            host: this.ip,
            port: this.port,
            timeoutMs: 1500,
            debug: true,
        });

        this.udpClient.on("message", (message: UdpMessage) => {
            this.lastMessageReceived = Date.now();
            this.onUdpMessage(
                message.data,
                message.remote.address,
                message.remote.port
            );
        });

        this.udpClient.on("error", (error: Error) => {
            logError("Z21 UDP error:", error);
            //this.handleConnectionLost("udp error");
        });

        this.udpClient.on("close", () => {
            log("Z21 UDP closed");
            //this.handleConnectionLost("udp close");
        });
    }

    override isAlive(): boolean {
        return this.udpClient.isOpen;
    }

    getConnectionString(): string {
        return `z21://${this.ip}:${this.port}`;
    }

    async start(): Promise<boolean> {
        if (this.udpClient) {
            Promise.resolve(true);
        }

        try {
            log("Starting Z21 command center with config:", {
                name: this.name,
                ip: this.ip,
                port: this.port,
            });

            await this.udpClient.open();

            await this.initZ21Connection();

            this.broadcastCommandCenterInfo(true);

            this.startPollingTask();
            this.startLocoSubscribePolling();

            log("Z21 command center started");

            return true;
        } catch (error) {
            logError("Z21 start failed:", error);

            this.broadcastCommandCenterInfo(false);

            this.stopLocoSubscribePolling();

            return false;
        } finally {
        }
    }

    async stop(): Promise<boolean> {
        try {
            log("Stopping Z21 command center with config:", {
                name: this.name,
                ip: this.ip,
                port: this.port,
            });

            this.stopPollingTask();
            this.stopLocoSubscribePolling();

            this.udpClient.close();

            this.broadcastCommandCenterInfo(false);

            return true;
        } catch (error) {
            logError("Z21 stop failed:", error);
            return false;
        } finally {

        }
    }

    clientConnected(): void {

        this.broadcastCommandCenterInfo(this.isAlive());

        // if (this.lastSystemState) {
        //     this.broadcastWs("z21SystemState", this.lastSystemState);
        //     this.broadcastWs("powerInfo", this.lastSystemState.powerInfo);
        // } else if (this.started) {
        //     void this.getSystemState();
        // }

        for (const turnout of this.turnouts.values()) {
            this.broadcastWs("turnoutChanged", {
                address: turnout.address,
                closed: turnout.closed,
            });
        }

        for (const accessory of this.accessories.values()) {
            this.broadcastAccessoryChanged(accessory);
        }

        for (const loco of this.getLocos()) {
            this.broadcastWs("locoState", {
                loco,
            });
        }

        for (const sensor of this.sensors.values()) {
            this.broadcastWs("sensorChanged", {
                address: sensor.address,
                on: sensor.active,
            });
        }

        for (const [group, bytes] of this.rbusGroups.entries()) {
            this.broadcastWs("rbusInfo", {
                group,
                bytes,
            });
        }
    }

    private async initZ21Connection(): Promise<void> {
        //await this.resubscribeBroadcastFlags();

        //const state = await this.getSystemState(false);

        // if (!state) {
        //     throw new Error("Z21 did not respond to system state request");
        // }

        //        await this.getRBusGroup(0);
        //        await this.getRBusGroup(1);

        await this.init();
        await this.resubscribeLocos();


    }


    async setTurnout(address: number, closed: boolean): Promise<boolean> {
        try {
            const {
                functionAddress,
                activatePacket,
                deactivatePacket,
            } = buildSetTurnoutPackets(address, closed);

            log("Z21 setTurnout activate:", {
                address,
                functionAddress,
                closed,
                packet: bufferToHex(activatePacket),
            });

            await this.udpClient.send(activatePacket);

            await sleep(150);

            log("Z21 setTurnout deactivate:", {
                address,
                functionAddress,
                closed,
                packet: bufferToHex(deactivatePacket),
            });

            await this.udpClient.send(deactivatePacket);

            const turnoutInfo: TurnoutInfo = {
                address,
                closed,
            };

            this.turnouts.set(address, turnoutInfo);

            this.broadcastWs("turnoutChanged", {
                address,
                closed,
            });

            this.broadcastWs("z21TurnoutInfo", {
                address,
                closed,
                state: closed ? "pos: P1" : "pos: P0",
                valid: true,
                source: "setTurnout",
            });

            void this.getTurnout(address).catch(error => {
                logError("Z21 delayed getTurnout failed:", {
                    address,
                    error,
                });
            });

            return true;
        } catch (error) {
            logError("Z21 setTurnout failed:", {
                address,
                closed,
                error,
            });

            return false;
        }
    }

    async getTurnout(address: number): Promise<TurnoutInfo | null> {
        try {
            const {
                functionAddress,
                packet,
            } = buildGetTurnoutInfoPacket(address);

            log("Z21 getTurnout:", {
                address,
                functionAddress,
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            return null;
        } catch (error) {
            logError("Z21 getTurnout failed:", {
                address,
                error,
            });

            return this.turnouts.get(address) ?? null;
        }
    }

    getTurnouts(): TurnoutInfo[] {
        return [...this.turnouts.values()];
    }

    async setLoco(
        address: number,
        speed: number,
        direction: "forward" | "reverse"
    ): Promise<boolean> {
        try {
            const {
                normalizedSpeed,
                packet,
            } = buildSetLocoDrivePacket(
                address,
                speed,
                direction
            );

            log("Z21 setLoco:", {
                address,
                speed,
                normalizedSpeed,
                direction,
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            const loco = this.getOrCreateLoco(address);
            loco.speed = normalizedSpeed;
            loco.direction = direction;

            this.broadcastLocoState(loco);

            const refreshTimer = setTimeout(() => {
                void this.getLoco(address).catch(error => {
                    logError("Z21 delayed getLoco failed:", {
                        address,
                        error,
                    });
                });
            }, 150);

            refreshTimer.unref?.();

            return true;
        } catch (error) {
            logError("Z21 setLoco failed:", {
                address,
                speed,
                direction,
                error,
            });

            return false;
        }
    }
    async getLoco(address: number): Promise<LocoState | null> {
        try {
            const packet = buildGetLocoInfoPacket(address);

            log("Z21 getLoco:", {
                address,
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            return null;
        } catch (error) {
            logError("Z21 getLoco failed:", {
                address,
                error,
            });

            return this.getOrCreateLoco(address) ?? null;
        }
    }

    async setLocoFunction(
        address: number,
        fn: number,
        active: boolean
    ): Promise<boolean> {
        try {
            const {
                functionByte,
                packet,
            } = buildSetLocoFunctionPacket(
                address,
                fn,
                active
            );

            log("Z21 setLocoFunction:", {
                address,
                fn,
                active,
                functionByte,
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            const loco = this.getOrCreateLoco(address);
            loco.functions[fn] = active;

            this.broadcastLocoState(loco);

            const refreshTimer = setTimeout(() => {
                void this.getLoco(address).catch(error => {
                    logError("Z21 delayed getLoco after function failed:", {
                        address,
                        fn,
                        error,
                    });
                });
            }, 150);

            refreshTimer.unref?.();

            return true;
        } catch (error) {
            logError("Z21 setLocoFunction failed:", {
                address,
                fn,
                active,
                error,
            });

            return false;
        }
    }

    async setBasicAccessory(address: number, active: boolean): Promise<boolean> {
        try {
            const {
                functionAddress,
                packet,
            } = buildSetBasicAccessoryPacket(address, active);

            log("Z21 setBasicAccessory:", {
                address,
                functionAddress,
                active,
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            const accessory: AccessoryInfo = {
                address,
                active,
            };

            this.accessories.set(address, accessory);

            this.broadcastAccessoryChanged(accessory);

            return true;
        } catch (error) {
            logError("Z21 setBasicAccessory failed:", {
                address,
                active,
                error,
            });

            return false;
        }
    }

    getAccessory(address: number): Promise<AccessoryInfo | null> {
        return Promise.resolve(this.accessories.get(address) ?? null);
    }

    getAccessories(): AccessoryInfo[] {
        return [...this.accessories.values()];
    }

    async setTrackPower(on: boolean): Promise<boolean> {
        try {
            const packet = buildSetTrackPowerPacket(on);

            log("Z21 setTrackPower:", {
                on,
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            return true;
        } catch (error) {
            logError("Z21 setTrackPower failed:", {
                on,
                error,
            });

            return false;
        }
    }
    async emergencyStop(): Promise<boolean> {
        try {
            const packet = buildEmergencyStopPacket();

            log("Z21 emergencyStop:", {
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            return true;
        } catch (error) {
            logError("Z21 emergencyStop failed:", error);
            return false;
        }
    }
    async getSensor(address: number): Promise<SensorInfo | null> {
        return Promise.resolve(this.sensors.get(address) ?? null);
    }

    // async getSystemState(reconnectOnFail = true): Promise<Z21SystemState | null> {
    //     try {
    //         const response = await this.udpClient.sendAndReceive(
    //             this.buildZ21Packet(LAN_SYSTEMSTATE_GETDATA),
    //             (message) => this.containsZ21Header(
    //                 message.data,
    //                 LAN_SYSTEMSTATE_DATACHANGED
    //             ),
    //             2000
    //         );

    //         const packets = this.splitZ21Packets(response.data);
    //         const systemStatePacket = packets.find((packet) =>
    //             this.isZ21Header(packet, LAN_SYSTEMSTATE_DATACHANGED)
    //         );

    //         if (!systemStatePacket) {
    //             throw new Error(
    //                 `Z21 system state response not found: ${bufferToHex(response.data)}`
    //             );
    //         }

    //         const state = this.parseSystemState(systemStatePacket);

    //         this.lastSystemState = state;

    //         this.broadcastWs("z21SystemState", state);
    //         this.broadcastWs("powerInfo", state.powerInfo);

    //         log("Z21 system state:", state);

    //         return state;
    //     } catch (error) {
    //         logError("Z21 getSystemState failed:", error);

    //         if (reconnectOnFail) {
    //             this.handleConnectionLost("getSystemState failed");
    //         }

    //         return null;
    //     }
    // }

    // async getRBusGroup(group: number): Promise<RBusInfo | null> {
    //     try {
    //         if (!Number.isInteger(group) || group < 0 || group > 1) {
    //             throw new Error(`Invalid RBUS group index: ${group}`);
    //         }

    //         const packet = this.buildZ21Packet(
    //             LAN_RMBUS_GETDATA,
    //             Buffer.from([group])
    //         );

    //         log("Z21 getRBusGroup:", {
    //             group,
    //             packet: bufferToHex(packet),
    //         });

    //         const response = await this.udpClient.sendAndReceive(
    //             packet,
    //             (message) => this.containsRBusDataChangedForGroup(message.data, group),
    //             2000
    //         );

    //         const packets = this.splitZ21Packets(response.data);

    //         const rbusPacket = packets.find((item) =>
    //             this.isRBusDataChangedForGroup(item, group)
    //         );

    //         if (!rbusPacket) {
    //             throw new Error(
    //                 `Z21 RBUS group response not found: ${bufferToHex(response.data)}`
    //             );
    //         }

    //         return this.parseRBusDataChanged(rbusPacket);
    //     } catch (error) {
    //         logError("Z21 getRBusGroup failed:", {
    //             group,
    //             error,
    //         });

    //         const cachedBytes = this.rbusGroups.get(group);
    //         if (!cachedBytes) return null;

    //         return {
    //             group,
    //             bytes: cachedBytes,
    //         };
    //     }
    // }

    private decodeAllRBusSensors(group: number, bytes: number[]): RBusSensorInfo[] {
        const sensors: RBusSensorInfo[] = [];

        for (let byteIndex = 0; byteIndex < 10; byteIndex++) {
            const currentByte = bytes[byteIndex] ?? 0;

            for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
                const mask = 1 << bitIndex;
                const on = (currentByte & mask) !== 0;

                const moduleAddress = group * 10 + byteIndex + 1;
                const input = bitIndex + 1;
                const address = (moduleAddress - 1) * 8 + input;

                sensors.push({
                    address,
                    moduleAddress,
                    input,
                    on,
                    group,
                    byteIndex,
                    bitIndex,
                });
            }
        }

        return sensors;
    }

    parse(data: Buffer): void {
        if (data.length < 4) return;

        const len = data.readUInt16LE(0);
        const header = data.readUInt16LE(2);

        if (len > data.length) {
            logError("Z21 parse: invalid packet length", {
                len,
                bufferLength: data.length,
                raw: bufferToHex(data),
            });
            return;
        }

        if (header === LAN_X_HEADER) {
            this.parseLanX(data);
            return;
        }

        if (header === LAN_SYSTEMSTATE_DATACHANGED) {
            const state = this.parseSystemState(data);

            this.lastSystemState = state;

            this.broadcastWs("z21SystemState", state);
            this.broadcastWs("powerInfo", state.powerInfo);

            return;
        }

        if (header === 0x0010 && len === 0x08) {
            const serialNumber = data.readUInt32LE(4);
            log("Z21 serial number:", serialNumber);
            this.broadcastWs("z21SerialNumber", { serialNumber });
            return;
        }

        if (header === LAN_RMBUS_DATACHANGED) {
            this.parseRBusDataChanged(data);
            return;
        }

        log("Z21 unhandled packet:", bufferToHex(data));
    }

    private onUdpMessage(
        buffer: Buffer,
        remoteAddress: string,
        remotePort: number
    ): void {
        try {
            const packets = this.splitZ21Packets(buffer);

            for (const packet of packets) {
                this.parse(packet);
            }
        } catch (error) {
            logError("Z21 UDP message parse failed:", {
                error,
                remoteAddress,
                remotePort,
                raw: bufferToHex(buffer),
            });
        }
    }

    private splitZ21Packets(buffer: Buffer): Buffer[] {
        const packets: Buffer[] = [];
        let offset = 0;

        while (offset + 4 <= buffer.length) {
            const len = buffer.readUInt16LE(offset);

            if (len <= 0) {
                throw new Error(
                    `Invalid Z21 packet length: len=${len}, offset=${offset}`
                );
            }

            if (offset + len > buffer.length) {
                throw new Error(
                    `Z21 packet size mismatch: len=${len}, offset=${offset}, bufferLength=${buffer.length}`
                );
            }

            packets.push(buffer.subarray(offset, offset + len));
            offset += len;
        }

        if (offset !== buffer.length) {
            throw new Error(
                `Z21 trailing bytes: offset=${offset}, bufferLength=${buffer.length}`
            );
        }

        return packets;
    }

    private parseLanX(data: Buffer): void {
        const len = data.readUInt16LE(0);

        if (data.length < 5) return;

        const xHeader = data.readUInt8(4);

        if (len === 0x1109 && xHeader === LAN_X_TURNOUT_INFO) {
            const info = this.parseTurnoutInfo(data);

            if (!info) {
                return;
            }

            this.turnouts.set(info.address, {
                address: info.address,
                closed: info.closed,
            });

            this.broadcastWs("turnoutChanged", {
                address: info.address,
                closed: info.closed,
            });

            this.broadcastWs("z21TurnoutInfo", info);

            log("Z21 turnout info:", info);

            return;
        }

        if (len === 0x09 && xHeader === LAN_X_TURNOUT_INFO) {
            const info = this.parseTurnoutInfo(data);

            if (!info) {
                return;
            }

            this.turnouts.set(info.address, {
                address: info.address,
                closed: info.closed,
            });

            this.broadcastWs("turnoutChanged", {
                address: info.address,
                closed: info.closed,
            });

            this.broadcastWs("z21TurnoutInfo", info);

            const accessory: AccessoryInfo = {
                address: info.address,
                active: info.closed,
            };

            this.accessories.set(accessory.address, accessory);
            this.broadcastAccessoryChanged(accessory);

            log("Z21 turnout/accessory info:", {
                turnout: info,
                accessory,
            });

            return;
        }

        if (xHeader === LAN_X_LOCO_INFO) {
            const loco = this.parseLocoInfo(data);

            if (!loco) {
                return;
            }

            this.broadcastLocoState(loco);

            log("Z21 loco info:", loco);

            return;
        }

        if ((len === 0x07 || len === 0x08) && xHeader === 0x61) {
            const info = data.readUInt8(5);

            const powerInfo = {
                emergencyStop: (info & 0x01) === 0x01,
                trackVoltageOff: (info & 0x02) === 0x02,
                trackVoltageOn: (info & 0x02) === 0x00,
                shortCircuit: (info & 0x04) === 0x04,
                programmingModeActive: (info & 0x20) === 0x20,
            };

            this.broadcastWs("powerInfo", powerInfo);

            log("Z21 LAN_X_STATUS_CHANGED:", powerInfo);

            return;
        }

        if (len === 0x07 && xHeader === 0x81) {
            const powerInfo = {
                emergencyStop: true,
                trackVoltageOn: true,
                trackVoltageOff: false,
                shortCircuit: false,
                programmingModeActive: false,
            };

            this.broadcastWs("powerInfo", powerInfo);

            log("Z21 LAN_X_BC_STOPPED:", powerInfo);

            return;
        }

        log("Z21 unhandled LAN_X packet:", bufferToHex(data));
    }

    private parseRBusDataChanged(data: Buffer): RBusInfo | null {
        const rbus = parseRBusDataChangedPacket(data);

        if (!rbus) {
            logError("Z21 invalid RBUS packet:", bufferToHex(data));
            return null;
        }

        const previousBytes = this.rbusGroups.get(rbus.group) ?? [];

        this.rbusGroups.set(rbus.group, rbus.bytes);

        this.broadcastWs("rbusInfo", rbus);

        const changedSensors = decodeRBusSensors(
            rbus.group,
            rbus.bytes,
            previousBytes
        );

        for (const sensor of changedSensors) {
            this.sensors.set(sensor.address, {
                address: sensor.address,
                active: sensor.on,
            });

            this.broadcastSensorChanged(sensor);
        }

        log("Z21 LAN_RMBUS_DATACHANGED:", {
            group: rbus.group,
            bytes: rbus.bytes,
            changedSensors,
        });

        return rbus;
    }

    private parseSystemState(data: Buffer): Z21SystemState {
        return parseSystemStatePacket(data);
    }

    private async setBroadcastFlags(flags: number): Promise<void> {
        const payload = Buffer.alloc(4);
        payload.writeUInt32LE(flags, 0);

        const packet = this.buildZ21Packet(LAN_SET_BROADCASTFLAGS, payload);

        await this.udpClient.send(packet);

        log("Z21 broadcast flags sent:", {
            flags,
            hex: `0x${flags.toString(16).padStart(8, "0")}`,
        });
    }

    private async resubscribeBroadcastFlags(): Promise<void> {
        await this.setBroadcastFlags(BC_ALL | BC_RBUS | BC_SYSTEM_STATE);

        log("Z21 broadcast flags resubscribed", {
            flags: BC_ALL | BC_RBUS | BC_SYSTEM_STATE,
        });
    }

    private startPollingTask() {
        this.stopPollingTask();

        this.LAN_SYSTEMSTATE_GETDATA();
        this.LAN_SET_BROADCASTFLAGS();

        this.pollingTask = setInterval(() => {
            const diff = Date.now() - this.lastMessageReceived;

            if (diff > this.timeoutMs) {
                this.LAN_SYSTEMSTATE_GETDATA();
                this.LAN_SET_BROADCASTFLAGS();

                if (diff > this.timeoutMs * 2) {
                    logError("Z21 connection seems lost, no response for", {
                        diff,
                        timeoutMs: this.timeoutMs,
                    });
                    this.broadcastCommandCenterInfo(false);
                }
            }
        }, 1000);

    }

    private stopPollingTask() {
        if (this.pollingTask) {
            clearInterval(this.pollingTask);
            this.pollingTask = undefined;
        }
    }
    // private startPollingSystemState(): void {
    //     this.stopPollingSystemState();

    //     this.polingTask = setInterval(() => {
    //         if (!this.started || this.starting || this.stopping) {
    //             return;
    //         }

    //         void this.getSystemState();
    //     }, 50_000);
    // }

    // private stopPollingSystemState(): void {
    //     if (this.polingTask) {
    //         clearInterval(this.polingTask);
    //         this.polingTask = undefined;
    //     }
    // }

    private startLocoSubscribePolling(): void {
        this.stopLocoSubscribePolling();

        void this.resubscribeLocos();

        this.locoSubscribeTask = setInterval(() => {
            this.resubscribeLocos();
        }, 60_000);
    }

    private stopLocoSubscribePolling(): void {
        if (this.locoSubscribeTask) {
            clearInterval(this.locoSubscribeTask);
            this.locoSubscribeTask = undefined;
        }
    }

    private async resubscribeLocos(): Promise<void> {
        const locos = this.getLocos();

        if (locos.length === 0) {
            return;
        }

        const locosToSubscribe = locos.slice(0, 16);

        log("Z21 resubscribe loco infos:", {
            count: locosToSubscribe.length,
            addresses: locosToSubscribe.map((loco) => loco.address),
        });

        for (const loco of locosToSubscribe) {
            try {
                await this.getLoco(loco.address);
                await sleep(50);
            } catch (error) {
                logError("Z21 loco resubscribe failed:", {
                    address: loco.address,
                    error,
                });
            }
        }
    }

    public async LAN_GET_SERIAL_NUMBER(): Promise<void> {
        log("Z21 LAN_GET_SERIAL_NUMBER()");
        await this.udpClient.send([0x04, 0x00, 0x10, 0x00]);
    }

    public async LAN_SYSTEMSTATE_GETDATA(): Promise<void> {
        log("Z21 LAN_SYSTEMSTATE_GETDATA()");
        await this.udpClient.send([0x04, 0x00, 0x85, 0x00]);
    }

    public async LAN_SET_BROADCASTFLAGS(): Promise<void> {
        log("Z21 LAN_SET_BROADCASTFLAGS()");
        await this.udpClient.send([
            0x08, 0x00,       // length = 8
            0x50, 0x00,       // LAN_SET_BROADCASTFLAGS
            0x03, 0x01, 0x00, 0x00 // flags = 0x00000103
        ]);
    }


    private buildZ21Packet(header: number, payload?: Buffer): Buffer {
        const data = payload ?? Buffer.alloc(0);
        const len = 4 + data.length;

        const packet = Buffer.alloc(len);

        packet.writeUInt16LE(len, 0);
        packet.writeUInt16LE(header, 2);

        data.copy(packet, 4);

        return packet;
    }

    private buildLanXPacket(bytesWithoutXor: number[]): Buffer {
        const xor = bytesWithoutXor.reduce((acc, value) => acc ^ value, 0);
        const payload = Buffer.from([...bytesWithoutXor, xor]);

        return this.buildZ21Packet(LAN_X_HEADER, payload);
    }

    private isZ21Header(buffer: Buffer, header: number): boolean {
        if (buffer.length < 4) return false;

        const len = buffer.readUInt16LE(0);
        const packetHeader = buffer.readUInt16LE(2);

        return len <= buffer.length && packetHeader === header;
    }

    private containsZ21Header(buffer: Buffer, header: number): boolean {
        try {
            const packets = this.splitZ21Packets(buffer);
            return packets.some((packet) => this.isZ21Header(packet, header));
        } catch {
            return false;
        }
    }

    private broadcastCommandCenterInfo(alive: boolean): void {
        this.broadcastWs("commandCenterInfo", {
            name: this.name,
            type: "z21",
            ip: this.ip,
            port: this.port,
            alive,
        });
    }

    private broadcastWs<
        TType extends ServerWsMessageType
    >(
        type: TType,
        data: ServerWsPayloadMap[TType]
    ): void {
        this.wsBroadcast({
            type,
            data,
        } as unknown as TypedServerWsMessage);
    }

    private parseTurnoutInfo(data: Buffer):
        | {
            address: number;
            closed: boolean;
            valid: boolean;
            state: string;
            rawState: number;
            functionAddress: number;
        }
        | null {
        const info = parseTurnoutInfoPacket(data);

        if (!info) {
            logError("Z21 invalid turnout info packet:", bufferToHex(data));
            return null;
        }

        return info;
    }
    private isTurnoutInfoPacket(data: Buffer): boolean {
        return isTurnoutInfoPacket(data);
    }

    private isTurnoutInfoForAddress(data: Buffer, address: number): boolean {
        if (!this.isTurnoutInfoPacket(data)) return false;

        const functionAddress = this.toZ21FunctionAddress(address);

        const msb = data.readUInt8(5);
        const lsb = data.readUInt8(6);

        const packetFunctionAddress = (msb << 8) + lsb;

        return packetFunctionAddress === functionAddress;
    }

    private containsTurnoutInfoForAddress(buffer: Buffer, address: number): boolean {
        try {
            const packets = this.splitZ21Packets(buffer);

            return packets.some((packet) =>
                this.isTurnoutInfoForAddress(packet, address)
            );
        } catch {
            return false;
        }
    }

    private toZ21FunctionAddress(address: number): number {
        if (!Number.isInteger(address) || address < 1) {
            throw new Error(`Invalid turnout address: ${address}`);
        }

        return address - 1;
    }

    private encodeLocoAddress(address: number): { msb: number; lsb: number } {
        if (!Number.isInteger(address) || address < 1 || address > 9999) {
            throw new Error(`Invalid loco address: ${address}`);
        }

        let msb = (address >> 8) & 0x3f;
        const lsb = address & 0xff;

        if (address >= 128) {
            msb |= 0xc0;
        }

        return { msb, lsb };
    }

    private decodeLocoAddress(msb: number, lsb: number): number {
        return ((msb & 0x3f) << 8) | lsb;
    }

    private isLocoInfoPacket(data: Buffer): boolean {
        return isZ21LocoInfoPacket(data);
    }

    private isLocoInfoForAddress(data: Buffer, address: number): boolean {
        if (!this.isLocoInfoPacket(data)) return false;

        const msb = data.readUInt8(5);
        const lsb = data.readUInt8(6);

        const packetAddress = this.decodeLocoAddress(msb, lsb);

        return packetAddress === address;
    }

    private containsLocoInfoForAddress(buffer: Buffer, address: number): boolean {
        try {
            const packets = this.splitZ21Packets(buffer);

            return packets.some((packet) =>
                this.isLocoInfoForAddress(packet, address)
            );
        } catch {
            return false;
        }
    }

    private parseLocoInfo(data: Buffer): LocoState | null {
        const parsed = parseLocoInfoPacket(data);

        if (!parsed) {
            logError("Z21 invalid loco info packet:", bufferToHex(data));
            return null;
        }

        const loco = this.getOrCreateLoco(parsed.address);

        loco.address = parsed.address;
        loco.speed = parsed.speed;
        loco.direction = parsed.direction;

        for (const [fn, active] of Object.entries(parsed.functions)) {
            loco.functions[Number(fn)] = active;
        }

        return loco;
    }
    private broadcastLocoState(loco: LocoState): void {
        this.broadcastWs("locoState", {
            loco,
        });
    }

    private broadcastAccessoryChanged(accessory: AccessoryInfo): void {
        this.broadcastWs("accessoryChanged", {
            address: accessory.address,
            active: accessory.active,
        });

        this.broadcastWs("z21AccessoryInfo", {
            address: accessory.address,
            active: accessory.active,
        });
    }

    private isRBusDataChangedPacket(data: Buffer): boolean {
        return isZ21RBusDataChangedPacket(data);
    }

    private isRBusDataChangedForGroup(data: Buffer, group: number): boolean {
        if (!this.isRBusDataChangedPacket(data)) return false;

        return data.readUInt8(4) === group;
    }

    private containsRBusDataChangedForGroup(buffer: Buffer, group: number): boolean {
        try {
            const packets = this.splitZ21Packets(buffer);

            return packets.some((packet) =>
                this.isRBusDataChangedForGroup(packet, group)
            );
        } catch {
            return false;
        }
    }

    private decodeRBusSensors(
        group: number,
        bytes: number[],
        previousBytes: number[]
    ): RBusSensorInfo[] {
        const changedSensors: RBusSensorInfo[] = [];

        for (let byteIndex = 0; byteIndex < 10; byteIndex++) {
            const currentByte = bytes[byteIndex] ?? 0;
            const previousByte = previousBytes[byteIndex] ?? 0;

            const changedBits = currentByte ^ previousByte;

            if (changedBits === 0) continue;

            for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
                const mask = 1 << bitIndex;

                if ((changedBits & mask) === 0) continue;

                const on = (currentByte & mask) !== 0;

                const moduleAddress = group * 10 + byteIndex + 1;
                const input = bitIndex + 1;

                const address = (moduleAddress - 1) * 8 + input;

                changedSensors.push({
                    address,
                    moduleAddress,
                    input,
                    on,
                    group,
                    byteIndex,
                    bitIndex,
                });
            }
        }

        return changedSensors;
    }

    private broadcastSensorChanged(sensor: RBusSensorInfo): void {
        this.broadcastWs("sensorChanged", {
            address: sensor.address,
            on: sensor.on,
        });

        this.broadcastWs("rbusSensorChanged", sensor);
    }
}

function hasFlag(value: number, flag: number): boolean {
    return (value & flag) === flag;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;

    return Math.max(min, Math.min(max, Math.round(value)));
}

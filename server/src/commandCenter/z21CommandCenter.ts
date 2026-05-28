import {
    CommandCenter,
} from "./CommandCenter.js";

import type {
    AccessoryInfo,
    Direction,
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

import {
    log,
    logError,
} from "../utility.js";

import {
    UdpClient,
    bufferToHex,
    type UdpMessage,
} from "./udpClient.js";

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
    decodeRBusSensors,
    parseLocoInfoPacket,
    parseRBusDataChangedPacket,
    parseSystemStatePacket,
    parseTurnoutInfoPacket,
} from "./z21/z21Parsers.js";

import {
    BC_ALL,
    BC_RBUS,
    BC_SYSTEM_STATE,
    LAN_RMBUS_DATACHANGED,
    LAN_SET_BROADCASTFLAGS,
    LAN_SYSTEMSTATE_DATACHANGED,
    LAN_X_HEADER,
    LAN_X_LOCO_INFO,
    LAN_X_TURNOUT_INFO,
    buildZ21Packet,
    decodeLocoAddress,
    sleep,
    splitZ21Packets,
    toZ21FunctionAddress,
} from "./z21/z21Protocol.js";

type WsBroadcaster = (
    message: TypedServerWsMessage
) => void;

export type Z21SystemState =
    Z21SystemStatePayload;

export class Z21CommandCenter extends CommandCenter {
    ip = "";
    port = 21105;
    udpClient: UdpClient;
    locoSubscribeTask: NodeJS.Timeout | undefined = undefined;

    public lastMessageReceived = Date.now();
    public pollingTask: NodeJS.Timeout | undefined;

    private lastSystemState: Z21SystemState | undefined = undefined;
    private readonly wsBroadcast: WsBroadcaster;
    timeoutMs = 1500;

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
            timeoutMs: this.timeoutMs,
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
        });

        this.udpClient.on("close", () => {
            log("Z21 UDP closed");
        });
    }

    override isAlive(): boolean {
        return this.udpClient.isOpen;
    }

    getConnectionString(): string {
        return `z21://${this.ip}:${this.port}`;
    }

    async start(): Promise<boolean> {
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
            this.stopPollingTask();
            this.stopLocoSubscribePolling();
            this.udpClient.close();

            return false;
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
        }
    }

    clientConnected(): void {
        this.broadcastCommandCenterInfo(this.isAlive());

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

    async setTurnout(
        address: number,
        closed: boolean
    ): Promise<boolean> {
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

    async getTurnout(
        address: number
    ): Promise<TurnoutInfo | null> {
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

    protected override async setPhysicalLoco(
        address: number,
        speed: number,
        physicalDirection: Direction,
        logicalDirection: Direction
    ): Promise<boolean> {
        try {
            const {
                normalizedSpeed,
                packet,
            } = buildSetLocoDrivePacket(
                address,
                speed,
                physicalDirection
            );

            log("Z21 setLoco:", {
                address,
                speed,
                normalizedSpeed,
                logicalDirection,
                physicalDirection,
                packet: bufferToHex(packet),
            });

            await this.udpClient.send(packet);

            const loco = this.setLocoRuntimeStateSync(
                address,
                normalizedSpeed,
                logicalDirection
            );

            this.broadcastLocoState(loco);
            this.scheduleLocoRefresh(address, "setLoco");

            return true;
        } catch (error) {
            logError("Z21 setLoco failed:", {
                address,
                speed,
                logicalDirection,
                physicalDirection,
                error,
            });

            return false;
        }
    }

    async getLoco(
        address: number
    ): Promise<LocoState | null> {
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
            this.scheduleLocoRefresh(
                address,
                "setLocoFunction"
            );

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

    async setBasicAccessory(
        address: number,
        active: boolean
    ): Promise<boolean> {
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

    getAccessory(
        address: number
    ): Promise<AccessoryInfo | null> {
        return Promise.resolve(
            this.accessories.get(address) ?? null
        );
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

    async getSensor(
        address: number
    ): Promise<SensorInfo | null> {
        return Promise.resolve(
            this.sensors.get(address) ?? null
        );
    }

    parse(data: Buffer): void {
        if (data.length < 4) {
            return;
        }

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
            const state = parseSystemStatePacket(data);

            this.lastSystemState = state;

            this.broadcastWs("z21SystemState", state);
            this.broadcastWs("powerInfo", state.powerInfo);

            return;
        }

        if (header === 0x0010 && len === 0x08) {
            const serialNumber = data.readUInt32LE(4);

            log("Z21 serial number:", serialNumber);

            this.broadcastWs("z21SerialNumber", {
                serialNumber,
            });
            return;
        }

        if (header === LAN_RMBUS_DATACHANGED) {
            this.parseRBusDataChanged(data);
            return;
        }

        log("Z21 unhandled packet:", bufferToHex(data));
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
            0x08, 0x00,
            0x50, 0x00,
            0x03, 0x01, 0x00, 0x00,
        ]);
    }

    private async initZ21Connection(): Promise<void> {
        await this.init();
        await this.resubscribeLocos();
    }

    private onUdpMessage(
        buffer: Buffer,
        remoteAddress: string,
        remotePort: number
    ): void {
        try {
            const packets = splitZ21Packets(buffer);

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

    private parseLanX(data: Buffer): void {
        const len = data.readUInt16LE(0);

        if (data.length < 5) {
            return;
        }

        const xHeader = data.readUInt8(4);

        if (
            (len === 0x1109 || len === 0x09) &&
            xHeader === LAN_X_TURNOUT_INFO
        ) {
            this.applyTurnoutInfo(data);
            return;
        }

        if (xHeader === LAN_X_LOCO_INFO) {
            this.applyLocoInfo(data);
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

    private applyTurnoutInfo(data: Buffer): void {
        const info = parseTurnoutInfoPacket(data);

        if (!info) {
            logError("Z21 invalid turnout info packet:", bufferToHex(data));
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
    }

    private applyLocoInfo(data: Buffer): void {
        const parsed = parseLocoInfoPacket(data);

        if (!parsed) {
            logError("Z21 invalid loco info packet:", bufferToHex(data));
            return;
        }

        const loco = this.setLocoRuntimeStateFromPhysical(
            parsed.address,
            parsed.speed,
            parsed.direction
        );

        for (const [fn, active] of Object.entries(parsed.functions)) {
            loco.functions[Number(fn)] = active;
        }

        this.broadcastLocoState(loco);

        log("Z21 loco info:", loco);
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

    private async setBroadcastFlags(flags: number): Promise<void> {
        const payload = Buffer.alloc(4);
        payload.writeUInt32LE(flags, 0);

        const packet = buildZ21Packet(
            LAN_SET_BROADCASTFLAGS,
            payload
        );

        await this.udpClient.send(packet);

        log("Z21 broadcast flags sent:", {
            flags,
            hex: `0x${flags.toString(16).padStart(8, "0")}`,
        });
    }

    private async resubscribeBroadcastFlags(): Promise<void> {
        const flags = BC_ALL | BC_RBUS | BC_SYSTEM_STATE;

        await this.setBroadcastFlags(flags);

        log("Z21 broadcast flags resubscribed", {
            flags,
        });
    }

    private startPollingTask(): void {
        this.stopPollingTask();

        this.pollZ21().catch(error => {
            logError("Z21 initial poll failed:", error);
        });

        this.pollingTask = setInterval(() => {
            const diff = Date.now() - this.lastMessageReceived;

            if (diff > this.timeoutMs) {
                this.pollZ21().catch(error => {
                    logError("Z21 polling failed:", error);
                });

                if (diff > this.timeoutMs * 2) {
                    logError("Z21 connection seems lost, no response for", {
                        diff,
                        timeoutMs: this.timeoutMs,
                    });
                    this.broadcastCommandCenterInfo(false);
                }
            }
        }, 1000);

        this.pollingTask.unref?.();
    }

    private stopPollingTask(): void {
        if (this.pollingTask) {
            clearInterval(this.pollingTask);
            this.pollingTask = undefined;
        }
    }

    private async pollZ21(): Promise<void> {
        await this.LAN_SYSTEMSTATE_GETDATA();
        await this.LAN_SET_BROADCASTFLAGS();
    }

    private startLocoSubscribePolling(): void {
        this.stopLocoSubscribePolling();

        void this.resubscribeLocos().catch(error => {
            logError("Z21 initial loco resubscribe failed:", error);
        });

        this.locoSubscribeTask = setInterval(() => {
            void this.resubscribeLocos().catch(error => {
                logError("Z21 periodic loco resubscribe failed:", error);
            });
        }, 60_000);

        this.locoSubscribeTask.unref?.();
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
            addresses: locosToSubscribe.map(loco => loco.address),
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

    private scheduleLocoRefresh(
        address: number,
        source: string
    ): void {
        const timer = setTimeout(() => {
            void this.getLoco(address).catch(error => {
                logError("Z21 delayed getLoco failed:", {
                    address,
                    source,
                    error,
                });
            });
        }, 150);

        timer.unref?.();
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

    private broadcastSensorChanged(sensor: RBusSensorInfo): void {
        this.broadcastWs("sensorChanged", {
            address: sensor.address,
            on: sensor.on,
        });

        this.broadcastWs("rbusSensorChanged", sensor);
    }

    private isTurnoutInfoForAddress(
        data: Buffer,
        address: number
    ): boolean {
        const info = parseTurnoutInfoPacket(data);

        return info?.functionAddress === toZ21FunctionAddress(address);
    }

    private containsTurnoutInfoForAddress(
        buffer: Buffer,
        address: number
    ): boolean {
        try {
            return splitZ21Packets(buffer).some(packet =>
                this.isTurnoutInfoForAddress(packet, address)
            );
        } catch {
            return false;
        }
    }
}

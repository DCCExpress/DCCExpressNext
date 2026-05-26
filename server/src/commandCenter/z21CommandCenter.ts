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

            const loco =
                await this.setLocoRuntimeState(
                    address,
                    normalizedSpeed,
                    direction
                );

            this.broadcastLocoState(loco);
            this.scheduleLocoRefresh(address, "setLoco");

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

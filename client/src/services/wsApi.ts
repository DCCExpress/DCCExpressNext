// src/services/wsApi.ts

import type {
  ClientWsMessageType,
  ClientWsPayloadMap,
  Direction,
  ScriptRunSource,
  TypedClientWsMessage,
} from "../../../common/src/types";

import {
  generateId,
} from "../helpers";

import {
  wsClient,
} from "./wsClient";

class WebSocketApi {
  private readonly uuid =
    generateId();

  get clientUuid(): string {
    return this.uuid;
  }

  connect(url: string): void {
    wsClient.connect(url);
  }

  disconnect(): void {
    wsClient.disconnect();
  }

  send<TType extends ClientWsMessageType>(
    type: TType,
    data: ClientWsPayloadMap[TType]
  ): boolean {
    const message: TypedClientWsMessage<TType> = {
      type,
      data,
      uuid: this.uuid,
    };

    return wsClient.send(message);
  }

  setTrackPower(on: boolean): boolean {
    return this.send("setTrackPower", {
      on,
    });
  }

  powerOn(): boolean {
    return this.setTrackPower(true);
  }

  powerOff(): boolean {
    return this.setTrackPower(false);
  }

  setProgrammingPower(on: boolean): boolean {
    return this.send("setProgrammingPower", {
      on,
    });
  }

  writeDccExDirectCommand(command: string): boolean {
    return this.send("writeDccExDirectCommand", {
      command,
    });
  }

  emergencyStop(): boolean {
    return this.send("emergencyStop", {});
  }

  setLoco(
    locoAddress: number,
    speed: number,
    direction: Direction
  ): boolean {
    return this.send("setLoco", {
      locoAddress,
      speed,
      direction,
    });
  }

  getLoco(locoAddress: number): boolean {
    return this.send("getLoco", {
      locoAddress,
    });
  }

  setLocoFunction(
    locoAddress: number,
    functionNumber: number,
    active: boolean
  ): boolean {
    return this.send("setLocoFunction", {
      locoAddress,
      functionNumber,
      active,
    });
  }

  setTurnout(
    address: number,
    closed: boolean
  ): boolean {
    return this.send("setTurnout", {
      address,
      closed,
    });
  }

  setBasicAccessory(
    address: number,
    active: boolean
  ): boolean {
    return this.send("setBasicAccessory", {
      address,
      active,
    });
  }

  setBlock(
    blockId: string,
    locoId: string | null
  ): boolean {
    return this.send("setBlock", {
      blockId,
      locoId,
    });
  }

  setBlockRemove(
    blockId: string,
    locoId: string | null
  ): boolean {
    return this.send("setBlockRemove", {
      blockId,
      locoId,
    });
  }

  setBlocksReset(): boolean {
    return this.send("setBlocksReset", {});
  }

  getBlocks(): boolean {
    return this.send("getBlocks", {});
  }

  routeLock(): boolean {
    return this.send("routeLock", {});
  }

  routeUnlock(): boolean {
    return this.send("routeUnlock", {});
  }

  reserveRoute(
    fromBlockName: string,
    toBlockName: string
  ): boolean {
    return this.send("reserveRoute", {
      fromBlockName,
      toBlockName,
    });
  }

  releaseRouteReservation(
    fromBlockName: string,
    toBlockName: string
  ): boolean {
    return this.send("releaseRouteReservation", {
      fromBlockName,
      toBlockName,
    });
  }

  clearAllRouteReservations(): boolean {
    return this.send(
      "clearAllRouteReservations",
      {}
    );
  }

  getRouteReservations(): boolean {
    return this.send(
      "getRouteReservations",
      {}
    );
  }

  runScript(
    script?: string,
    context?: {
      source?: ScriptRunSource;
      elementId?: string | null;
    }
  ): boolean {
    return this.send("runScript", {
      ...(typeof script === "string"
        ? {
            script,
          }
        : {}),
      source: context?.source ?? "unknown",
      elementId: context?.elementId ?? null,
    });
  }

  stopScript(): boolean {
    return this.send("stopScript", {});
  }

  getScriptRuntimeState(): boolean {
    return this.send(
      "getScriptRuntimeState",
      {}
    );
  }

  startTask(
    taskIdOrName: string
  ): boolean {
    return this.send("startTask", {
      taskIdOrName,
    });
  }

  pauseTask(
    taskIdOrName: string
  ): boolean {
    return this.send("pauseTask", {
      taskIdOrName,
    });
  }

  resumeTask(
    taskIdOrName: string
  ): boolean {
    return this.send("resumeTask", {
      taskIdOrName,
    });
  }

  getTaskRuntimeState(): boolean {
    return this.send(
      "getTaskRuntimeState",
      {}
    );
  }
}

export function getDefaultWsUrl(): string {
  const protocol =
    window.location.protocol === "https:"
      ? "wss"
      : "ws";

  const host =
    window.location.hostname;

  const port =
    3000;

  return `${protocol}://${host}:${port}/ws`;
}

export const wsApi =
  new WebSocketApi();

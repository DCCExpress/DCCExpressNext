// src/services/wsApi.ts

import type {
  ClientWsMessageType,
  ClientWsPayloadMap,
  Direction,
  ReservationOwnerType,
  ScriptRunSource,
  ServerWsMessageType,
  ServerWsPayloadMap,
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

  request<
    TClientType extends ClientWsMessageType,
    TServerType extends ServerWsMessageType
  >(
    clientType: TClientType,
    data: ClientWsPayloadMap[TClientType],
    responseType: TServerType,
    matches: (
      data: ServerWsPayloadMap[TServerType]
    ) => boolean,
    timeoutMs = 10000
  ): Promise<ServerWsPayloadMap[TServerType]> {
    return new Promise((resolve, reject) => {
      let timeoutHandle: number | null = null;

      const unsubscribe = wsClient.on(responseType, responseData => {
        if (!matches(responseData)) {
          return;
        }

        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle);
        }

        unsubscribe();
        resolve(responseData);
      });

      timeoutHandle = window.setTimeout(() => {
        unsubscribe();
        reject(
          new Error(
            `WebSocket request timed out: ${String(clientType)}`
          )
        );
      }, timeoutMs);

      const sent = this.send(clientType, data);

      if (!sent) {
        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle);
        }

        unsubscribe();
        reject(
          new Error("WebSocket is not connected.")
        );
      }
    });
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

  reserveLoco(
    locoAddress: number,
    ownerId: string,
    ownerType: ReservationOwnerType,
    ownerName?: string,
    reason?: string
  ): boolean {
    return this.send("reserveLoco", {
      locoAddress,
      ownerId,
      ownerType,
      ...(ownerName !== undefined
        ? { ownerName }
        : {}),
      ...(reason !== undefined
        ? { reason }
        : {}),
    });
  }

  releaseLocoReservation(
    locoAddress: number,
    ownerId: string
  ): boolean {
    return this.send("releaseLocoReservation", {
      locoAddress,
      ownerId,
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

  finishAllTasks(): boolean {
    return this.send("finishAllTasks", {});
  }

  abortAllTasks(): boolean {
    return this.send("abortAllTasks", {});
  }

  finishTask(
    taskIdOrName: string
  ): boolean {
    return this.send("finishTask", {
      taskIdOrName,
    });
  }

  abortTask(
    taskIdOrName: string
  ): boolean {
    return this.send("finishTask", {
      taskIdOrName,
    });
  }

  setEditorEditMode(editMode: boolean): boolean {
    return this.send("setEditorEditMode", {
      editMode,
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

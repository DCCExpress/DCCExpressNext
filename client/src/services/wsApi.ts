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

  private waitUntilConnected(
    timeoutMs: number
  ): Promise<void> {
    if (wsClient.isConnected()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let timeoutHandle: number | null = null;

      const unsubscribe = wsClient.subscribeStatus(status => {
        if (status !== "connected") {
          return;
        }

        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle);
        }

        unsubscribe();
        resolve();
      });

      timeoutHandle = window.setTimeout(() => {
        unsubscribe();
        reject(
          new Error("WebSocket connection timed out.")
        );
      }, timeoutMs);
    });
  }

  async request<
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
    await this.waitUntilConnected(timeoutMs);

    return new Promise((resolve, reject) => {
      let timeoutHandle: number | null = null;
      let settled = false;
      let unsubscribeResponse: () => void = () => {};
      let unsubscribeStatus: () => void = () => {};

      const cleanup = (): void => {
        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        unsubscribeResponse();
        unsubscribeStatus();
      };

      const resolveOnce = (
        responseData: ServerWsPayloadMap[TServerType]
      ): void => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(responseData);
      };

      const rejectOnce = (error: Error): void => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      };

      unsubscribeResponse = wsClient.on(responseType, responseData => {
        if (!matches(responseData)) {
          return;
        }

        resolveOnce(responseData);
      });

      unsubscribeStatus = wsClient.subscribeStatus(status => {
        if (
          status === "connected" ||
          status === "connecting" ||
          status === "reconnecting"
        ) {
          return;
        }

        rejectOnce(
          new Error(
            `WebSocket request failed because connection is ${status}: ${String(clientType)}`
          )
        );
      });

      timeoutHandle = window.setTimeout(() => {
        rejectOnce(
          new Error(
            `WebSocket request timed out: ${String(clientType)}`
          )
        );
      }, timeoutMs);

      const sent = this.send(clientType, data);

      if (!sent) {
        rejectOnce(
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

  setSensor(
    address: number,
    on: boolean
  ): boolean {
    return this.send("setSensor", {
      address,
      on,
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
      route?: {
        fromBlockName?: string;
        toBlockName?: string;
      };
    }
  ): boolean {
    return this.send("runScript", {
      script,
      context,
    });
  }

  stopScript(): boolean {
    return this.send("stopScript", {});
  }

  getScriptRuntimeState(): boolean {
    return this.send("getScriptRuntimeState", {});
  }

  startTask(taskId: string): boolean {
    return this.send("startTask", {
      taskId,
    });
  }

  startAllTasks(): boolean {
    return this.send("startAllTasks", {});
  }

  pauseTask(taskId: string): boolean {
    return this.send("pauseTask", {
      taskId,
    });
  }

  pauseAllTasks(): boolean {
    return this.send("pauseAllTasks", {});
  }

  resumeTask(taskId: string): boolean {
    return this.send("resumeTask", {
      taskId,
    });
  }

  finishTask(taskId: string): boolean {
    return this.send("finishTask", {
      taskId,
    });
  }

  finishAllTasks(): boolean {
    return this.send("finishAllTasks", {});
  }

  abortTask(taskId: string): boolean {
    return this.send("abortTask", {
      taskId,
    });
  }

  abortAllTasks(): boolean {
    return this.send("abortAllTasks", {});
  }

  getTaskRuntimeState(): boolean {
    return this.send("getTaskRuntimeState", {});
  }

  setRuntimeVariable(
    name: string,
    value: unknown
  ): boolean {
    return this.send("setRuntimeVariable", {
      name,
      value,
    });
  }

  getRuntimeVariables(): boolean {
    return this.send("getRuntimeVariables", {});
  }

  setEditorEditMode(
    editing: boolean
  ): boolean {
    return this.send("setEditorEditMode", {
      editing,
    });
  }
}

export const wsApi =
  new WebSocketApi();

import type {
  ClientWsMessageType,
  ClientWsPayloadMap,
  Direction,
  LocosResponsePayload,
  ServerWsMessageType,
  ServerWsPayloadMap,
  TypedClientWsMessage,
} from "../../../common/src/types";

import { generateId } from "./generateId";
import { wsClient } from "./wsClient";

class WebSocketApi {
  private readonly uuid = generateId();

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

  async request<
    TClientType extends ClientWsMessageType,
    TServerType extends ServerWsMessageType
  >(
    clientType: TClientType,
    data: ClientWsPayloadMap[TClientType],
    responseType: TServerType,
    matches: (data: ServerWsPayloadMap[TServerType]) => boolean,
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

      const resolveOnce = (responseData: ServerWsPayloadMap[TServerType]): void => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(responseData);
      };

      const rejectOnce = (error: Error): void => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      unsubscribeResponse = wsClient.on(responseType, responseData => {
        if (!matches(responseData)) return;
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
          new Error(`WebSocket request failed because connection is ${status}.`)
        );
      });

      timeoutHandle = window.setTimeout(() => {
        rejectOnce(new Error(`WebSocket request timed out: ${String(clientType)}`));
      }, timeoutMs);

      const sent = this.send(clientType, data);
      if (!sent) rejectOnce(new Error("WebSocket is not connected."));
    });
  }

  async loadLocos(): Promise<LocosResponsePayload> {
    const requestId = generateId();

    return this.request(
      "locosCommand",
      { requestId, action: "load" },
      "locosResponse",
      response => response.requestId === requestId
    );
  }

  getLoco(locoAddress: number): boolean {
    return this.send("getLoco", { locoAddress });
  }

  setLoco(locoAddress: number, speed: number, direction: Direction): boolean {
    return this.send("setLoco", { locoAddress, speed, direction });
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

  setTrackPower(on: boolean): boolean {
    return this.send("setTrackPower", { on });
  }

  powerOn(): boolean {
    return this.setTrackPower(true);
  }

  emergencyStop(): boolean {
    return this.send("emergencyStop", {});
  }

  private waitUntilConnected(timeoutMs: number): Promise<void> {
    if (wsClient.isConnected()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let timeoutHandle: number | null = null;
      let unsubscribe: () => void = () => {};
      let settled = false;

      const cleanup = (): void => {
        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        unsubscribe();
      };

      const resolveOnce = (): void => {
        if (settled || !wsClient.isConnected()) {
          return;
        }

        settled = true;
        cleanup();
        resolve();
      };

      unsubscribe = wsClient.subscribeStatus(status => {
        if (status === "connected") {
          resolveOnce();
        }
      });

      timeoutHandle = window.setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(new Error("WebSocket connection timed out."));
      }, timeoutMs);

      resolveOnce();
    });
  }
}

export const wsApi = new WebSocketApi();

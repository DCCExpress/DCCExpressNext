import type { WebSocket } from "ws";

export type RegisteredClient = {
  clientId: string;
  friendlyName: string;
};

class ClientRegistryStore {
  private readonly clientsBySocket = new Map<WebSocket, RegisteredClient>();

  register(ws: WebSocket, clientId: string, friendlyName: string): RegisteredClient {
    const client = {
      clientId,
      friendlyName: friendlyName.trim() || clientId,
    };

    this.clientsBySocket.set(ws, client);
    return client;
  }

  touch(ws: WebSocket, clientId: string): void {
    const existing = this.clientsBySocket.get(ws);

    if (existing?.clientId === clientId) {
      return;
    }

    this.clientsBySocket.set(ws, {
      clientId,
      friendlyName: existing?.friendlyName || clientId,
    });
  }

  remove(ws: WebSocket): void {
    this.clientsBySocket.delete(ws);
  }

  getSnapshot(): RegisteredClient[] {
    const byClientId = new Map<string, RegisteredClient>();

    for (const client of this.clientsBySocket.values()) {
      byClientId.set(client.clientId, client);
    }

    return [...byClientId.values()].sort((a, b) =>
      a.friendlyName.localeCompare(b.friendlyName)
    );
  }

  getSocketsByClientId(clientId: string): WebSocket[] {
    const result: WebSocket[] = [];

    for (const [ws, client] of this.clientsBySocket.entries()) {
      if (client.clientId === clientId) {
        result.push(ws);
      }
    }

    return result;
  }
}

export const clientRegistryStore = new ClientRegistryStore();

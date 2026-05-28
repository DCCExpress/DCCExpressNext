console.log("\x1b[2J");

console.log('██████   ██████  ██████ ███████ ██   ██ ██████  ██████  ███████ ███████ ███████ ');
console.log('██   ██ ██      ██      ██       ██ ██  ██   ██ ██   ██ ██      ██      ██      ');
console.log('██   ██ ██      ██      █████     ███   ██████  ██████  █████   ███████ ███████ ');
console.log('██   ██ ██      ██      ██       ██ ██  ██      ██   ██ ██           ██      ██ ');
console.log('██████   ██████  ██████ ███████ ██   ██ ██      ██   ██ ███████ ███████ ███████ ');
console.log('');
//console.log('2025.02.03  v.1.0')
//console.log('');

import http from "node:http";

import type {
  WebSocketServer,
} from "ws";

import {
  app,
  getLanIpv4Addresses,
} from "./app.js";

import {
  setupWebSocketServer,
} from "./ws/wsServer.js";

import {
  dataDir,
  distDir,
} from "./paths.js";

import {
  log,
  logError,
} from "./utility.js";
import { layoutRuntimeStore } from "./services/layoutRuntimeStore.js";



const DEFAULT_PORT = 3000;
const SHUTDOWN_TIMEOUT_MS = 5000;

function readPort(): number {
  const raw = process.env.PORT ?? process.env.DCCEXPRESS_PORT;

  if (!raw) {
    return DEFAULT_PORT;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    logError(
      "Invalid PORT/DCCEXPRESS_PORT value, falling back to default:",
      raw
    );

    return DEFAULT_PORT;
  }

  return parsed;
}

const PORT = readPort();

let shuttingDown = false;

process.on("unhandledRejection", reason => {
  logError("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", error => {
  logError("Uncaught exception:", error);
});

function closeWebSocketServer(wss: WebSocketServer): void {
  for (const client of wss.clients) {
    client.close();
  }

  wss.close(error => {
    if (error) {
      logError("WebSocket server close failed:", error);
      return;
    }

    log("WebSocket server closed.");
  });
}

function registerGracefulShutdown(
  server: http.Server,
  wss: WebSocketServer
): void {
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    log(`Received ${signal}, closing servers...`);

    const closeTimer = setTimeout(() => {
      logError(
        `Server did not close within ${SHUTDOWN_TIMEOUT_MS}ms.`
      );

      process.exitCode = 1;
    }, SHUTDOWN_TIMEOUT_MS);

    closeTimer.unref?.();

    closeWebSocketServer(wss);

    server.close(error => {
      clearTimeout(closeTimer);

      if (error) {
        logError("HTTP server close failed:", error);
        process.exitCode = 1;
      } else {
        log("HTTP server closed.");
        process.exitCode = 0;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

async function bootstrap(): Promise<void> {
  await layoutRuntimeStore.initialize();

  const server = http.createServer(app);

  const wss =
    await setupWebSocketServer(server);

  registerGracefulShutdown(server, wss);

  server.listen(PORT, "0.0.0.0", () => {
    log(`Server listening on http://0.0.0.0:${PORT}`);
    log("Server address:", server.address());
    log("Dist:", distDir);
    log("DataDir:", dataDir);


    const addr = getLanIpv4Addresses();
    if(addr.length > 0) {
      console.log("http://" + addr[0]?.address + ":" + PORT);
    }
    
  });
}

void bootstrap().catch(error => {
  logError("Server bootstrap failed:", error);
  process.exitCode = 1;
});
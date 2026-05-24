import http from "node:http";

import {
  app,
} from "./app.js";

import {
  setupWebSocketServer,
} from "./ws/wsServer.js";

import {
  dataDir,
  distDir,
} from "./paths.js";

import {
  layoutRuntimeStore,
} from "./services/layoutRuntimeStore.js";

import {
  log,
  logError,
} from "./utility.js";

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

function registerGracefulShutdown(server: http.Server): void {
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    log(`Received ${signal}, closing HTTP server...`);

    const forceExitTimer = setTimeout(() => {
      logError(
        `HTTP server did not close within ${SHUTDOWN_TIMEOUT_MS}ms, forcing shutdown.`
      );

      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    forceExitTimer.unref?.();

    server.close(error => {
      clearTimeout(forceExitTimer);

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

  await setupWebSocketServer(server);

  registerGracefulShutdown(server);

  server.listen(PORT, "0.0.0.0", () => {
    log(`Server listening on http://0.0.0.0:${PORT}`);
    log("Server address:", server.address());
    log("Dist:", distDir);
    log("DataDir:", dataDir);
  });
}

void bootstrap().catch(error => {
  logError("Server bootstrap failed:", error);
  process.exitCode = 1;
});

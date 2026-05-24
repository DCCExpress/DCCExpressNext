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

const PORT = 3000;

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

    server.close(error => {
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

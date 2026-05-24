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

process.on("unhandledRejection", reason => {
  logError("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", error => {
  logError("Uncaught exception:", error);
});

async function bootstrap(): Promise<void> {
  await layoutRuntimeStore.initialize();

  const server = http.createServer(app);

  await setupWebSocketServer(server);

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

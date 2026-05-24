import http from "node:http";
import { app } from "./app.js";
import { setupWebSocketServer } from "./ws/wsServer.js";
import { dataDir, distDir } from "./paths.js";
import { layoutRuntimeStore } from "./services/layoutRuntimeStore.js";

const PORT = 3000;

async function bootstrap() {
  await layoutRuntimeStore.initialize();

  const server = http.createServer(app);

  await setupWebSocketServer(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(server.address());
    console.log("Dist: ", distDir);
    console.log("DataDir:", dataDir);
  });
}

void bootstrap();
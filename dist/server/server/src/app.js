import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { locoRoutes } from "./routes/locoRoutes.js";
import { layoutRoutes } from "./routes/layoutRoutes.js";
import { commandCenterRoutes } from "./routes/commandCenterRoutes.js";
import { clientDir, dataDir } from "./paths.js";
import { createScriptRouter } from "./routes/scriptRoute.js";
import { createTaskRouter } from "./routes/taskRoutes.js";
import { fileRoutes } from "./routes/fileRoutes.js";
import { fastClockRoutes } from "./routes/fastClockRoutes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/locos", locoRoutes);
app.use("/api/layout", layoutRoutes);
app.use("/api/command-centers", commandCenterRoutes);
app.use("/api/script", createScriptRouter(dataDir));
app.use("/api/tasks", createTaskRouter());
app.use("/api/files", fileRoutes);
app.use("/api/fast-clock", fastClockRoutes);
app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});
// production frontend
app.use(express.static(clientDir));
app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
});
async function shutdown(signal) {
    console.log(`[Server] ${signal} received, shutting down...`);
    process.exit(0);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

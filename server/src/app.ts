import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { locoRoutes } from "./routes/locoRoutes.js";
import { layoutRoutes } from "./routes/layoutRoutes.js";
import { commandCenterRoutes } from "./routes/commandCenterRoutes.js";
import { clientDir, dataDir } from "./paths.js";
import { createScriptRouter } from "./routes/scriptRoute.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));


//app.use("/images", express.static(path.join(publicDir, "images")));

app.use("/api/locos", locoRoutes);
app.use("/api/layout", layoutRoutes);
app.use("/api/command-centers", commandCenterRoutes);
app.use("/api/script", createScriptRouter(dataDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// production frontend
app.use(express.static(clientDir));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});


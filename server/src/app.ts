import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import path from "node:path";
import { clientDir, mobileDir } from "./paths.js";
import { logError } from "./utility.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use((
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      ok: false,
      message: "Invalid JSON request body.",
    });
    return;
  }

  next(error);
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "DCCExpressNext",
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  });
});

app.use("/api", (_req, res) => {
  res.status(404).json({
    ok: false,
    message: "API endpoint not found.",
  });
});

// production mobile frontend
app.use("/mobile", express.static(mobileDir));

app.get(/^\/mobile(?:\/.*)?$/, (_req, res) => {
  res.sendFile(path.join(mobileDir, "index.html"));
});

// production desktop frontend
app.use(express.static(clientDir));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.use((
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logError("Unhandled Express error:", error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    ok: false,
    message: "Internal server error.",
  });
});

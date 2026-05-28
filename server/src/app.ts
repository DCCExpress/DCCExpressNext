import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import os from "node:os";
import path from "node:path";
import { clientDir, mobileDir } from "./paths.js";
import { logError } from "./utility.js";

export const app = express();

type NetworkAddressInfo = {
  name: string;
  address: string;
  score: number;
};

const VIRTUAL_INTERFACE_PATTERNS = [
  "virtualbox",
  "vmware",
  "hyper-v",
  "vethernet",
  "docker",
  "wsl",
  "loopback",
  "tap",
  "npcap",
  "zerotier",
  "tailscale",
] as const;

function isVirtualOrHostOnlyInterface(name: string, address: string): boolean {
  const normalizedName = name.toLowerCase();

  if (VIRTUAL_INTERFACE_PATTERNS.some(pattern => normalizedName.includes(pattern))) {
    return true;
  }

  if (address.startsWith("192.168.56.")) {
    return true;
  }

  return false;
}

function scoreAddress(name: string, address: string): number {
  const normalizedName = name.toLowerCase();

  if (address.startsWith("192.168.1.")) {
    return 100;
  }

  if (address.startsWith("192.168.0.")) {
    return 90;
  }

  if (address.startsWith("192.168.")) {
    return 80;
  }

  if (address.startsWith("10.")) {
    return 70;
  }

  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) {
    return 60;
  }

  if (normalizedName.includes("wi-fi") || normalizedName.includes("wifi")) {
    return 50;
  }

  if (normalizedName.includes("ethernet")) {
    return 45;
  }

  return 10;
}

export function getLanIpv4Addresses(): NetworkAddressInfo[] {
  const physical: NetworkAddressInfo[] = [];
  const fallback: NetworkAddressInfo[] = [];
  const interfaces = os.networkInterfaces();

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const item of addresses ?? []) {
      if (item.family !== "IPv4" || item.internal) {
        continue;
      }

      const entry = {
        name,
        address: item.address,
        score: scoreAddress(name, item.address),
      };

      if (isVirtualOrHostOnlyInterface(name, item.address)) {
        fallback.push(entry);
        continue;
      }

      physical.push(entry);
    }
  }

  const result = physical.length > 0 ? physical : fallback;

  return result.sort((a, b) => b.score - a.score);
}

function readRequestPort(req: Request): number {
  const host = req.get("host") ?? "";
  const portText = host.split(":")[1];
  const parsed = Number(portText);

  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }

  return 3000;
}

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

app.get("/api/network", (req, res) => {
  const port = readRequestPort(req);
  const protocol = req.protocol;
  const addresses = getLanIpv4Addresses();

  res.json({
    ok: true,
    hostName: os.hostname(),
    port,
    addresses: addresses.map(({ name, address }) => ({ name, address })),
    urls: addresses.map(item => ({
      name: item.name,
      address: item.address,
      desktop: `${protocol}://${item.address}:${port}/`,
      mobile: `${protocol}://${item.address}:${port}/mobile/`,
    })),
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

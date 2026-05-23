import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../paths.js";

export const fileRoutes = Router();

export function safeDataFilePath(fileName: string): string {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("Missing file name");
  }

  const normalized = fileName.replaceAll("\\", "/");

  if (normalized.includes("..")) {
    throw new Error("Invalid file name");
  }

  const fullPath = path.resolve(dataDir, normalized);
  const root = path.resolve(dataDir);

  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) {
    throw new Error("Invalid file path");
  }

  return fullPath;
}

export async function readDataFile(fileName: string): Promise<string> {
  const filePath = safeDataFilePath(fileName);
  return fs.readFile(filePath, "utf8");
}

export async function writeDataFile(fileName: string, content: string): Promise<void> {
  const filePath = safeDataFilePath(fileName);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export async function readDataJsonFile(fileName: string): Promise<unknown> {
  const content = await readDataFile(fileName);
  return JSON.parse(content);
}

export async function writeDataJsonFile(fileName: string, data: unknown): Promise<void> {
  await writeDataFile(
    fileName,
    JSON.stringify(data, null, 2)
  );
}

fileRoutes.get("/", async (req, res) => {
  try {
    const fileName = String(req.query.fn ?? "");
    const content = await readDataFile(fileName);

    res.json({
      success: true,
      fn: fileName,
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

fileRoutes.put("/", async (req, res) => {
  try {
    const { fn, content } = req.body as {
      fn?: string;
      content?: string;
    };

    if (typeof fn !== "string") {
      res.status(400).json({
        success: false,
        message: "Missing file name",
      });
      return;
    }

    if (typeof content !== "string") {
      res.status(400).json({
        success: false,
        message: "Missing file content",
      });
      return;
    }

    await writeDataFile(fn, content);

    res.json({
      success: true,
      fn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

fileRoutes.get("/json", async (req, res) => {
  try {
    const fileName = String(req.query.fn ?? "");
    const data = await readDataJsonFile(fileName);

    res.json({
      success: true,
      fn: fileName,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

fileRoutes.put("/json", async (req, res) => {
  try {
    const { fn, data } = req.body as {
      fn?: string;
      data?: unknown;
    };

    if (typeof fn !== "string") {
      res.status(400).json({
        success: false,
        message: "Missing file name",
      });
      return;
    }

    await writeDataJsonFile(fn, data);

    res.json({
      success: true,
      fn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
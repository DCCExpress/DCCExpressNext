import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../paths.js";

export const fileRoutes = Router();

function safeDataFilePath(fileName: string): string {
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

fileRoutes.get("/", async (req, res) => {
  try {
    const fileName = String(req.query.fn ?? "");
    const filePath = safeDataFilePath(fileName);

    const content = await fs.readFile(filePath, "utf8");

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

    const filePath = safeDataFilePath(fn);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");

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
    const filePath = safeDataFilePath(fileName);

    const content = await fs.readFile(filePath, "utf8");

    res.json({
      success: true,
      fn: fileName,
      data: JSON.parse(content),
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

    const filePath = safeDataFilePath(fn);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");

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
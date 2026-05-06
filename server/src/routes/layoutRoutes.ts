import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../paths.js";

type LayoutElementDto = {
  id: string;
  type: "track" | "trackend";
  x: number;
  y: number;
  rotation?: number;
  width?: number;
  height?: number;
};

export const layoutRoutes = Router();

function resolveFilePath() {
  return path.resolve(dataDir, "layout.json");
}

async function readLayout(): Promise<LayoutElementDto[]> {
  const candidate1 = resolveFilePath();

  try {
    const content = await fs.readFile(candidate1, "utf8");
    return JSON.parse(content) as LayoutElementDto[];
  } catch {
    console.log("READLAYOUT:", "Nem sikerült beolvasni a pályát.", candidate1);
    return [];
  }
}

async function writeLayout(elements: any[]) {
  const candidate1 = resolveFilePath();

  try {
    await fs.mkdir(path.dirname(candidate1), { recursive: true });
    await fs.writeFile(candidate1, JSON.stringify(elements, null, 2), "utf8");
  } catch {
    console.log("WRITELAYOUT:", "Nem sikerült elmenteni a pályát.");
  }
}

layoutRoutes.get("/", async (_req, res) => {
  try {
    const elements = await readLayout();
    res.json(elements);
  } catch (error) {
    console.error("GET /api/layout error:", error);
    res.status(500).json({
      success: false,
      message: "Nem sikerült beolvasni a pályát.",
    });
  }
});

layoutRoutes.put("/", async (req, res) => {
  try {
    // const elements = req.body as LayoutElementDto[];

    // if (!Array.isArray(elements)) {
    //   res.status(400).json({
    //     success: false,
    //     message: "A kérés törzsének pályaelem tömbnek kell lennie.",
    //   });
    //   return;
    // }
    const elements = req.body;
    await writeLayout(elements);

    res.json({
      success: true,
      count: elements.length,
    });
  } catch (error) {
    console.error("PUT /api/layout error:", error);
    res.status(500).json({
      success: false,
      message: "Nem sikerült elmenteni a pályát.",
    });
  }
});
// server/src/routes/script.ts

import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";

export function createScriptRouter(dataDir: string) {
  const router = Router();

  const fileName = path.join(dataDir, "script.json");

  async function ensureFile() {
    await fs.mkdir(dataDir, { recursive: true });

    try {
      await fs.access(fileName);
    } catch {
      await fs.writeFile(
        fileName,
        JSON.stringify(
          {
            content: "",
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        "utf-8"
      );
    }
  }

  router.get("/", async (_req, res) => {
    try {
      await ensureFile();

      const raw = await fs.readFile(fileName, "utf-8");
      const parsed = JSON.parse(raw);

      res.json({
        content: String(parsed.content ?? ""),
        updatedAt: parsed.updatedAt,
      });
    } catch (error) {
      console.error("Failed to read script:", error);
      res.status(500).json({ error: "Failed to read script" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      await fs.mkdir(dataDir, { recursive: true });

      const content = String(req.body?.content ?? "");

      const scriptFile = {
        content,
        updatedAt: new Date().toISOString(),
      };

      await fs.writeFile(
        fileName,
        JSON.stringify(scriptFile, null, 2),
        "utf-8"
      );

      res.json(scriptFile);
    } catch (error) {
      console.error("Failed to save script:", error);
      res.status(500).json({ error: "Failed to save script" });
    }
  });

  return router;
}
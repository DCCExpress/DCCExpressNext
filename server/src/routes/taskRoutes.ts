import { Router } from "express";
import { taskRuntimeStore } from "../services/taskRuntimeStore.js";

export function createTaskRouter() {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      await taskRuntimeStore.initialize();

      res.json(
        taskRuntimeStore.getDocument()
      );
    } catch (error) {
      console.error(
        "Failed to read tasks:",
        error
      );

      res.status(500).json({
        error: "Failed to read tasks",
      });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const saved =
        await taskRuntimeStore.saveDocument({
          tasks:
            Array.isArray(req.body?.tasks)
              ? req.body.tasks
              : [],
        });

      res.json(saved);
    } catch (error) {
      console.error(
        "Failed to save tasks:",
        error
      );

      res.status(500).json({
        error: "Failed to save tasks",
      });
    }
  });

  return router;
}

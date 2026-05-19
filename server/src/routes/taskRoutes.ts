import { Router } from "express";

import { taskRuntimeStore } from "../services/taskRuntimeStore.js";

import type {
  TrainTaskCreateInput,
} from "../../../common/src/task.js";

export function createTaskRouter() {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      await taskRuntimeStore.initialize();

      res.json(
        taskRuntimeStore.getSnapshot()
      );
    } catch (error) {
      console.error(
        "Failed to read task manager snapshot:",
        error
      );

      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to read task manager snapshot.",
      });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const input =
        req.body as TrainTaskCreateInput;

      const result =
        await taskRuntimeStore.addTask(input);

      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add task.",
      });
    }
  });

  router.put("/:taskId", async (req, res) => {
    try {
      const input =
        req.body as TrainTaskCreateInput;

      const result =
        await taskRuntimeStore.updateTask(
          req.params.taskId ?? "",
          input
        );

      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update task.",
      });
    }
  });

  router.delete("/:taskId", async (req, res) => {
    try {
      const result =
        await taskRuntimeStore.removeTask(
          req.params.taskId ?? ""
        );

      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete task.",
      });
    }
  });

  router.post("/save", async (_req, res) => {
    try {
      const result =
        await taskRuntimeStore.saveTasks();

      res.json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save tasks.",
      });
    }
  });

  router.post("/reload", async (_req, res) => {
    try {
      const result =
        await taskRuntimeStore.reloadTasks();

      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reload tasks.",
      });
    }
  });

  router.post("/:taskId/start", async (req, res) => {
    const result =
      await taskRuntimeStore.startTask(
        req.params.taskId ?? ""
      );

    res.status(result.ok ? 200 : 400).json(result);
  });

  router.post("/:taskId/pause", async (req, res) => {
    const result =
      await taskRuntimeStore.pauseTask(
        req.params.taskId ?? ""
      );

    res.status(result.ok ? 200 : 400).json(result);
  });

  router.post("/:taskId/resume", async (req, res) => {
    const result =
      await taskRuntimeStore.resumeTask(
        req.params.taskId ?? ""
      );

    res.status(result.ok ? 200 : 400).json(result);
  });

  router.post("/:taskId/finish", async (req, res) => {
    const result =
      await taskRuntimeStore.finishTask(
        req.params.taskId ?? ""
      );

    res.status(result.ok ? 200 : 400).json(result);
  });

  router.post("/:taskId/abort", async (req, res) => {
    const result =
      await taskRuntimeStore.abortTask(
        req.params.taskId ?? ""
      );

    res.status(result.ok ? 200 : 400).json(result);
  });
  router.post("/start-all", async (_req, res) => {
    const result =
      await taskRuntimeStore.startAllTasks();

    res.status(result.ok ? 200 : 400).json(result);
  });
  router.post("/finish-all", async (_req, res) => {
    const result =
      await taskRuntimeStore.finishAllTasks();

    res.status(result.ok ? 200 : 400).json(result);
  });

  router.post("/abort-all", async (_req, res) => {
    const result =
      await taskRuntimeStore.abortAllTasks();

    res.status(result.ok ? 200 : 400).json(result);
  });
  return router;
}

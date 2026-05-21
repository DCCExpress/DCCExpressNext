// server/src/ws/handlers/wsTaskMessageHandlers.ts

import {
  taskRuntimeStore,
} from "../../services/taskRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleTaskMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "startTask": {
      try {
        const {
          taskIdOrName,
        } = msg.data;

        if (!taskIdOrName) {
          throw new Error("Missing taskIdOrName.");
        }

        const result =
          await taskRuntimeStore.startTask(
            taskIdOrName
          );

        if (!result.ok) {
          throw new Error(result.error);
        }
      } catch (error) {
        sendToClient(ws, {
          type: "taskRejected",
          data: {
            reason:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });
      }

      return true;
    }

    case "finishTask": {
      const {
        taskIdOrName,
      } = msg.data;

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.finishTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "abortTask": {
      const {
        taskIdOrName,
      } = msg.data;

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.abortTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "pauseTask": {
      const {
        taskIdOrName,
      } = msg.data;

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.pauseTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "resumeTask": {
      const {
        taskIdOrName,
      } = msg.data;

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.resumeTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "startAllTasks":
      await taskRuntimeStore.startAllTasks();
      return true;

    case "finishAllTasks":
      await taskRuntimeStore.finishAllTasks();
      return true;

    case "abortAllTasks":
      await taskRuntimeStore.abortAllTasks();
      return true;

    case "getTaskRuntimeState":
      sendToClient(ws, {
        type: "taskManagerSnapshotChanged",
        data: taskRuntimeStore.getSnapshot(),
      });

      return true;

    default:
      return false;
  }
};

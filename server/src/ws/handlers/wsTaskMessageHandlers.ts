// server/src/ws/handlers/wsTaskMessageHandlers.ts

import {
  editorEditModeStore,
} from "../../services/editorEditModeStore.js";

import {
  taskRuntimeStore,
} from "../../services/taskRuntimeStore.js";

import type {
  TaskManagerActionResult,
} from "../../../../common/src/task.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function rejectTaskStart(
  sendToClient: Parameters<WsMessageHandler>[0]["sendToClient"],
  ws: Parameters<WsMessageHandler>[0]["ws"],
  reason: string
): void {
  sendToClient(ws, {
    type: "taskRejected",
    data: {
      reason,
    },
  });
}

function rejectTaskCommand(
  sendToClient: Parameters<WsMessageHandler>[0]["sendToClient"],
  ws: Parameters<WsMessageHandler>[0]["ws"],
  reason: string
): void {
  sendToClient(ws, {
    type: "taskRejected",
    data: {
      reason,
    },
  });
}

function reportTaskResult(
  sendToClient: Parameters<WsMessageHandler>[0]["sendToClient"],
  ws: Parameters<WsMessageHandler>[0]["ws"],
  result: TaskManagerActionResult
): void {
  if (result.ok) {
    return;
  }

  rejectTaskCommand(
    sendToClient,
    ws,
    result.error
  );
}

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

        if (taskRuntimeStore.hasActiveTasks()) {
          rejectTaskStart(
            sendToClient,
            ws,
            "Nem lehet taskot indítani, mert már futó, szüneteltetett vagy befejezés alatt álló task van."
          );

          return true;
        }

        if (editorEditModeStore.hasEditingClients()) {
          rejectTaskStart(
            sendToClient,
            ws,
            "Nem lehet taskot indítani, mert legalább egy kliens szerkesztő módban van."
          );

          return true;
        }

        const result =
          await taskRuntimeStore.startTask(
            taskIdOrName
          );

        reportTaskResult(
          sendToClient,
          ws,
          result
        );
      } catch (error) {
        rejectTaskCommand(
          sendToClient,
          ws,
          error instanceof Error
            ? error.message
            : String(error)
        );
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

        reportTaskResult(
          sendToClient,
          ws,
          result
        );
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

        reportTaskResult(
          sendToClient,
          ws,
          result
        );
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

        reportTaskResult(
          sendToClient,
          ws,
          result
        );
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

        reportTaskResult(
          sendToClient,
          ws,
          result
        );
      }

      return true;
    }

    case "startAllTasks": {
      const result =
        await taskRuntimeStore.startAllTasks();

      reportTaskResult(
        sendToClient,
        ws,
        result
      );

      return true;
    }

    case "finishAllTasks": {
      const result =
        await taskRuntimeStore.finishAllTasks();

      reportTaskResult(
        sendToClient,
        ws,
        result
      );

      return true;
    }

    case "abortAllTasks": {
      const result =
        await taskRuntimeStore.abortAllTasks();

      reportTaskResult(
        sendToClient,
        ws,
        result
      );

      return true;
    }

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
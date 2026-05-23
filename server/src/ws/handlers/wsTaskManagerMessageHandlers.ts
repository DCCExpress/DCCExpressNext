// server/src/ws/handlers/wsTaskManagerMessageHandlers.ts

import type {
  TaskManagerResponsePayload,
} from "../../../../common/src/types.js";

import {
  taskRuntimeStore,
} from "../../services/taskRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendTaskManagerResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: TaskManagerResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "taskManagerResponse",
    data: payload,
  });
}

export const handleTaskManagerMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "taskManagerCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "snapshot": {
        await taskRuntimeStore.initialize();

        sendTaskManagerResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot: taskRuntimeStore.getSnapshot(),
        });

        return true;
      }

      case "add": {
        const result = await taskRuntimeStore.addTask(
          context.msg.data.input!
        );

        sendTaskManagerResponse(context, {
          requestId,
          action,
          ok: result.ok,
          message: result.ok ? undefined : result.error,
          addResult: result,
          snapshot: result.snapshot,
        });

        return true;
      }

      case "update": {
        const result = await taskRuntimeStore.updateTask(
          context.msg.data.taskId ?? "",
          context.msg.data.input!
        );

        sendTaskManagerResponse(context, {
          requestId,
          action,
          ok: result.ok,
          message: result.ok ? undefined : result.error,
          actionResult: result,
          snapshot: result.snapshot,
        });

        return true;
      }

      case "delete": {
        const result = await taskRuntimeStore.removeTask(
          context.msg.data.taskId ?? ""
        );

        sendTaskManagerResponse(context, {
          requestId,
          action,
          ok: result.ok,
          message: result.ok ? undefined : result.error,
          actionResult: result,
          snapshot: result.snapshot,
        });

        return true;
      }

      case "save": {
        const result = await taskRuntimeStore.saveTasks();

        sendTaskManagerResponse(context, {
          requestId,
          action,
          ok: result.ok,
          message: result.ok ? undefined : result.error,
          actionResult: result,
          snapshot: result.snapshot,
        });

        return true;
      }

      case "reload": {
        const result = await taskRuntimeStore.reloadTasks();

        sendTaskManagerResponse(context, {
          requestId,
          action,
          ok: result.ok,
          message: result.ok ? undefined : result.error,
          loadResult: result,
          snapshot: result.snapshot,
        });

        return true;
      }

      default: {
        sendTaskManagerResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown task manager command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendTaskManagerResponse(context, {
      requestId,
      action,
      ok: false,
      message: error instanceof Error
        ? error.message
        : String(error),
    });

    return true;
  }
};

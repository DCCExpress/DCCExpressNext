// server/src/ws/handlers/wsTaskManagerMessageHandlers.ts

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  TaskManagerActionResult,
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

function createAddTaskResponse(
  requestId: string,
  action: "add",
  result: AddTrainTaskResult
): TaskManagerResponsePayload {
  return {
    requestId,
    action,
    ok: result.ok,
    ...(result.ok ? {} : { message: result.error }),
    addResult: result,
    ...(result.snapshot ? { snapshot: result.snapshot } : {}),
  };
}

function createActionResponse(
  requestId: string,
  action: "update" | "delete" | "save",
  result: TaskManagerActionResult
): TaskManagerResponsePayload {
  return {
    requestId,
    action,
    ok: result.ok,
    ...(result.ok ? {} : { message: result.error }),
    actionResult: result,
    ...(result.snapshot ? { snapshot: result.snapshot } : {}),
  };
}

function createReloadResponse(
  requestId: string,
  action: "reload",
  result: LoadTrainTasksResult
): TaskManagerResponsePayload {
  return {
    requestId,
    action,
    ok: result.ok,
    ...(result.ok ? {} : { message: result.error }),
    loadResult: result,
    ...(result.snapshot ? { snapshot: result.snapshot } : {}),
  };
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

        sendTaskManagerResponse(
          context,
          createAddTaskResponse(
            requestId,
            action,
            result
          )
        );

        return true;
      }

      case "update": {
        const result = await taskRuntimeStore.updateTask(
          context.msg.data.taskId ?? "",
          context.msg.data.input!
        );

        sendTaskManagerResponse(
          context,
          createActionResponse(
            requestId,
            action,
            result
          )
        );

        return true;
      }

      case "delete": {
        const result = await taskRuntimeStore.removeTask(
          context.msg.data.taskId ?? ""
        );

        sendTaskManagerResponse(
          context,
          createActionResponse(
            requestId,
            action,
            result
          )
        );

        return true;
      }

      case "save": {
        const result = await taskRuntimeStore.saveTasks();

        sendTaskManagerResponse(
          context,
          createActionResponse(
            requestId,
            action,
            result
          )
        );

        return true;
      }

      case "reload": {
        const result = await taskRuntimeStore.reloadTasks();

        sendTaskManagerResponse(
          context,
          createReloadResponse(
            requestId,
            action,
            result
          )
        );

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

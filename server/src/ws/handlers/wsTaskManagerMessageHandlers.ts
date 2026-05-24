// server/src/ws/handlers/wsTaskManagerMessageHandlers.ts

import type {
  TaskManagerResponsePayload,
} from "../../../../common/src/types.js";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  TaskManagerActionResult,
} from "../../../../common/src/task.js";

import {
  editorEditModeStore,
} from "../../services/editorEditModeStore.js";

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
  action:
    | "update"
    | "delete"
    | "save"
    | "start"
    | "pause"
    | "resume"
    | "finish"
    | "abort"
    | "startAll"
    | "pauseAll"
    | "finishAll"
    | "abortAll",
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

function createRejectedActionResult(error: string): TaskManagerActionResult {
  return {
    ok: false,
    error,
    snapshot: taskRuntimeStore.getSnapshot(),
  };
}

async function startTaskWithGuards(taskId: string): Promise<TaskManagerActionResult> {
  if (taskRuntimeStore.hasActiveTasks()) {
    return createRejectedActionResult("A task is already active.");
  }

  if (editorEditModeStore.hasEditingClients()) {
    return createRejectedActionResult("Editor mode is active on at least one client.");
  }

  return taskRuntimeStore.startTask(taskId);
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
        const result = await taskRuntimeStore.addTask(context.msg.data.input!);
        sendTaskManagerResponse(context, createAddTaskResponse(requestId, action, result));
        return true;
      }

      case "update": {
        const result = await taskRuntimeStore.updateTask(context.msg.data.taskId ?? "", context.msg.data.input!);
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "delete": {
        const result = await taskRuntimeStore.removeTask(context.msg.data.taskId ?? "");
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "save": {
        const result = await taskRuntimeStore.saveTasks();
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "reload": {
        const result = await taskRuntimeStore.reloadTasks();
        sendTaskManagerResponse(context, createReloadResponse(requestId, action, result));
        return true;
      }

      case "start": {
        const result = await startTaskWithGuards(context.msg.data.taskId ?? "");
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "pause": {
        const result = await taskRuntimeStore.pauseTask(context.msg.data.taskId ?? "");
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "resume": {
        const result = await taskRuntimeStore.resumeTask(context.msg.data.taskId ?? "");
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "finish": {
        const result = await taskRuntimeStore.finishTask(context.msg.data.taskId ?? "");
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "abort": {
        const result = await taskRuntimeStore.abortTask(context.msg.data.taskId ?? "");
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "startAll": {
        const result = await taskRuntimeStore.startAllTasks();
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "pauseAll": {
        const result = await taskRuntimeStore.pauseAllTasks();
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "finishAll": {
        const result = await taskRuntimeStore.finishAllTasks();
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
        return true;
      }

      case "abortAll": {
        const result = await taskRuntimeStore.abortAllTasks();
        sendTaskManagerResponse(context, createActionResponse(requestId, action, result));
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
      message: error instanceof Error ? error.message : String(error),
    });

    return true;
  }
};
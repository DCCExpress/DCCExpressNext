// client/src/api/taskManagerWsApi.ts

import type {
  TaskManagerCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  TaskManagerActionResult,
  TaskManagerSnapshot,
  TrainTaskCreateInput,
} from "../../../common/src/task";

import {
  requestWsCommand,
} from "./wsRequest";

async function sendTaskManagerCommand(
  action: TaskManagerCommandAction,
  params: {
    taskId?: string;
    input?: TrainTaskCreateInput;
  } = {}
) {
  return requestWsCommand(
    "taskManagerCommand",
    {
      action,
      ...(params.taskId !== undefined
        ? { taskId: params.taskId }
        : {}),
      ...(params.input !== undefined
        ? { input: params.input }
        : {}),
    },
    "taskManagerResponse",
    "Task manager WebSocket command failed."
  );
}

async function getActionResult(
  action: TaskManagerCommandAction,
  taskId?: string
): Promise<TaskManagerActionResult> {
  const response = await sendTaskManagerCommand(
    action,
    taskId !== undefined ? { taskId } : {}
  );

  if (!response.actionResult) {
    throw new Error("Task manager response did not contain an action result.");
  }

  return response.actionResult;
}

export async function getTaskManagerSnapshotWs(): Promise<TaskManagerSnapshot> {
  const response = await sendTaskManagerCommand("snapshot");

  if (!response.snapshot) {
    throw new Error("Task manager response did not contain a snapshot.");
  }

  return response.snapshot;
}

export async function addTrainTaskWs(
  input: TrainTaskCreateInput
): Promise<AddTrainTaskResult> {
  const response = await sendTaskManagerCommand("add", {
    input,
  });

  if (!response.addResult) {
    throw new Error("Task manager response did not contain an add result.");
  }

  return response.addResult;
}

export async function updateTrainTaskWs(
  taskId: string,
  input: TrainTaskCreateInput
): Promise<TaskManagerActionResult> {
  const response = await sendTaskManagerCommand("update", {
    taskId,
    input,
  });

  if (!response.actionResult) {
    throw new Error("Task manager response did not contain an action result.");
  }

  return response.actionResult;
}

export async function deleteTrainTaskWs(
  taskId: string
): Promise<TaskManagerActionResult> {
  return getActionResult("delete", taskId);
}

export async function saveTrainTasksWs(): Promise<TaskManagerActionResult> {
  return getActionResult("save");
}

export async function reloadTrainTasksWs(): Promise<LoadTrainTasksResult> {
  const response = await sendTaskManagerCommand("reload");

  if (!response.loadResult) {
    throw new Error("Task manager response did not contain a load result.");
  }

  return response.loadResult;
}

export async function startTrainTaskWs(
  taskId: string
): Promise<TaskManagerActionResult> {
  return getActionResult("start", taskId);
}

export async function pauseTrainTaskWs(
  taskId: string
): Promise<TaskManagerActionResult> {
  return getActionResult("pause", taskId);
}

export async function resumeTrainTaskWs(
  taskId: string
): Promise<TaskManagerActionResult> {
  return getActionResult("resume", taskId);
}

export async function finishTrainTaskWs(
  taskId: string
): Promise<TaskManagerActionResult> {
  return getActionResult("finish", taskId);
}

export async function abortTrainTaskWs(
  taskId: string
): Promise<TaskManagerActionResult> {
  return getActionResult("abort", taskId);
}

export async function startAllTrainTasksWs(): Promise<TaskManagerActionResult> {
  return getActionResult("startAll");
}

export async function finishAllTrainTasksWs(): Promise<TaskManagerActionResult> {
  return getActionResult("finishAll");
}

export async function abortAllTrainTasksWs(): Promise<TaskManagerActionResult> {
  return getActionResult("abortAll");
}

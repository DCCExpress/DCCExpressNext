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
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

async function sendTaskManagerCommand(
  action: TaskManagerCommandAction,
  params: {
    taskId?: string;
    input?: TrainTaskCreateInput;
  } = {}
) {
  const requestId = generateId();

  const response = await wsApi.request(
    "taskManagerCommand",
    {
      requestId,
      action,
      ...(params.taskId !== undefined
        ? { taskId: params.taskId }
        : {}),
      ...(params.input !== undefined
        ? { input: params.input }
        : {}),
    },
    "taskManagerResponse",
    data => data.requestId === requestId
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "Task manager WebSocket command failed."
    );
  }

  return response;
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
  const response = await sendTaskManagerCommand("delete", {
    taskId,
  });

  if (!response.actionResult) {
    throw new Error("Task manager response did not contain an action result.");
  }

  return response.actionResult;
}

export async function saveTrainTasksWs(): Promise<TaskManagerActionResult> {
  const response = await sendTaskManagerCommand("save");

  if (!response.actionResult) {
    throw new Error("Task manager response did not contain an action result.");
  }

  return response.actionResult;
}

export async function reloadTrainTasksWs(): Promise<LoadTrainTasksResult> {
  const response = await sendTaskManagerCommand("reload");

  if (!response.loadResult) {
    throw new Error("Task manager response did not contain a load result.");
  }

  return response.loadResult;
}

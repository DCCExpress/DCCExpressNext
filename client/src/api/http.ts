import { Loco, SingleScriptFile } from "../../../common/src/types";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  TaskManagerActionResult,
  TaskManagerSnapshot,
  TrainTaskCreateInput,
} from "../../../common/src/task";

import { LayoutView } from "../models/editor/core/LayoutView";
import type {
  RouteGraphResponseDto,
} from "../../../common/src/railway/routeGraphDto";

import {
  getLocosWs,
  saveLocosWs,
} from "./locosWsApi";

import {
  getLayoutWs,
  getRouteGraphWs,
  refreshLayoutRuntimeWs,
  saveLayoutWs,
} from "./layoutWsApi";

import {
  getScriptWs,
  saveScriptWs,
} from "./scriptWsApi";

import {
  abortAllTrainTasksWs,
  abortTrainTaskWs,
  addTrainTaskWs,
  deleteTrainTaskWs,
  finishAllTrainTasksWs,
  finishTrainTaskWs,
  getTaskManagerSnapshotWs,
  pauseTrainTaskWs,
  reloadTrainTasksWs,
  resumeTrainTaskWs,
  saveTrainTasksWs,
  startAllTrainTasksWs,
  startTrainTaskWs,
  updateTrainTaskWs,
} from "./taskManagerWsApi";

function serializeForWs<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getLocos(): Promise<Loco[]> {
  return getLocosWs();
}

export async function saveLocos(locos: Loco[]): Promise<void> {
  await saveLocosWs(locos);
}

export async function getLayout(): Promise<LayoutView> {
  return LayoutView.fromJSON(
    await getLayoutWs()
  );
}

export async function saveLayout(elements: LayoutView): Promise<void> {
  await saveLayoutWs(
    serializeForWs(elements)
  );
}

export async function refreshLayoutRuntime(
  layout: LayoutView
): Promise<void> {
  await refreshLayoutRuntimeWs(
    serializeForWs(layout)
  );
}

export async function getScript(): Promise<SingleScriptFile> {
  return getScriptWs();
}

export async function saveScript(
  input: string | SingleScriptFile
): Promise<SingleScriptFile> {
  return saveScriptWs(input);
}

export async function getTaskManagerSnapshot(): Promise<TaskManagerSnapshot> {
  return getTaskManagerSnapshotWs();
}

export async function addTrainTask(
  input: TrainTaskCreateInput
): Promise<AddTrainTaskResult> {
  return addTrainTaskWs(input);
}

export async function updateTrainTask(
  taskId: string,
  input: TrainTaskCreateInput
): Promise<TaskManagerActionResult> {
  return updateTrainTaskWs(taskId, input);
}

export async function deleteTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return deleteTrainTaskWs(taskId);
}

export async function saveTrainTasks(): Promise<TaskManagerActionResult> {
  return saveTrainTasksWs();
}

export async function reloadTrainTasks(): Promise<LoadTrainTasksResult> {
  return reloadTrainTasksWs();
}

export async function startTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return startTrainTaskWs(taskId);
}

export async function pauseTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return pauseTrainTaskWs(taskId);
}

export async function resumeTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return resumeTrainTaskWs(taskId);
}

export async function finishTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return finishTrainTaskWs(taskId);
}

export async function abortTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return abortTrainTaskWs(taskId);
}

export async function startAllTrainTasks(): Promise<TaskManagerActionResult> {
  return startAllTrainTasksWs();
}

export async function finishAllTrainTasks(): Promise<TaskManagerActionResult> {
  return finishAllTrainTasksWs();
}

export async function abortAllTrainTasks(): Promise<TaskManagerActionResult> {
  return abortAllTrainTasksWs();
}

export async function getRouteGraph(): Promise<RouteGraphResponseDto> {
  return getRouteGraphWs();
}

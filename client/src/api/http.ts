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

export async function getLocos(): Promise<Loco[]> {
  const response = await fetch("/api/locos");

  if (!response.ok) {
    throw new Error("Nem sikerült lekérni a mozdonyokat.");
  }

  return response.json();
}

export async function saveLocos(locos: Loco[]): Promise<void> {
  const response = await fetch("/api/locos", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(locos),
  });

  if (!response.ok) {
    throw new Error("Nem sikerült elmenteni a mozdonyokat.");
  }
}

export async function getLayout(): Promise<LayoutView> {
  const response = await fetch("/api/layout");

  if (!response.ok) {
    throw new Error("Nem sikerült betölteni a pályát.");
  }

  return response.json();
}

export async function saveLayout(elements: LayoutView): Promise<void> {
  const response = await fetch("/api/layout", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(elements),
  });

  if (!response.ok) {
    throw new Error("Nem sikerült elmenteni a pályát.");
  }
}

export async function refreshLayoutRuntime(
  layout: LayoutView
): Promise<void> {
  const response = await fetch("/api/layout/runtime", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(layout),
  });

  if (!response.ok) {
    throw new Error(
      "Nem sikerült frissíteni a szerveroldali runtime layoutot."
    );
  }
}

export async function getScript(): Promise<SingleScriptFile> {
  const res = await fetch("/api/script");

  if (!res.ok) {
    throw new Error("Failed to load script");
  }

  return await res.json();
}

export async function saveScript(
  input: string | SingleScriptFile
): Promise<SingleScriptFile> {
  const payload =
    typeof input === "string"
      ? { content: input }
      : input;

  const res = await fetch("/api/script", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to save script");
  }

  return await res.json();
}

async function readTaskResponse<T>(
  response: Response,
  fallbackError: string
): Promise<T> {
  const json = await response.json() as T & {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok && typeof json.error !== "string") {
    throw new Error(fallbackError);
  }

  return json;
}

export async function getTaskManagerSnapshot(): Promise<TaskManagerSnapshot> {
  const res = await fetch("/api/tasks");

  if (!res.ok) {
    throw new Error("Failed to load tasks");
  }

  return await res.json();
}

export async function addTrainTask(
  input: TrainTaskCreateInput
): Promise<AddTrainTaskResult> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return readTaskResponse<AddTrainTaskResult>(
    res,
    "Failed to add task"
  );
}

export async function updateTrainTask(
  taskId: string,
  input: TrainTaskCreateInput
): Promise<TaskManagerActionResult> {
  const res = await fetch(
    `/api/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  return readTaskResponse<TaskManagerActionResult>(
    res,
    "Failed to update task"
  );
}

export async function deleteTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  const res = await fetch(
    `/api/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "DELETE",
    }
  );

  return readTaskResponse<TaskManagerActionResult>(
    res,
    "Failed to delete task"
  );
}

export async function saveTrainTasks(): Promise<TaskManagerActionResult> {
  const res = await fetch("/api/tasks/save", {
    method: "POST",
  });

  return readTaskResponse<TaskManagerActionResult>(
    res,
    "Failed to save tasks"
  );
}

export async function reloadTrainTasks(): Promise<LoadTrainTasksResult> {
  const res = await fetch("/api/tasks/reload", {
    method: "POST",
  });

  return readTaskResponse<LoadTrainTasksResult>(
    res,
    "Failed to reload tasks"
  );
}

async function runTaskAction(
  taskId: string,
  action:
    | "start"
    | "pause"
    | "resume"
    | "finish"
    | "abort"
): Promise<TaskManagerActionResult> {
  const res = await fetch(
    `/api/tasks/${encodeURIComponent(taskId)}/${action}`,
    {
      method: "POST",
    }
  );

  return readTaskResponse<TaskManagerActionResult>(
    res,
    `Failed to ${action} task`
  );
}

export async function startTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return runTaskAction(taskId, "start");
}

export async function pauseTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return runTaskAction(taskId, "pause");
}

export async function resumeTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return runTaskAction(taskId, "resume");
}

export async function finishTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return runTaskAction(taskId, "finish");
}

export async function abortTrainTask(
  taskId: string
): Promise<TaskManagerActionResult> {
  return runTaskAction(taskId, "abort");
}
export async function startAllTrainTasks(): Promise<TaskManagerActionResult> {
  const res = await fetch("/api/tasks/start-all", {
    method: "POST",
  });

  return readTaskResponse<TaskManagerActionResult>(
    res,
    "Failed to start all tasks"
  );
}
export async function finishAllTrainTasks(): Promise<TaskManagerActionResult> {
  const res = await fetch("/api/tasks/finish-all", {
    method: "POST",
  });

  return readTaskResponse<TaskManagerActionResult>(
    res,
    "Failed to finish all tasks"
  );
}

export async function abortAllTrainTasks(): Promise<TaskManagerActionResult> {
  const res = await fetch("/api/tasks/abort-all", {
    method: "POST",
  });

  return readTaskResponse<TaskManagerActionResult>(
    res,
    "Failed to abort all tasks"
  );
}
export async function getRouteGraph(): Promise<RouteGraphResponseDto> {
  const response = await fetch("/api/layout/route-graph");

  if (!response.ok) {
    throw new Error("Nem sikerült lekérni a szerveroldali route gráfot.");
  }

  return response.json();
}

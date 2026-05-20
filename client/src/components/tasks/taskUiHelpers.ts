import i18n from "../../i18n";
// client/src/components/tasks/taskUiHelpers.ts

import type {
  TrainTask,
  TrainTaskStatus,
} from "../../services/tasks/TaskTypes";

export function getTaskStatusColor(
  status: TrainTaskStatus
): string {
  switch (status) {
    case "queued":
      return "gray";
    case "running":
      return "green";
    case "paused":
      return "yellow";
    case "finishing":
      return "orange";
    case "aborted":
      return "red";
    case "completed":
      return "blue";
    case "error":
      return "red";
  }
}

export function getTaskStatusLabel(
  status: TrainTaskStatus
): string {
  switch (status) {
    case "queued":
      return i18n.t("task.status.queued");
    case "running":
      return i18n.t("task.status.running");
    case "paused":
      return i18n.t("task.status.paused");
    case "finishing":
      return i18n.t("task.status.finishing");
    case "aborted":
      return i18n.t("task.status.aborted");
    case "completed":
      return i18n.t("task.status.completed");
    case "error":
      return i18n.t("task.status.error");
  }
}

export function getTaskProgressLabel(
  task: TrainTask
): string {
  if (task.status === "completed") {
    return i18n.t("task.progress.arrived");
  }

  if (task.status === "aborted") {
    return i18n.t("task.progress.aborted");
  }

  switch (task.runtime.simulation.phase) {
    case "waitingForLoco":
      return i18n.t("task.progress.waitingForLoco");
    case "waitingForRoute":
      return i18n.t("task.progress.waitingForRoute");
    case "waitingForBlockSensor": {
      const sensorAddress =
        task.runtime.simulation.waitingSensorAddress;

      return sensorAddress && sensorAddress > 0
        ? i18n.t("task.progress.waitingForSensor", { sensorAddress })
        : i18n.t("task.progress.waitingForNextBlock");
    }
    case "departing":
      return i18n.t("task.progress.departing");
    case "transit":
      return i18n.t("task.progress.transit");
  }

  if (task.runtime.inTransit) {
    return i18n.t("task.progress.transit");
  }

  if (task.runtime.hasLeftFromBlock) {
    return i18n.t("task.progress.leftFromBlock");
  }

  switch (task.status) {
    case "queued":
      return i18n.t("task.progress.queued");
    case "running":
      return i18n.t("task.progress.running");
    case "paused":
      return i18n.t("task.progress.paused");
    case "finishing":
      return i18n.t("task.progress.finishing");
    case "error":
      return i18n.t("task.progress.error");
  }
}

export function getTaskProgressColor(
  task: TrainTask
): string {
  if (task.runtime.simulation.phase === "waitingForBlockSensor") {
    return "yellow";
  }

  if (task.status === "completed") {
    return "blue";
  }

  if (task.status === "aborted") {
    return "red";
  }

  if (task.runtime.inTransit) {
    return "red";
  }

  if (task.runtime.hasLeftFromBlock) {
    return "orange";
  }

  switch (task.status) {
    case "running":
      return "green";
    case "paused":
      return "yellow";
    case "finishing":
      return "orange";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

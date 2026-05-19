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
      return "Queued";
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "finishing":
      return "Finishing";
    case "aborted":
      return "Aborted";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
  }
}

export function getTaskProgressLabel(
  task: TrainTask
): string {
  if (task.status === "completed") {
    return "Megérkezett";
  }

  if (task.status === "aborted") {
    return "Megszakítva";
  }

  switch (task.runtime.simulation.phase) {
    case "waitingForLoco":
      return "Mozdonyra vár";
    case "waitingForRoute":
      return "Útvonal foglalására vár";
    case "waitingForBlockSensor": {
      const sensorAddress =
        task.runtime.simulation.waitingSensorAddress;

      return sensorAddress && sensorAddress > 0
        ? `Sensor #${sensorAddress} felszabadulására vár`
        : "A következő blokk felszabadulására vár";
    }
    case "departing":
      return "Indulási szakasz";
    case "transit":
      return "Két blokk között halad";
  }

  if (task.runtime.inTransit) {
    return "Két blokk között halad";
  }

  if (task.runtime.hasLeftFromBlock) {
    return "Elhagyta az induló blokkot";
  }

  switch (task.status) {
    case "queued":
      return "Indításra vár";
    case "running":
      return "Futás alatt";
    case "paused":
      return "Szüneteltetve";
    case "finishing":
      return "Befejezés alatt";
    case "error":
      return "Hiba";
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

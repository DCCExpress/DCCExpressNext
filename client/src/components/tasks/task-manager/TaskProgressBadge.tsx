// client/src/components/tasks/task-manager/TaskProgressBadge.tsx

import {
  Badge,
} from "@mantine/core";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

type TaskProgressBadgeProps = {
  task: TrainTask;
};

export default function TaskProgressBadge({
  task,
}: TaskProgressBadgeProps) {
  if (task.status === "completed") {
    return (
      <Badge
        color="blue"
        variant="light"
      >
        Arrived
      </Badge>
    );
  }

  if (task.status === "aborted") {
    return (
      <Badge
        color="red"
        variant="light"
      >
        Aborted
      </Badge>
    );
  }

  if (task.runtime.simulation.phase === "waitingForRoute") {
    return (
      <Badge
        color="yellow"
        variant="light"
      >
        Waiting route
      </Badge>
    );
  }

  if (task.runtime.simulation.phase === "waitingForBlockSensor") {
    const sensorAddress =
      task.runtime.simulation.waitingSensorAddress;

    return (
      <Badge
        color="yellow"
        variant="light"
      >
        {sensorAddress && sensorAddress > 0
          ? `Waiting sensor #${sensorAddress}`
          : "Waiting next block free"}
      </Badge>
    );
  }

  if (task.runtime.inTransit) {
    return (
      <Badge
        color="red"
        variant="light"
      >
        Between blocks
      </Badge>
    );
  }

  if (task.runtime.hasLeftFromBlock) {
    return (
      <Badge
        color="orange"
        variant="light"
      >
        Left start block
      </Badge>
    );
  }

  return (
    <Badge
      color="gray"
      variant="light"
    >
      Waiting
    </Badge>
  );
}

// server/src/services/tasks/taskRuntimeHelpers.ts

import {
  randomUUID,
} from "node:crypto";

import type {
  TaskManagerOverlayState,
  TrainTask,
  TrainTaskRuntimeState,
} from "../../../../common/src/task.js";

export function createTrainTaskId(): string {
  return `task-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export function createEmptyTrainTaskRuntimeState(): TrainTaskRuntimeState {
  return {
    loco: null,
    hasLeftFromBlock: false,
    hasReachedToBlock: false,
    inTransit: false,

    simulation: {
      phase: "idle",
      legIndex: 0,
      legCount: 0,
      fromBlockId: null,
      fromBlockName: null,
      toBlockId: null,
      toBlockName: null,
      waitingSensorAddress: null,
    },
  };
}

export function cloneTrainTask(
  task: TrainTask
): TrainTask {
  return {
    ...task,
    transition: task.transition,
    runtime: {
      ...task.runtime,
      simulation: {
        ...task.runtime.simulation,
      },
      ...(task.runtime.loco
        ? {
            loco: {
              ...task.runtime.loco,
            },
          }
        : {
            loco: null,
          }),
    },
  };
}

export function createTaskManagerOverlayState(
  tasks: TrainTask[]
): TaskManagerOverlayState {
  const activeTasks =
    tasks.filter(task =>
      task.status === "running" ||
      task.status === "paused"
    );

  const reservedSectionNames =
    new Set<string>();

  const transitSectionNames =
    new Set<string>();

  const activeBlockIds =
    new Set<string>();

  const activeTurnoutAddresses =
    new Set<number>();

  for (const task of activeTasks) {
    const solution =
      task.transition.solution;

    for (const node of solution.nodes) {
      reservedSectionNames.add(node.name);

      if (task.runtime.inTransit) {
        transitSectionNames.add(node.name);
      }
    }

    activeBlockIds.add(task.fromBlockId);
    activeBlockIds.add(task.toBlockId);

    for (const turnoutState of solution.turnoutStates) {
      activeTurnoutAddresses.add(
        turnoutState.address
      );
    }
  }

  return {
    reservedSectionNames: [
      ...reservedSectionNames,
    ],
    transitSectionNames: [
      ...transitSectionNames,
    ],
    activeBlockIds: [
      ...activeBlockIds,
    ],
    activeTurnoutAddresses: [
      ...activeTurnoutAddresses,
    ],
  };
}

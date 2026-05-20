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

function findBlockNodeName(
  task: TrainTask,
  blockId: string | null
): string | null {
  if (!blockId) {
    return null;
  }

  const blockPathItem =
    task.transition.solution.path.find(item =>
      item.type === "block" &&
      item.block.id === blockId
    );

  if (blockPathItem?.type === "block") {
    return blockPathItem.node.name;
  }

  const node =
    task.transition.solution.nodes.find(item =>
      item.blocks.some(block => block.id === blockId)
    );

  return node?.name ?? null;
}

function addStandingBlockTransitOverlay(
  task: TrainTask,
  transitSectionNames: Set<string>
): void {
  const blockId =
    task.runtime.simulation.fromBlockId ??
    task.fromBlockId;

  const nodeName =
    findBlockNodeName(task, blockId);

  if (nodeName) {
    transitSectionNames.add(nodeName);
  }
}

function addCurrentLegTransitOverlay(
  task: TrainTask,
  transitSectionNames: Set<string>,
  transitTurnoutAddresses: Set<number>
): void {
  const simulation =
    task.runtime.simulation;

  const fromNodeName =
    findBlockNodeName(task, simulation.fromBlockId);

  const toNodeName =
    findBlockNodeName(task, simulation.toBlockId);

  if (!fromNodeName || !toNodeName) {
    return;
  }

  const routeNodes =
    task.transition.solution.nodes;

  const fromNodeIndex =
    routeNodes.findIndex(node => node.name === fromNodeName);

  const toNodeIndex =
    routeNodes.findIndex(node => node.name === toNodeName);

  if (fromNodeIndex < 0 || toNodeIndex < 0) {
    return;
  }

  const startIndex =
    Math.min(fromNodeIndex, toNodeIndex);

  const endIndex =
    Math.max(fromNodeIndex, toNodeIndex);

  const currentLegNodes =
    routeNodes.slice(startIndex, endIndex + 1);

  const currentLegNodeNames =
    new Set(
      currentLegNodes.map(node => node.name)
    );

  for (const node of currentLegNodes) {
    transitSectionNames.add(node.name);
  }

  for (const edge of task.transition.solution.edges) {
    const belongsToCurrentLeg =
      currentLegNodeNames.has(edge.from.name) &&
      currentLegNodeNames.has(edge.to.name);

    if (!belongsToCurrentLeg) {
      continue;
    }

    for (const turnoutState of edge.turnoutStates) {
      transitTurnoutAddresses.add(
        turnoutState.address
      );
    }
  }
}

export function createTaskManagerOverlayState(
  tasks: TrainTask[]
): TaskManagerOverlayState {
  const activeTasks =
    tasks.filter(task =>
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing"
    );

  const reservedSectionNames =
    new Set<string>();

  const transitSectionNames =
    new Set<string>();

  const transitTurnoutAddresses =
    new Set<number>();

  const activeBlockIds =
    new Set<string>();

  const activeTurnoutAddresses =
    new Set<number>();

  for (const task of activeTasks) {
    const solution =
      task.transition.solution;

    /**
     * A foglalás továbbra is a teljes előkészített route-ra értendő.
     * Ez marad narancs.
     */
    for (const node of solution.nodes) {
      reservedSectionNames.add(node.name);
    }

    for (const turnoutState of solution.turnoutStates) {
      activeTurnoutAddresses.add(
        turnoutState.address
      );
    }

    activeBlockIds.add(task.fromBlockId);
    activeBlockIds.add(task.toBlockId);

    /**
     * Transit overlay:
     * nem az egész route-ot színezzük bordóra,
     * hanem csak azt, ahol a mozdony ténylegesen van.
     */
    if (!task.runtime.loco) {
      continue;
    }

    const phase =
      task.runtime.simulation.phase;

    if (phase === "transit") {
      addCurrentLegTransitOverlay(
        task,
        transitSectionNames,
        transitTurnoutAddresses
      );
      continue;
    }

    if (
      phase === "departing" ||
      phase === "waitingForRoute" ||
      phase === "waitingForBlockSensor"
    ) {
      addStandingBlockTransitOverlay(
        task,
        transitSectionNames
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
    transitTurnoutAddresses: [
      ...transitTurnoutAddresses,
    ],
    activeBlockIds: [
      ...activeBlockIds,
    ],
    activeTurnoutAddresses: [
      ...activeTurnoutAddresses,
    ],
  };
}

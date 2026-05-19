// server/src/services/tasks/taskRouteRuntimeCoordinator.ts

import {
  routeGraphRuntimeStore,
} from "../routeGraphRuntimeStore.js";

import {
  railwayTopologyStore,
} from "../railwayTopologyStore.js";

import type {
  CommandCenter,
} from "../../commandCenter/CommandCenter.js";

import type {
  BlockState,
  TypedServerWsMessage,
} from "../../../../common/src/types.js";

import type {
  TrainTask,
  TrainTaskSimulationProgress,
} from "../../../../common/src/task.js";

type BroadcastFn = (
  message: TypedServerWsMessage
) => void;

type ProgressUpdater = (
  taskId: string,
  progress: TrainTaskSimulationProgress
) => Promise<unknown>;

type ReservedTaskRoute = {
  fromBlockName: string;
  toBlockName: string;
};

type BlockedRouteBlock = {
  blockId: string;
  blockName: string;
  sensorAddress: number | null;
};

export type TaskRouteRuntimeCoordinatorConfig = {
  broadcast: BroadcastFn;
  getBlockState: (
    blockId: string
  ) => BlockState | null;
  getSimulatorCommandCenter: () => CommandCenter | null;
  updateTaskSimulationProgress: ProgressUpdater;
};

export class TaskRouteRuntimeCoordinator {
  private readonly reservedRoutesByTaskId =
    new Map<string, ReservedTaskRoute>();

  constructor(
    private readonly config: TaskRouteRuntimeCoordinatorConfig
  ) {}

  hasReservedRoute(
    taskId: string
  ): boolean {
    return this.reservedRoutesByTaskId.has(taskId);
  }

  async tryPrepareTaskRoute(
    task: TrainTask
  ): Promise<boolean> {
    if (
      task.status !== "running" &&
      task.status !== "paused" &&
      task.status !== "finishing"
    ) {
      return false;
    }

    if (!task.runtime.loco) {
      return false;
    }

    /**
     * Ha ennek a tasknak már van lefoglalt route-ja,
     * nem foglaljuk újra.
     */
    if (this.hasReservedRoute(task.id)) {
      return true;
    }

    const commandCenter =
      this.config.getSimulatorCommandCenter();

    /**
     * Nincs elérhető command center.
     * Nem hibázunk el, csak várunk.
     */
    if (!commandCenter) {
      await this.markTaskWaitingForRoute(task);
      return false;
    }

    /**
     * Ha épp foglalt a command center,
     * akkor nem állítunk váltót, hanem később újrapróbáljuk.
     */
    if (commandCenter.locked) {
      await this.markTaskWaitingForRoute(task);
      return false;
    }

    const topology =
      railwayTopologyStore.getTopology();

    if (!topology) {
      await this.markTaskWaitingForRoute(task);
      return false;
    }

    /**
     * Indítás előtti teljes blokkellenőrzés.
     *
     * A task csak akkor foglalhat le útvonalat,
     * ha a saját induló blokkján kívül
     * a teljes blokk-lánc üres.
     */
    const blockedRouteBlock =
      this.findFirstOccupiedRouteBlock(task);

    if (blockedRouteBlock) {
      await this.markTaskWaitingForRouteBlockSensor(
        task,
        blockedRouteBlock
      );

      return false;
    }

    const fromBlockName =
      task.transition.fromBlock.name;

    const toBlockName =
      task.transition.toBlock.name;

    const reservation =
      routeGraphRuntimeStore.tryReserveRoute(
        fromBlockName,
        toBlockName,
        task.transition.solution
      );

    if (!reservation.ok) {
      await this.markTaskWaitingForRoute(task);
      return false;
    }

    this.reservedRoutesByTaskId.set(
      task.id,
      {
        fromBlockName,
        toBlockName,
      }
    );

    this.config.broadcast({
      type: "routeReservationChanged",
      data: {
        busy: true,
        sectionNames:
          reservation.reservation.sectionNames,
        elementIds:
          routeGraphRuntimeStore.getElementIdsForSections(
            reservation.reservation.sectionNames
          ),
        turnoutAddresses:
          reservation.reservation.turnoutAddresses,
        fromBlockName,
        toBlockName,
      },
    });

    let turnoutsPrepared = false;

    commandCenter.locked = true;
    commandCenter.lockOwnerUUID =
      `task:${task.id}`;

    this.config.broadcast({
      type: "commandCenterLockChanged",
      data: {
        locked: true,
        lockOwner: commandCenter.lockOwnerUUID,
        reason: "task-route",
      },
    });

    try {
      for (const turnoutState of task.transition.solution.turnoutStates) {
        const turnout =
          topology
            .getTurnouts()
            .find(
              item =>
                item.turnoutAddress === turnoutState.address
            );

        if (!turnout) {
          console.error(
            `[TaskRouteRuntimeCoordinator] Turnout not found in topology: ${turnoutState.address}`
          );

          return false;
        }

        const physicalClosed =
          turnoutState.closed === turnout.turnoutClosedValue;

        const success =
          await commandCenter.setTurnout(
            turnoutState.address,
            physicalClosed
          );

        if (!success) {
          console.error(
            `[TaskRouteRuntimeCoordinator] Failed to set turnout #${turnoutState.address}.`
          );

          return false;
        }

        await commandCenter.saveRuntimeState();

        await new Promise<void>(resolve =>
          setTimeout(resolve, 500)
        );
      }

      turnoutsPrepared = true;
      return true;
    } finally {
      commandCenter.locked = false;
      commandCenter.lockOwnerUUID = null;

      this.config.broadcast({
        type: "commandCenterLockChanged",
        data: {
          locked: false,
          lockOwner: null,
          reason: null,
        },
      });

      if (!turnoutsPrepared) {
        this.releaseTaskRoute(task.id);
        await this.markTaskWaitingForRoute(task);
      }
    }
  }

  releaseTaskRoute(
    taskId: string
  ): void {
    const reservedRoute =
      this.reservedRoutesByTaskId.get(taskId);

    if (!reservedRoute) {
      return;
    }

    const result =
      routeGraphRuntimeStore.releaseRouteReservation(
        reservedRoute.fromBlockName,
        reservedRoute.toBlockName
      );

    this.reservedRoutesByTaskId.delete(taskId);

    if (!result.ok) {
      console.warn(
        `[TaskRouteRuntimeCoordinator] Task route release failed for ${reservedRoute.fromBlockName} → ${reservedRoute.toBlockName}: ${result.error}`
      );

      return;
    }

    this.config.broadcast({
      type: "routeReservationChanged",
      data: {
        busy: false,
        sectionNames:
          result.releasedSectionNames,
        elementIds:
          routeGraphRuntimeStore.getElementIdsForSections(
            result.releasedSectionNames
          ),
        turnoutAddresses:
          result.releasedTurnoutAddresses,
        fromBlockName:
          reservedRoute.fromBlockName,
        toBlockName:
          reservedRoute.toBlockName,
      },
    });
  }

  private findFirstOccupiedRouteBlock(
    task: TrainTask
  ): BlockedRouteBlock | null {
    const ownLocoId =
      task.runtime.loco?.id ?? null;

    for (const item of task.transition.solution.path) {
      if (item.type !== "block") {
        continue;
      }

      if (item.block.id === task.fromBlockId) {
        continue;
      }

      const blockState =
        this.config.getBlockState(item.block.id);

      const occupyingLocoId =
        blockState?.locoId ?? null;

      if (
        occupyingLocoId !== null &&
        occupyingLocoId !== ownLocoId
      ) {
        const block =
          railwayTopologyStore
            .getTopology()
            ?.getBlocks()
            .find(topologyBlock =>
              topologyBlock.id === item.block.id
            );

        const rawSensorAddress =
          block?.sensorAddress ?? 0;

        return {
          blockId: item.block.id,
          blockName: item.block.name,
          sensorAddress:
            Number.isFinite(rawSensorAddress) &&
              rawSensorAddress > 0
              ? rawSensorAddress
              : null,
        };
      }
    }

    return null;
  }

  private async markTaskWaitingForRouteBlockSensor(
    task: TrainTask,
    blockedBlock: BlockedRouteBlock
  ): Promise<void> {
    await this.config.updateTaskSimulationProgress(
      task.id,
      {
        phase: "waitingForBlockSensor",
        legIndex: 0,
        legCount: 0,
        fromBlockId: task.fromBlockId,
        fromBlockName: task.transition.fromBlock.name,
        toBlockId: blockedBlock.blockId,
        toBlockName: blockedBlock.blockName,
        waitingSensorAddress:
          blockedBlock.sensorAddress,
      }
    );
  }

  private async markTaskWaitingForRoute(
    task: TrainTask
  ): Promise<void> {
    await this.config.updateTaskSimulationProgress(
      task.id,
      {
        phase: "waitingForRoute",
        legIndex: 0,
        legCount: 0,
        fromBlockId: task.fromBlockId,
        fromBlockName: task.transition.fromBlock.name,
        toBlockId: task.toBlockId,
        toBlockName: task.transition.toBlock.name,
        waitingSensorAddress: null,
      }
    );
  }
}

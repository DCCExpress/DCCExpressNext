import { log, logError } from "../utility.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
const TICK_MS = 250;
/**
 * Mennyi ideig álljon a köztes blokkban,
 * mielőtt "elhagyja" azt.
 */
const DEPARTURE_DELAY_MS = 1200;
/**
 * Egy útvonalszegmenshez tartozó szimulált haladási idő.
 * Ha két blokk között több szakasz van, arányosan nő az idő.
 */
const BASE_TRANSIT_PER_SEGMENT_MS = 1400;
/**
 * Legyen minimális menetidő két blokk között,
 * hogy ne villanjon át túl gyorsan.
 */
const MIN_TRANSIT_PER_LEG_MS = 2800;
class TrainSimulatorRuntimeStore {
    params = null;
    timer = null;
    tickRunning = false;
    sessions = new Map();
    configure(params) {
        this.params = params;
    }
    start() {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            void this.tick();
        }, TICK_MS);
        log("[TrainSimulator] Runtime loop started.");
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.sessions.clear();
        log("[TrainSimulator] Runtime loop stopped.");
    }
    async tick() {
        if (this.tickRunning ||
            !this.params) {
            return;
        }
        this.tickRunning = true;
        try {
            const simulator = this.params.getSimulatorCommandCenter();
            if (!simulator) {
                this.sessions.clear();
                return;
            }
            const tasks = this.params.getTasks();
            /**
             * Már nem aktív sessionök kipucolása.
             */
            for (const [taskId, session] of this.sessions.entries()) {
                const task = tasks.find(item => item.id === taskId);
                if (!task ||
                    task.status === "aborted" ||
                    task.status === "completed" ||
                    task.status === "error" ||
                    task.status === "queued") {
                    await this.stopLocoIfKnown(simulator, task);
                    this.sessions.delete(session.taskId);
                }
            }
            /**
             * Aktív taskok futtatása.
             */
            for (const task of tasks) {
                if (task.status !== "running" &&
                    task.status !== "paused" &&
                    task.status !== "finishing") {
                    continue;
                }
                /**
                 * Running task, de még nincs hozzárendelt mozdony.
                 * Nézzük meg újra, bekerült-e már az induló blokkba.
                 */
                if (!task.runtime.loco) {
                    if (task.status === "running") {
                        await this.params.tryResolveTaskLoco(task.id);
                        await this.params.updateTaskSimulationProgress(task.id, {
                            phase: "waitingForLoco",
                            legIndex: 0,
                            legCount: 0,
                            fromBlockId: task.fromBlockId,
                            fromBlockName: task.transition.fromBlock.name,
                            toBlockId: null,
                            toBlockName: null,
                        });
                    }
                    continue;
                }
                let session = this.sessions.get(task.id);
                /**
                 * Új ciklus indul.
                 */
                if (!session) {
                    const legs = this.createSimulationLegs(task);
                    if (legs.length === 0) {
                        logError(`[TrainSimulator] No block legs found for task: ${task.name} (${task.id})`);
                        continue;
                    }
                    /**
                     * A mozdony már megvan, de csak akkor indulhatunk,
                     * ha a teljes útvonal lefoglalható és a váltók beálltak.
                     * Ha nem sikerül, a task futva marad és később újrapróbálkozik.
                     */
                    const routePrepared = await this.params.tryPrepareTaskRoute(task.id);
                    if (!routePrepared) {
                        continue;
                    }
                    session = {
                        taskId: task.id,
                        legs,
                        legIndex: 0,
                        phase: "departing",
                        phaseStartedAt: Date.now(),
                        pausedAt: task.status === "paused"
                            ? Date.now()
                            : null,
                    };
                    const firstLeg = legs[0];
                    await this.setBlockSensor(simulator, firstLeg.fromBlockId, true);
                    await this.params.updateTaskSimulationProgress(task.id, {
                        phase: "departing",
                        legIndex: 0,
                        legCount: legs.length,
                        fromBlockId: firstLeg.fromBlockId,
                        fromBlockName: firstLeg.fromBlockName,
                        toBlockId: firstLeg.toBlockId,
                        toBlockName: firstLeg.toBlockName,
                    });
                    this.sessions.set(task.id, session);
                    await simulator.setLoco(task.runtime.loco.address, task.status === "paused"
                        ? 0
                        : task.targetSpeed, this.resolveDirection(task));
                    log(`[TrainSimulator] Session created: ${task.name} (${task.id}), legs: ${legs
                        .map(leg => `${leg.fromBlockName}→${leg.toBlockName}`)
                        .join(", ")}`);
                }
                if (task.status === "paused") {
                    await this.pauseSession(simulator, task, session);
                    continue;
                }
                await this.resumeSessionIfNeeded(simulator, task, session);
                await this.advanceRunningSession(simulator, task, session);
            }
        }
        catch (error) {
            logError("[TrainSimulator] Tick failed:", error);
        }
        finally {
            this.tickRunning = false;
        }
    }
    async pauseSession(simulator, task, session) {
        if (session.pausedAt !== null) {
            return;
        }
        session.pausedAt = Date.now();
        await simulator.setLoco(task.runtime.loco.address, 0, this.resolveDirection(task));
        log(`[TrainSimulator] Session paused: ${task.name} (${task.id})`);
    }
    async resumeSessionIfNeeded(simulator, task, session) {
        if (session.pausedAt === null) {
            return;
        }
        const pausedDuration = Date.now() - session.pausedAt;
        session.phaseStartedAt += pausedDuration;
        session.pausedAt = null;
        await simulator.setLoco(task.runtime.loco.address, task.targetSpeed, this.resolveDirection(task));
        log(`[TrainSimulator] Session resumed: ${task.name} (${task.id})`);
    }
    async advanceRunningSession(simulator, task, session) {
        const params = this.params;
        if (!params) {
            return;
        }
        const elapsed = Date.now() - session.phaseStartedAt;
        const currentLeg = session.legs[session.legIndex];
        if (!currentLeg) {
            logError(`[TrainSimulator] Missing current leg for task: ${task.name} (${task.id})`);
            this.sessions.delete(task.id);
            return;
        }
        /**
         * Ütközésvédelem:
         * mielőtt a mozdony elhagyná az aktuális blokkot,
         * megnézzük, hogy a következő blokk foglalt-e másik mozdonnyal.
         * Ha igen, megállítjuk a mozdonyt és várunk.
         */
        if (session.phase === "departing" &&
            this.isBlockOccupiedByOtherLoco(currentLeg.toBlockId, task)) {
            const waitingSensorAddress = this.getBlockSensorAddress(currentLeg.toBlockId);
            await simulator.setLoco(task.runtime.loco.address, 0, this.resolveDirection(task));
            session.phase = "waitingForBlockSensor";
            session.phaseStartedAt = Date.now();
            await params.updateTaskSimulationProgress(task.id, {
                phase: "waitingForBlockSensor",
                legIndex: session.legIndex,
                legCount: session.legs.length,
                fromBlockId: currentLeg.fromBlockId,
                fromBlockName: currentLeg.fromBlockName,
                toBlockId: currentLeg.toBlockId,
                toBlockName: currentLeg.toBlockName,
                waitingSensorAddress: waitingSensorAddress > 0
                    ? waitingSensorAddress
                    : null,
            });
            log(`[TrainSimulator] Waiting for sensor #${waitingSensorAddress > 0 ? waitingSensorAddress : "?"} before entering ${currentLeg.toBlockName}: ${task.name} (${task.id})`);
            return;
        }
        /**
         * Ha korábban ütközésvédelem miatt álltunk meg,
         * addig maradunk itt, amíg a célblokk fel nem szabadul.
         */
        if (session.phase === "waitingForBlockSensor") {
            if (this.isBlockOccupiedByOtherLoco(currentLeg.toBlockId, task)) {
                return;
            }
            await simulator.setLoco(task.runtime.loco.address, task.targetSpeed, this.resolveDirection(task));
            session.phase = "departing";
            session.phaseStartedAt = Date.now();
            await params.updateTaskSimulationProgress(task.id, {
                phase: "departing",
                legIndex: session.legIndex,
                legCount: session.legs.length,
                fromBlockId: currentLeg.fromBlockId,
                fromBlockName: currentLeg.fromBlockName,
                toBlockId: currentLeg.toBlockId,
                toBlockName: currentLeg.toBlockName,
                waitingSensorAddress: null,
            });
            log(`[TrainSimulator] Collision guard released, departure allowed: ${currentLeg.fromBlockName}→${currentLeg.toBlockName}: ${task.name} (${task.id})`);
            return;
        }
        /**
         * 1. fázis:
         * a jelenlegi blokk elhagyása.
         *
         * Első legnél A1 ürül.
         * Köztes legnél például B1 ürül.
         */
        if (session.phase === "departing" &&
            elapsed >= DEPARTURE_DELAY_MS) {
            await this.setBlockSensor(simulator, currentLeg.fromBlockId, false);
            simulator.setBlockRemove({
                blockId: currentLeg.fromBlockId,
                locoId: task.runtime.loco.id,
            });
            /**
             * Csak az első induló blokk elhagyásakor
             * jelezzük a task runtime felé.
             */
            if (session.legIndex === 0) {
                await params.markTaskLeftFromBlock(task.id);
            }
            session.phase = "transit";
            session.phaseStartedAt = Date.now();
            await params.updateTaskSimulationProgress(task.id, {
                phase: "transit",
                legIndex: session.legIndex,
                legCount: session.legs.length,
                fromBlockId: currentLeg.fromBlockId,
                fromBlockName: currentLeg.fromBlockName,
                toBlockId: currentLeg.toBlockId,
                toBlockName: currentLeg.toBlockName,
            });
            log(`[TrainSimulator] Loco left block ${currentLeg.fromBlockName}: ${task.name} (${task.id})`);
            return;
        }
        /**
         * 2. fázis:
         * megérkezés a következő blokkba.
         */
        if (session.phase === "transit" &&
            elapsed >= this.getLegTransitDurationMs(currentLeg)) {
            await this.setBlockSensor(simulator, currentLeg.toBlockId, true);
            simulator.setBlock({
                blockId: currentLeg.toBlockId,
                locoId: task.runtime.loco.id,
            });
            log(`[TrainSimulator] Loco reached block ${currentLeg.toBlockName}: ${task.name} (${task.id})`);
            const isLastLeg = session.legIndex >= session.legs.length - 1;
            /**
             * Ha ez volt az utolsó blokk:
             * megállítjuk a mozdonyt,
             * a task runtime lezárja az aktuális ciklust,
             * majd újra várakozás következik.
             */
            if (isLastLeg) {
                await simulator.setLoco(task.runtime.loco.address, 0, this.resolveDirection(task));
                await params.markTaskReachedToBlock(task.id);
                this.sessions.delete(task.id);
                log(`[TrainSimulator] Route cycle finished: ${task.name} (${task.id})`);
                return;
            }
            /**
             * Van még következő blokk:
             * továbblépünk a következő legre.
             *
             * Példa:
             * A1→B1 után jön B1→C1.
             */
            session.legIndex += 1;
            session.phase = "departing";
            session.phaseStartedAt = Date.now();
            const nextLeg = session.legs[session.legIndex];
            if (!nextLeg) {
                logError(`[TrainSimulator] Missing next leg for task: ${task.name} (${task.id})`);
                this.sessions.delete(task.id);
                return;
            }
            await params.updateTaskSimulationProgress(task.id, {
                phase: "departing",
                legIndex: session.legIndex,
                legCount: session.legs.length,
                fromBlockId: nextLeg.fromBlockId,
                fromBlockName: nextLeg.fromBlockName,
                toBlockId: nextLeg.toBlockId,
                toBlockName: nextLeg.toBlockName,
            });
            return;
        }
    }
    async stopLocoIfKnown(simulator, task) {
        if (!task?.runtime.loco) {
            return;
        }
        await simulator.setLoco(task.runtime.loco.address, 0, this.resolveDirection(task));
    }
    async setBlockSensor(simulator, blockId, on) {
        if (!simulator.setSensor) {
            return;
        }
        const sensorAddress = this.getBlockSensorAddress(blockId);
        if (sensorAddress <= 0) {
            return;
        }
        const success = await simulator.setSensor(sensorAddress, on);
        if (!success) {
            logError(`[TrainSimulator] Failed to set sensor #${sensorAddress} to ${on ? "ON" : "OFF"}.`);
        }
    }
    isBlockOccupiedByOtherLoco(blockId, task) {
        const blockState = this.params?.getBlockState(blockId) ?? null;
        const occupantLocoId = blockState?.locoId ?? null;
        const currentLocoId = task.runtime.loco?.id ?? null;
        return (occupantLocoId !== null &&
            occupantLocoId !== currentLocoId);
    }
    getBlockSensorAddress(blockId) {
        const topology = railwayTopologyStore.getTopology();
        if (!topology) {
            return 0;
        }
        const block = topology
            .getBlocks()
            .find(item => item.id === blockId);
        if (!block) {
            return 0;
        }
        return Number.isFinite(block.sensorAddress)
            ? block.sensorAddress
            : 0;
    }
    /**
     * A teljes route path-ból dinamikusan blokk-lépéseket gyártunk.
     *
     * Például:
     * path:
     *   A1, S1, B1, S2, C1
     *
     * legs:
     *   A1 -> B1
     *   B1 -> C1
     */
    createSimulationLegs(task) {
        const legs = [];
        let previousBlock = null;
        let segmentCountSincePreviousBlock = 0;
        for (const item of task.transition.solution.path) {
            if (item.type === "segment") {
                segmentCountSincePreviousBlock += 1;
                continue;
            }
            if (item.type !== "block") {
                continue;
            }
            const currentBlock = {
                id: item.block.id,
                name: item.block.name,
            };
            if (!previousBlock) {
                previousBlock = currentBlock;
                segmentCountSincePreviousBlock = 0;
                continue;
            }
            if (previousBlock.id === currentBlock.id) {
                continue;
            }
            legs.push({
                fromBlockId: previousBlock.id,
                fromBlockName: previousBlock.name,
                toBlockId: currentBlock.id,
                toBlockName: currentBlock.name,
                segmentCount: Math.max(1, segmentCountSincePreviousBlock),
            });
            previousBlock = currentBlock;
            segmentCountSincePreviousBlock = 0;
        }
        return legs;
    }
    getLegTransitDurationMs(leg) {
        return Math.max(MIN_TRANSIT_PER_LEG_MS, leg.segmentCount * BASE_TRANSIT_PER_SEGMENT_MS);
    }
    resolveDirection(task) {
        const direction = task.transition.solution.locoDirection;
        return direction === "reverse"
            ? "reverse"
            : "forward";
    }
}
export const trainSimulatorRuntimeStore = new TrainSimulatorRuntimeStore();

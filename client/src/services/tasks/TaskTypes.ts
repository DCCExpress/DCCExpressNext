import type { RunnableBlockTransition } from "../../models/editor/core/Graph";

export type TrainTaskStatus =
    | "queued"
    | "running"
    | "paused"
    | "stopped"
    | "completed"
    | "error";

export type TrainTaskCreateInput = {
    name?: string;

    locoAddress: number;
    targetSpeed: number;

    fromBlockId: string;
    toBlockId: string;
};

export type TrainTaskRuntimeState = {
    /**
     * Majd akkor áll true-ra, amikor a vonat
     * elhagyta a from blokk foglaltsági szenzorát.
     */
    hasLeftFromBlock: boolean;

    /**
     * Majd akkor áll true-ra, amikor a vonat
     * elérte a to blokk foglaltsági szenzorát.
     */
    hasReachedToBlock: boolean;

    /**
     * A "két blokk között jár" állapot.
     * Ebből kap majd a TrackCanvas piros áttetsző overlay-t.
     */
    inTransit: boolean;
};

export type TrainTask = {
    id: string;
    name: string;

    locoAddress: number;
    targetSpeed: number;

    fromBlockId: string;
    toBlockId: string;

    transition: RunnableBlockTransition;

    status: TrainTaskStatus;

    createdAt: number;
    startedAt?: number;
    stoppedAt?: number;
    completedAt?: number;

    runtime: TrainTaskRuntimeState;

    error?: string;
};

export type TaskManagerOverlayState = {
    /**
     * Aktív / pause-olt taskok által érintett szegmensek.
     * Később akár route reservation vizualizálásra is jó.
     */
    reservedSectionNames: string[];

    /**
     * Amikor a vonat már lejött a from blokk érzékelőjéről,
     * de még nem ért be a célblokkba,
     * ezeket a szegmenseket halvány pirossal rajzoljuk.
     */
    transitSectionNames: string[];

    /**
     * Aktív taskok végblokkai.
     */
    activeBlockIds: string[];

    /**
     * Aktív taskok által használt váltók.
     */
    activeTurnoutAddresses: number[];
};

export type TaskManagerSnapshot = {
    tasks: TrainTask[];
    overlay: TaskManagerOverlayState;

    hasGraph: boolean;
    hasLayout: boolean;
};

export type TaskManagerActionResult =
    | {
        ok: true;
    }
    | {
        ok: false;
        error: string;
    };

export type AddTrainTaskResult =
    | {
        ok: true;
        task: TrainTask;
    }
    | {
        ok: false;
        error: string;
    };


export type SavedTrainTask = {
    id: string;
    name: string;

    locoAddress: number;
    targetSpeed: number;

    fromBlockId: string;
    toBlockId: string;

    createdAt: number;
};

export type LoadTrainTasksResult =
    | {
        ok: true;
        loadedCount: number;
        skippedCount: number;
        warnings: string[];
    }
    | {
        ok: false;
        error: string;
    };    
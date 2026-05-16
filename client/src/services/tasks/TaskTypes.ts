import { Loco } from "../../../../common/src/types";
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
    targetSpeed: number;
    fromBlockId: string;
    toBlockId: string;
};

export type TrainTaskRuntimeState = {
    /**
     * Startkor az induló blokkból kiolvasott mozdonycím.
     * Futás közben ezt használjuk Pause / Resume / Stop műveleteknél.
     */
    loco: Loco | null;
    hasLeftFromBlock: boolean;
    hasReachedToBlock: boolean;
    inTransit: boolean;
};

export type TrainTask = {
    id: string;
    name: string;

    
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
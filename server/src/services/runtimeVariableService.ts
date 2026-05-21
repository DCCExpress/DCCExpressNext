// server/src/services/runtimeVariableService.ts

import {
  runtimeVariableStore,
} from "./runtimeVariableStore.js";

import {
  type RuntimeVariableChangedPayload,
  type RuntimeVariableKey,
  type RuntimeVariableRejectedPayload,
  type RuntimeVariableValue,
  type RuntimeVariablesSnapshotPayload,
} from "../../../common/src/runtimeVariables.js";


import {
  taskRuntimeStore,
} from "./taskRuntimeStore.js";

export type RuntimeVariableSetContext = {
  clientId?: string | null;
  source?: string | null;
};

export type RuntimeVariableSetResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

type BroadcastRuntimeVariableMessage =
  | {
      type: "runtimeVariableChanged";
      data: RuntimeVariableChangedPayload;
    }
  | {
      type: "runtimeVariableRejected";
      data: RuntimeVariableRejectedPayload;
    }
  | {
      type: "runtimeVariablesSnapshot";
      data: RuntimeVariablesSnapshotPayload;
    };

export type RuntimeVariableBroadcast =
  (message: BroadcastRuntimeVariableMessage) => void;

class RuntimeVariableService {
  private broadcast: RuntimeVariableBroadcast | null = null;

  setBroadcast(
    broadcast: RuntimeVariableBroadcast
  ): void {
    this.broadcast = broadcast;
  }

  get<TKey extends RuntimeVariableKey>(
    key: TKey
  ): RuntimeVariableValue<TKey> {
    return runtimeVariableStore.get(key);
  }

  getSnapshot(): RuntimeVariablesSnapshotPayload {
    return {
      values: runtimeVariableStore.getSnapshot(),
    };
  }

  async requestSet<TKey extends RuntimeVariableKey>(
    key: TKey,
    value: RuntimeVariableValue<TKey>,
    context: RuntimeVariableSetContext = {}
  ): Promise<RuntimeVariableSetResult> {
    const validation =
      await this.validateSet(
        key,
        value,
        context
      );

    if (!validation.ok) {
      this.broadcast?.({
        type: "runtimeVariableRejected",
        data: {
          key,
          reason: validation.reason,
        },
      });

      return validation;
    }

    this.forceSet(key, value);

    return {
      ok: true,
    };
  }

  forceSet<TKey extends RuntimeVariableKey>(
    key: TKey,
    value: RuntimeVariableValue<TKey>
  ): void {
    runtimeVariableStore.set(key, value);

    this.broadcast?.({
      type: "runtimeVariableChanged",
      data: {
        key,
        value,
      },
    });
  }
  private async validateSet<TKey extends RuntimeVariableKey>(
    key: TKey,
    value: RuntimeVariableValue<TKey>,
    _context: RuntimeVariableSetContext
  ): Promise<RuntimeVariableSetResult> {
    if (
      key === "editor.editMode" &&
      value === true &&
      taskRuntimeStore.hasActiveTasks()
    ) {
      return {
        ok: false,
        reason: "Le kell állítani a futó feladatokat!",
      };
    }

    return {
      ok: true,
    };
  }

}

export const runtimeVariableService =
  new RuntimeVariableService();

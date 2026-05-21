// server/src/services/runtimeVariableStore.ts

import {
  getRuntimeVariableDefault,
  RUNTIME_VARIABLES,
  type RuntimeVariableKey,
  type RuntimeVariableSnapshot,
  type RuntimeVariableValue,
} from "../../../common/src/runtimeVariables.js";

class RuntimeVariableStore {
  private readonly values =
    new Map<RuntimeVariableKey, unknown>();

  get<TKey extends RuntimeVariableKey>(
    key: TKey
  ): RuntimeVariableValue<TKey> {
    if (this.values.has(key)) {
      return this.values.get(key) as RuntimeVariableValue<TKey>;
    }

    return getRuntimeVariableDefault(key);
  }

  set<TKey extends RuntimeVariableKey>(
    key: TKey,
    value: RuntimeVariableValue<TKey>
  ): void {
    this.values.set(key, value);
  }

  getSnapshot(): RuntimeVariableSnapshot {
    const snapshot =
      {} as RuntimeVariableSnapshot;

    for (const definition of Object.values(RUNTIME_VARIABLES)) {
      const key = definition.key;

      snapshot[key] =
        this.get(key) as never;
    }

    return snapshot;
  }
}

export const runtimeVariableStore =
  new RuntimeVariableStore();

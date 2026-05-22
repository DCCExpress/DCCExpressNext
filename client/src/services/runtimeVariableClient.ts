// client/src/services/runtimeVariableClient.ts

import {
  getRuntimeVariableDefault,
  type RuntimeVariableKey,
  type RuntimeVariableValue,
} from "../../../common/src/runtimeVariables";

import {
  showErrorMessage,
} from "../helpers";
import i18n from "../i18n";

import {
  wsApi,
} from "./wsApi";

import {
  wsClient,
} from "./wsClient";

type RuntimeVariableListener =
  () => void;

class RuntimeVariableClient {
  private readonly values =
    new Map<RuntimeVariableKey, unknown>();

  private readonly listeners =
    new Map<RuntimeVariableKey, Set<RuntimeVariableListener>>();

  private initialized =
    false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    wsClient.on(
      "runtimeVariableChanged",
      data => {
        this.applyRemote(data.key, data.value);
      }
    );

    wsClient.on(
      "runtimeVariablesSnapshot",
      data => {
        for (const [key, value] of Object.entries(data.values)) {
          this.applyRemote(
            key as RuntimeVariableKey,
            value as never
          );
        }
      }
    );

    wsClient.on(
      "runtimeVariableRejected",
      data => {
        showErrorMessage(
          i18n.t("runtimeVariable.title"),
          data.reason
        );
      }
    );
  }

  requestSnapshot(): void {
    wsApi.send(
      "getRuntimeVariables",
      {}
    );
  }

  get<TKey extends RuntimeVariableKey>(
    key: TKey
  ): RuntimeVariableValue<TKey> {
    if (this.values.has(key)) {
      return this.values.get(key) as RuntimeVariableValue<TKey>;
    }

    return getRuntimeVariableDefault(key);
  }

  requestSet<TKey extends RuntimeVariableKey>(
    key: TKey,
    value: RuntimeVariableValue<TKey>
  ): void {
    wsApi.send(
      "setRuntimeVariable",
      {
        key,
        value,
      }
    );
  }

  applyRemote<TKey extends RuntimeVariableKey>(
    key: TKey,
    value: RuntimeVariableValue<TKey>
  ): void {
    this.values.set(key, value);
    this.emit(key);
  }

  subscribe(
    key: RuntimeVariableKey,
    listener: RuntimeVariableListener
  ): () => void {
    let listeners =
      this.listeners.get(key);

    if (!listeners) {
      listeners =
        new Set<RuntimeVariableListener>();

      this.listeners.set(key, listeners);
    }

    listeners.add(listener);

    return () => {
      listeners?.delete(listener);
    };
  }

  private emit(
    key: RuntimeVariableKey
  ): void {
    for (const listener of this.listeners.get(key) ?? []) {
      listener();
    }
  }
}

export const runtimeVariableClient =
  new RuntimeVariableClient();

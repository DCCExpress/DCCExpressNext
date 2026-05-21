// client/src/hooks/useRuntimeVariable.ts

import {
  useEffect,
  useState,
  type SetStateAction,
} from "react";

import {
  type RuntimeVariableKey,
  type RuntimeVariableValue,
} from "../../../common/src/runtimeVariables";

import {
  runtimeVariableClient,
} from "../services/runtimeVariableClient";

export function useRuntimeVariable<
  TKey extends RuntimeVariableKey
>(
  key: TKey
): [
  RuntimeVariableValue<TKey>,
  (value: SetStateAction<RuntimeVariableValue<TKey>>) => void
] {
  const [
    value,
    setValue,
  ] =
    useState<RuntimeVariableValue<TKey>>(
      () => runtimeVariableClient.get(key)
    );

  useEffect(() => {
    runtimeVariableClient.initialize();
    runtimeVariableClient.requestSnapshot();

    return runtimeVariableClient.subscribe(
      key,
      () => {
        setValue(
          runtimeVariableClient.get(key)
        );
      }
    );
  }, [key]);

  return [
    value,
    next => {
      const resolved =
        typeof next === "function"
          ? (
            next as (
              previous: RuntimeVariableValue<TKey>
            ) => RuntimeVariableValue<TKey>
          )(runtimeVariableClient.get(key))
          : next;

      runtimeVariableClient.requestSet(
        key,
        resolved
      );
    },
  ];
}

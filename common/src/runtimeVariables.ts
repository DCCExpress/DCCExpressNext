// common/src/runtimeVariables.ts

/**
 * Server-authoritative runtime variable rendszer.
 *
 * A kliens nem állítja át közvetlenül ezeket az értékeket.
 * A kliens kérést küld, a szerver validál, majd siker esetén broadcastol.
 */

export type RuntimeVariableKey =
  | "editor.editMode";

export type RuntimeVariableValueMap = {
  "editor.editMode": boolean;
};

export type RuntimeVariableValue<
  TKey extends RuntimeVariableKey
> = RuntimeVariableValueMap[TKey];

export type RuntimeVariableDefinition<
  TKey extends RuntimeVariableKey = RuntimeVariableKey
> = {
  key: TKey;
  defaultValue: RuntimeVariableValue<TKey>;
  serverAuthoritative: true;
  persistent?: boolean;
};

export const RUNTIME_VARIABLES = {
  editorEditMode: {
    key: "editor.editMode",
    defaultValue: false,
    serverAuthoritative: true,
    persistent: false,
  },
} as const satisfies Record<
  string,
  RuntimeVariableDefinition
>;

export function getRuntimeVariableDefault<
  TKey extends RuntimeVariableKey
>(
  key: TKey
): RuntimeVariableValue<TKey> {
  const definition =
    Object.values(RUNTIME_VARIABLES)
      .find(item => item.key === key);

  if (!definition) {
    throw new Error(
      `Unknown runtime variable: ${key}`
    );
  }

  return definition.defaultValue as RuntimeVariableValue<TKey>;
}

export function isRuntimeVariableKey(
  value: unknown
): value is RuntimeVariableKey {
  return (
    typeof value === "string" &&
    Object.values(RUNTIME_VARIABLES)
      .some(item => item.key === value)
  );
}

export type RuntimeVariableSnapshot = {
  [K in RuntimeVariableKey]: RuntimeVariableValue<K>;
};

export type SetRuntimeVariablePayload<
  TKey extends RuntimeVariableKey = RuntimeVariableKey
> = {
  key: TKey;
  value: RuntimeVariableValue<TKey>;
};

export type RuntimeVariableChangedPayload<
  TKey extends RuntimeVariableKey = RuntimeVariableKey
> = {
  key: TKey;
  value: RuntimeVariableValue<TKey>;
};

export type RuntimeVariableRejectedPayload = {
  key: RuntimeVariableKey;
  reason: string;
};

export type RuntimeVariablesSnapshotPayload = {
  values: RuntimeVariableSnapshot;
};

// server/src/services/commandCenterConfigStore.ts

import type {
  ICommandCenter,
} from "../../../common/src/types.js";

import {
  normalizeCommandCenterSettings,
} from "../../../common/src/appSettings.js";

import {
  appSettingsStore,
} from "./appSettingsStore.js";

export type CommandCenterConfig = ICommandCenter;

export let CurrentCommandCenterConfig: CommandCenterConfig | null = null;

let cbCommandCenterConfigLoaded:
  | ((conf: CommandCenterConfig | null) => void)
  | null = null;

export function setCommandCenterConfigLoadedCallback(
  cb: (conf: CommandCenterConfig | null) => void
): void {
  cbCommandCenterConfigLoaded = cb;
}

export async function readCommandCenter(): Promise<CommandCenterConfig | null> {
  await appSettingsStore.initialize();

  CurrentCommandCenterConfig =
    appSettingsStore.getSettings().commandCenter;

  return CurrentCommandCenterConfig;
}

export function normalizeCommandCenter(
  input: Partial<CommandCenterConfig>
): CommandCenterConfig {
  return normalizeCommandCenterSettings(input);
}

export async function saveCommandCenterConfig(
  input: Partial<CommandCenterConfig>
): Promise<CommandCenterConfig> {
  const item = normalizeCommandCenter(input);

  await appSettingsStore.saveSettings({
    commandCenter: item,
  });

  CurrentCommandCenterConfig = item;

  cbCommandCenterConfigLoaded?.(item);

  return item;
}
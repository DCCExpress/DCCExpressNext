// common/src/appSettings.ts

import type {
  CommandCenterType,
  ICommandCenter,
} from "./domainTypes.js";

export type FastClockResetSource =
  | "system"
  | "configured";

export type FastClockSettings = {
  resetSource: FastClockResetSource;
  resetTimeMs: number;
};

export type AppSettings = {
  version: 1;
  fastClock: FastClockSettings;
  commandCenter: ICommandCenter;
};

export const DAY_MS =
  24 * 60 * 60 * 1000;

export const DEFAULT_FAST_CLOCK_RESET_TIME_MS =
  0;

export const DEFAULT_COMMAND_CENTER_SETTINGS: ICommandCenter = {
  name: "Simulator",
  type: "simulator",
  z21: {
    host: "192.168.1.100",
    port: 21105,
  },
  dccexTcp: {
    host: "",
    port: 2560,
    init: "",
  },
  dccexSerial: {
    serialPort: "",
    baudRate: 115200,
    init: "",
  },
  autoConnect: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,
  fastClock: {
    resetSource: "system",
    resetTimeMs: DEFAULT_FAST_CLOCK_RESET_TIME_MS,
  },
  commandCenter: DEFAULT_COMMAND_CENTER_SETTINGS,
};

export function normalizeDayTimeMs(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_FAST_CLOCK_RESET_TIME_MS;
  }

  const normalized =
    Math.floor(numeric) % DAY_MS;

  return normalized < 0
    ? normalized + DAY_MS
    : normalized;
}

function isValidCommandCenterType(
  value: unknown
): value is CommandCenterType {
  return (
    value === "z21" ||
    value === "dcc-ex-tcp" ||
    value === "dcc-ex-serial" ||
    value === "simulator"
  );
}

export function normalizeCommandCenterSettings(
  value: Partial<ICommandCenter> | null | undefined
): ICommandCenter {
  return {
    name: typeof value?.name === "string" && value.name.trim().length > 0
      ? value.name
      : DEFAULT_COMMAND_CENTER_SETTINGS.name,
    type: isValidCommandCenterType(value?.type)
      ? value.type
      : DEFAULT_COMMAND_CENTER_SETTINGS.type,
    z21: {
      host: typeof value?.z21?.host === "string"
        ? value.z21.host
        : DEFAULT_COMMAND_CENTER_SETTINGS.z21.host,
      port: typeof value?.z21?.port === "number"
        ? value.z21.port
        : DEFAULT_COMMAND_CENTER_SETTINGS.z21.port,
    },
    dccexTcp: {
      host: typeof value?.dccexTcp?.host === "string"
        ? value.dccexTcp.host
        : DEFAULT_COMMAND_CENTER_SETTINGS.dccexTcp.host,
      port: typeof value?.dccexTcp?.port === "number"
        ? value.dccexTcp.port
        : DEFAULT_COMMAND_CENTER_SETTINGS.dccexTcp.port,
      init: typeof value?.dccexTcp?.init === "string"
        ? value.dccexTcp.init
        : DEFAULT_COMMAND_CENTER_SETTINGS.dccexTcp.init,
    },
    dccexSerial: {
      serialPort: typeof value?.dccexSerial?.serialPort === "string"
        ? value.dccexSerial.serialPort
        : DEFAULT_COMMAND_CENTER_SETTINGS.dccexSerial.serialPort,
      baudRate: typeof value?.dccexSerial?.baudRate === "number"
        ? value.dccexSerial.baudRate
        : DEFAULT_COMMAND_CENTER_SETTINGS.dccexSerial.baudRate,
      init: typeof value?.dccexSerial?.init === "string"
        ? value.dccexSerial.init
        : DEFAULT_COMMAND_CENTER_SETTINGS.dccexSerial.init,
    },
    autoConnect: typeof value?.autoConnect === "boolean"
      ? value.autoConnect
      : DEFAULT_COMMAND_CENTER_SETTINGS.autoConnect,
  };
}

export function normalizeAppSettings(
  value: Partial<AppSettings> | null | undefined
): AppSettings {
  const resetSource =
    value?.fastClock?.resetSource === "configured"
      ? "configured"
      : "system";

  return {
    version: 1,
    fastClock: {
      resetSource,
      resetTimeMs: normalizeDayTimeMs(
        value?.fastClock?.resetTimeMs
      ),
    },
    commandCenter: normalizeCommandCenterSettings(
      value?.commandCenter
    ),
  };
}

export function dayTimeMsToTimeInputValue(value: number): string {
  const normalized = normalizeDayTimeMs(value);
  const totalSeconds = Math.floor(normalized / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeInputValueToDayTimeMs(value: string): number {
  const [hoursText = "0", minutesText = "0"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return DEFAULT_FAST_CLOCK_RESET_TIME_MS;
  }

  return normalizeDayTimeMs(
    hours * 60 * 60 * 1000 +
    minutes * 60 * 1000
  );
}

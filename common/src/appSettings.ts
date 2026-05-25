// common/src/appSettings.ts

import type {
  CommandCenterType,
  ICommandCenter,
} from "./domainTypes.js";

export type AppLanguage = "en" | "hu";

export type GeneralSettings = {
  language: AppLanguage;
};

export type FastClockResetSource = "system" | "configured";

export type FastClockSettings = {
  resetSource: FastClockResetSource;
  resetTimeMs: number;
};

export type AppSettings = {
  version: 1;
  general: GeneralSettings;
  commandCenter: ICommandCenter;
  fastClock: FastClockSettings;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_FAST_CLOCK_RESET_TIME_MS = 0;

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  language: "en",
};

export const DEFAULT_COMMAND_CENTER_SETTINGS: ICommandCenter = {
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
  general: DEFAULT_GENERAL_SETTINGS,
  commandCenter: DEFAULT_COMMAND_CENTER_SETTINGS,
  fastClock: {
    resetSource: "system",
    resetTimeMs: DEFAULT_FAST_CLOCK_RESET_TIME_MS,
  },
};

export function normalizeDayTimeMs(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_FAST_CLOCK_RESET_TIME_MS;
  const normalized = Math.floor(numeric) % DAY_MS;
  return normalized < 0 ? normalized + DAY_MS : normalized;
}

function isValidCommandCenterType(value: unknown): value is CommandCenterType {
  return value === "z21" || value === "dcc-ex-tcp" || value === "dcc-ex-serial" || value === "simulator";
}

function isValidAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "hu";
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeTrimmedString(value: unknown, fallback: string): string {
  return normalizeString(value, fallback).trim();
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeIntegerRange(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = normalizeNumber(value, fallback);
  const integer = Math.round(numeric);
  return integer >= min && integer <= max ? integer : fallback;
}

function normalizePort(value: unknown, fallback: number): number {
  return normalizeIntegerRange(value, fallback, 1, 65535);
}

function normalizeBaudRate(value: unknown, fallback: number): number {
  return normalizeIntegerRange(value, fallback, 1, 10000000);
}

export function normalizeGeneralSettings(value: Partial<GeneralSettings> | null | undefined): GeneralSettings {
  return {
    language: isValidAppLanguage(value?.language) ? value.language : DEFAULT_GENERAL_SETTINGS.language,
  };
}

export function normalizeCommandCenterSettings(value: Partial<ICommandCenter> | null | undefined): ICommandCenter {
  return {
    type: isValidCommandCenterType(value?.type) ? value.type : DEFAULT_COMMAND_CENTER_SETTINGS.type,
    z21: {
      host: normalizeTrimmedString(value?.z21?.host, "192.168.1.100"),
      port: normalizePort(value?.z21?.port, 21105),
    },
    dccexTcp: {
      host: normalizeTrimmedString(value?.dccexTcp?.host, ""),
      port: normalizePort(value?.dccexTcp?.port, 2560),
      init: normalizeString(value?.dccexTcp?.init, ""),
    },
    dccexSerial: {
      serialPort: normalizeTrimmedString(value?.dccexSerial?.serialPort, ""),
      baudRate: normalizeBaudRate(value?.dccexSerial?.baudRate, 115200),
      init: normalizeString(value?.dccexSerial?.init, ""),
    },
    autoConnect: typeof value?.autoConnect === "boolean" ? value.autoConnect : false,
  };
}

export function normalizeAppSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  const resetSource = value?.fastClock?.resetSource === "configured" ? "configured" : "system";

  return {
    version: 1,
    general: normalizeGeneralSettings(value?.general),
    commandCenter: normalizeCommandCenterSettings(value?.commandCenter),
    fastClock: {
      resetSource,
      resetTimeMs: normalizeDayTimeMs(value?.fastClock?.resetTimeMs),
    },
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
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return DEFAULT_FAST_CLOCK_RESET_TIME_MS;
  return normalizeDayTimeMs(hours * 60 * 60 * 1000 + minutes * 60 * 1000);
}

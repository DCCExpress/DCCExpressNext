// common/src/appSettings.ts

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
};

export const DAY_MS =
  24 * 60 * 60 * 1000;

export const DEFAULT_FAST_CLOCK_RESET_TIME_MS =
  0;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,
  fastClock: {
    resetSource: "system",
    resetTimeMs: DEFAULT_FAST_CLOCK_RESET_TIME_MS,
  },
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

// client/src/api/appSettingsWsApi.ts

import type {
  AppSettings,
} from "../../../common/src/appSettings";

import {
  requestWsCommand,
} from "./wsRequest";

export async function loadAppSettingsWs(): Promise<AppSettings> {
  const response = await requestWsCommand(
    "appSettingsCommand",
    { action: "load" },
    "appSettingsResponse",
    "Could not load application settings."
  );

  if (!response.settings) {
    throw new Error("Missing application settings in response.");
  }

  return response.settings;
}

export async function storeAppSettingsWs(
  nextSettings: Partial<AppSettings>
): Promise<AppSettings> {
  const response = await requestWsCommand(
    "appSettingsCommand",
    {
      action: "save",
      settings: nextSettings,
    },
    "appSettingsResponse",
    "Could not store application settings."
  );

  if (!response.settings) {
    throw new Error("Missing application settings in response.");
  }

  return response.settings;
}

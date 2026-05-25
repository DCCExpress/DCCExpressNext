// server/src/services/appSettingsStore.ts

import fs from "node:fs/promises";
import path from "node:path";

import type { AppSettings } from "../../../common/src/appSettings.js";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "../../../common/src/appSettings.js";
import { dataDir } from "../paths.js";

class AppSettingsStore {
  private initialized = false;
  private settings: AppSettings = DEFAULT_APP_SETTINGS;
  private readonly filePath = path.resolve(dataDir, "app-settings.json");

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.settings = normalizeAppSettings(JSON.parse(raw) as Partial<AppSettings>);
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error("[AppSettingsStore] Failed to read app settings:", error);
      }

      this.settings = normalizeAppSettings(DEFAULT_APP_SETTINGS);
      await this.persist();
    }

    this.initialized = true;
  }

  getSettings(): AppSettings {
    return {
      ...this.settings,
      general: { ...this.settings.general },
      commandCenter: {
        ...this.settings.commandCenter,
        z21: { ...this.settings.commandCenter.z21 },
        dccexTcp: { ...this.settings.commandCenter.dccexTcp },
        dccexSerial: { ...this.settings.commandCenter.dccexSerial },
      },
      fastClock: { ...this.settings.fastClock },
      audio: { ...this.settings.audio },
    };
  }

  async saveSettings(input: Partial<AppSettings>): Promise<AppSettings> {
    await this.initialize();

    this.settings = normalizeAppSettings({
      ...this.settings,
      ...input,
      general: {
        ...this.settings.general,
        ...input.general,
      },
      commandCenter: {
        ...this.settings.commandCenter,
        ...input.commandCenter,
        z21: {
          ...this.settings.commandCenter.z21,
          ...input.commandCenter?.z21,
        },
        dccexTcp: {
          ...this.settings.commandCenter.dccexTcp,
          ...input.commandCenter?.dccexTcp,
        },
        dccexSerial: {
          ...this.settings.commandCenter.dccexSerial,
          ...input.commandCenter?.dccexSerial,
        },
      },
      fastClock: {
        ...this.settings.fastClock,
        ...input.fastClock,
      },
      audio: {
        ...this.settings.audio,
        ...input.audio,
      },
    });

    await this.persist();
    return this.getSettings();
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.settings, null, 2), "utf8");
  }
}

export const appSettingsStore = new AppSettingsStore();

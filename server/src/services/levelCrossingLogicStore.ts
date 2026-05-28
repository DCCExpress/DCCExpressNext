import fs from "node:fs/promises";
import path from "node:path";

import type {
  LevelCrossingLogicDocumentDto,
} from "../../../common/src/levelCrossingLogic.js";

import {
  DEFAULT_LEVEL_CROSSING_LOGIC_DOCUMENT,
  normalizeLevelCrossingLogicDocument,
} from "../../../common/src/levelCrossingLogic.js";

import {
  dataDir,
} from "../paths.js";

type LevelCrossingLogicInitializeResult = {
  created: boolean;
};

class LevelCrossingLogicStore {
  private initialized = false;
  private createdOnInitialize = false;
  private document: LevelCrossingLogicDocumentDto = DEFAULT_LEVEL_CROSSING_LOGIC_DOCUMENT;
  private readonly filePath = path.resolve(dataDir, "level-crossing-logic.json");

  async initialize(): Promise<LevelCrossingLogicInitializeResult> {
    if (this.initialized) {
      return { created: false };
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.document = normalizeLevelCrossingLogicDocument(JSON.parse(raw));
      this.createdOnInitialize = false;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error("[LevelCrossingLogicStore] Failed to read level crossing logic:", error);
      }

      this.document = normalizeLevelCrossingLogicDocument(DEFAULT_LEVEL_CROSSING_LOGIC_DOCUMENT);
      this.createdOnInitialize = true;
      await this.persist();
    }

    this.initialized = true;

    return { created: this.createdOnInitialize };
  }

  getDocument(): LevelCrossingLogicDocumentDto {
    return structuredClone(this.document);
  }

  async saveDocument(input: LevelCrossingLogicDocumentDto): Promise<LevelCrossingLogicDocumentDto> {
    await this.initialize();

    this.document = normalizeLevelCrossingLogicDocument(input);
    await this.persist();
    this.createdOnInitialize = false;

    return this.getDocument();
  }

  async setEnabled(enabled: boolean): Promise<LevelCrossingLogicDocumentDto> {
    await this.initialize();

    this.document = normalizeLevelCrossingLogicDocument({
      ...this.document,
      enabled,
    });

    await this.persist();
    this.createdOnInitialize = false;

    return this.getDocument();
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      JSON.stringify(this.document, null, 2),
      "utf8"
    );
  }
}

export const levelCrossingLogicStore = new LevelCrossingLogicStore();

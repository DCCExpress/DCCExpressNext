// server/src/services/signalLogicRulesStore.ts

import fs from "node:fs/promises";
import path from "node:path";

import type {
  SignalLogicDocumentDto,
} from "../../../common/src/signalLogic.js";
import {
  DEFAULT_SIGNAL_LOGIC_DOCUMENT,
  normalizeSignalLogicDocument,
} from "../../../common/src/signalLogic.js";

import { dataDir } from "../paths.js";

type SignalLogicRulesInitializeResult = {
  created: boolean;
};

class SignalLogicRulesStore {
  private initialized = false;
  private createdOnInitialize = false;
  private document: SignalLogicDocumentDto = DEFAULT_SIGNAL_LOGIC_DOCUMENT;
  private readonly filePath = path.resolve(dataDir, "signal-rules.json");

  async initialize(): Promise<SignalLogicRulesInitializeResult> {
    if (this.initialized) {
      return {
        created: false,
      };
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.document = normalizeSignalLogicDocument(JSON.parse(raw));
      this.createdOnInitialize = false;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error("[SignalLogicRulesStore] Failed to read signal rules:", error);
      }

      this.document = normalizeSignalLogicDocument(DEFAULT_SIGNAL_LOGIC_DOCUMENT);
      this.createdOnInitialize = true;
      await this.persist();
    }

    this.initialized = true;

    return {
      created: this.createdOnInitialize,
    };
  }

  getDocument(): SignalLogicDocumentDto {
    return {
      version: 1,
      groups: this.document.groups.map(group => ({
        ...group,
        rules: group.rules.map(rule => ({
          ...rule,
          conditions: rule.conditions.map(condition => ({ ...condition })),
        })),
      })),
    };
  }

  async saveDocument(input: SignalLogicDocumentDto): Promise<SignalLogicDocumentDto> {
    await this.initialize();

    this.document = normalizeSignalLogicDocument(input);
    await this.persist();
    this.createdOnInitialize = false;

    return this.getDocument();
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.document, null, 2), "utf8");
  }
}

export const signalLogicRulesStore = new SignalLogicRulesStore();

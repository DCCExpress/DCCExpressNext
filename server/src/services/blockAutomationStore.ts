import fs from "node:fs/promises";
import path from "node:path";

import type {
  BlockAutomationDocumentDto,
} from "../../../common/src/blockAutomation.js";
import {
  createEmptyBlockAutomationDocument,
} from "../../../common/src/blockAutomation.js";

import {
  dataDir,
} from "../paths.js";

type BlockAutomationInitializeResult = {
  created: boolean;
};

type LegacyBlockElement = {
  id?: unknown;
  type?: unknown;
  actions?: unknown;
};

type LegacyLayoutLayer = {
  elements?: unknown;
};

function normalizeBlockAutomationDocument(
  input: unknown
): BlockAutomationDocumentDto {
  const fallback = createEmptyBlockAutomationDocument();

  if (
    typeof input !== "object" ||
    input === null ||
    !("blocks" in input) ||
    typeof (input as { blocks?: unknown }).blocks !== "object" ||
    (input as { blocks?: unknown }).blocks === null
  ) {
    return fallback;
  }

  return {
    version: 1,
    blocks: structuredClone(
      (input as { blocks: BlockAutomationDocumentDto["blocks"] }).blocks
    ),
  };
}

function isNonEmptyActions(value: unknown): value is BlockAutomationDocumentDto["blocks"][string] {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const actions = value as {
    onTrainEnter?: unknown[];
    onTrainLeave?: unknown[];
  };

  return (
    (Array.isArray(actions.onTrainEnter) && actions.onTrainEnter.length > 0) ||
    (Array.isArray(actions.onTrainLeave) && actions.onTrainLeave.length > 0)
  );
}

class BlockAutomationStore {
  private initialized = false;
  private createdOnInitialize = false;
  private document: BlockAutomationDocumentDto = createEmptyBlockAutomationDocument();
  private readonly filePath = path.resolve(dataDir, "block-automation.json");
  private readonly legacyLayoutFilePath = path.resolve(dataDir, "layout.json");

  async initialize(): Promise<BlockAutomationInitializeResult> {
    if (this.initialized) {
      return { created: false };
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.document = normalizeBlockAutomationDocument(JSON.parse(raw));
      this.createdOnInitialize = false;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error("[BlockAutomationStore] Failed to read block automation:", error);
      }

      this.document = await this.createDocumentFromLegacyLayout();
      this.createdOnInitialize = true;
      await this.persist();
    }

    this.initialized = true;

    return { created: this.createdOnInitialize };
  }

  getDocument(): BlockAutomationDocumentDto {
    return structuredClone(this.document);
  }

  async saveDocument(input: BlockAutomationDocumentDto): Promise<BlockAutomationDocumentDto> {
    await this.initialize();

    this.document = normalizeBlockAutomationDocument(input);
    await this.persist();
    this.createdOnInitialize = false;

    return this.getDocument();
  }

  private async createDocumentFromLegacyLayout(): Promise<BlockAutomationDocumentDto> {
    const document = createEmptyBlockAutomationDocument();

    try {
      const raw = await fs.readFile(this.legacyLayoutFilePath, "utf8");
      const layout = JSON.parse(raw) as { layers?: LegacyLayoutLayer[] };

      for (const layer of layout.layers ?? []) {
        if (!Array.isArray(layer.elements)) {
          continue;
        }

        for (const rawElement of layer.elements) {
          const element = rawElement as LegacyBlockElement;

          if (element.type !== "trackblock") {
            continue;
          }

          if (typeof element.id !== "string") {
            continue;
          }

          if (!isNonEmptyActions(element.actions)) {
            continue;
          }

          document.blocks[element.id] = structuredClone(element.actions);
        }
      }

      const migratedCount = Object.keys(document.blocks).length;

      if (migratedCount > 0) {
        console.log(
          `[BlockAutomationStore] Migrated block actions from legacy layout storage: ${migratedCount} block(s).`
        );
      }
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error("[BlockAutomationStore] Legacy layout migration failed:", error);
      }
    }

    return document;
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

export const blockAutomationStore = new BlockAutomationStore();

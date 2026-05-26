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

class BlockAutomationStore {
  private initialized = false;
  private createdOnInitialize = false;
  private document: BlockAutomationDocumentDto = createEmptyBlockAutomationDocument();
  private readonly filePath = path.resolve(dataDir, "block-automation.json");

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

      this.document = createEmptyBlockAutomationDocument();
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

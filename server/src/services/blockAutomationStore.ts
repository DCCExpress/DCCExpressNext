import fs from "node:fs/promises";
import path from "node:path";

import type {
  BlockAutomationDocumentDto,
  BlockAutomationIntegrityReportDto,
} from "../../../common/src/blockAutomation.js";
import {
  createEmptyBlockAutomationDocument,
} from "../../../common/src/blockAutomation.js";

import type {
  SerializedLayoutDto,
  SerializedLayoutElementDto,
} from "../../../common/src/layout/layoutDto.js";

import {
  dataDir,
} from "../paths.js";
import {
  layoutRuntimeStore,
} from "./layoutRuntimeStore.js";

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

function getLayoutBlockIds(layout: SerializedLayoutDto | null): Set<string> {
  const result = new Set<string>();

  for (const layer of layout?.layers ?? []) {
    for (const element of layer.elements ?? []) {
      const item = element as SerializedLayoutElementDto;

      if (item.type !== "trackblock") {
        continue;
      }

      if (typeof item.id !== "string" || item.id.trim().length === 0) {
        continue;
      }

      result.add(item.id);
    }
  }

  return result;
}

function countActions(actions: BlockAutomationDocumentDto["blocks"][string]): {
  actionCount: number;
  onTrainEnterCount: number;
  onTrainLeaveCount: number;
} {
  const onTrainEnterCount = actions.onTrainEnter?.length ?? 0;
  const onTrainLeaveCount = actions.onTrainLeave?.length ?? 0;

  return {
    actionCount: onTrainEnterCount + onTrainLeaveCount,
    onTrainEnterCount,
    onTrainLeaveCount,
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

  async checkIntegrity(): Promise<BlockAutomationIntegrityReportDto> {
    await this.initialize();
    await layoutRuntimeStore.initialize();

    const layoutBlockIds = getLayoutBlockIds(layoutRuntimeStore.getLayout());
    const automationEntries = Object.entries(this.document.blocks);

    const orphanBlocks = automationEntries
      .filter(([blockId]) => !layoutBlockIds.has(blockId))
      .map(([blockId, actions]) => ({
        blockId,
        ...countActions(actions),
      }))
      .sort((a, b) => a.blockId.localeCompare(b.blockId, undefined, {
        numeric: true,
        sensitivity: "base",
      }));

    return {
      layoutBlockCount: layoutBlockIds.size,
      automationBlockCount: automationEntries.length,
      orphanBlocks,
    };
  }

  async deleteBlocks(blockIds: string[]): Promise<{
    document: BlockAutomationDocumentDto;
    deletedBlockIds: string[];
    integrity: BlockAutomationIntegrityReportDto;
  }> {
    await this.initialize();

    const uniqueBlockIds = [...new Set(
      blockIds
        .map(blockId => blockId.trim())
        .filter(blockId => blockId.length > 0)
    )];

    const deletedBlockIds: string[] = [];

    for (const blockId of uniqueBlockIds) {
      if (this.document.blocks[blockId] === undefined) {
        continue;
      }

      delete this.document.blocks[blockId];
      deletedBlockIds.push(blockId);
    }

    if (deletedBlockIds.length > 0) {
      await this.persist();
    }

    return {
      document: this.getDocument(),
      deletedBlockIds,
      integrity: await this.checkIntegrity(),
    };
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

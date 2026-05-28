// server/src/services/signalLogicRulesStore.ts

import fs from "node:fs/promises";
import path from "node:path";

import type {
  SignalLogicDocumentDto,
  SignalLogicIntegrityReportDto,
} from "../../../common/src/signalLogic.js";
import {
  DEFAULT_SIGNAL_LOGIC_DOCUMENT,
  normalizeSignalLogicDocument,
} from "../../../common/src/signalLogic.js";

import type {
  SerializedLayoutDto,
  SerializedLayoutElementDto,
} from "../../../common/src/layout/layoutDto.js";

import { dataDir } from "../paths.js";
import { layoutRuntimeStore } from "./layoutRuntimeStore.js";

type SignalLogicRulesInitializeResult = {
  created: boolean;
};

function getLayoutSignalAddresses(layout: SerializedLayoutDto | null): Set<number> {
  const result = new Set<number>();

  for (const layer of layout?.layers ?? []) {
    for (const element of layer.elements ?? []) {
      const item = element as SerializedLayoutElementDto;

      if (item.type !== "tracksignal2") {
        continue;
      }

      if (typeof item.address !== "number" || item.address <= 0) {
        continue;
      }

      result.add(item.address);
    }
  }

  return result;
}

function countConditions(group: SignalLogicDocumentDto["groups"][number]): number {
  return group.rules.reduce(
    (total, rule) => total + rule.conditions.length,
    0
  );
}

class SignalLogicRulesStore {
  private initialized = false;
  private createdOnInitialize = false;
  private document: SignalLogicDocumentDto = DEFAULT_SIGNAL_LOGIC_DOCUMENT;
  private readonly filePath = path.resolve(dataDir, "signal-rules.json");

  async initialize(): Promise<SignalLogicRulesInitializeResult> {
    if (this.initialized) {
      return { created: false };
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

    return { created: this.createdOnInitialize };
  }

  getDocument(): SignalLogicDocumentDto {
    return {
      version: 1,
      enabled: this.document.enabled,
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

  async setEnabled(enabled: boolean): Promise<SignalLogicDocumentDto> {
    await this.initialize();

    this.document = normalizeSignalLogicDocument({
      ...this.document,
      enabled,
    });

    await this.persist();
    this.createdOnInitialize = false;

    return this.getDocument();
  }

  async checkIntegrity(): Promise<SignalLogicIntegrityReportDto> {
    await this.initialize();
    await layoutRuntimeStore.initialize();

    const layoutSignalAddresses = getLayoutSignalAddresses(layoutRuntimeStore.getLayout());
    const orphanSignals = this.document.groups
      .filter(group => !layoutSignalAddresses.has(group.signalAddress))
      .map(group => ({
        groupId: group.id,
        signalAddress: group.signalAddress,
        ruleCount: group.rules.length,
        conditionCount: countConditions(group),
      }))
      .sort((a, b) => a.signalAddress - b.signalAddress);

    return {
      layoutSignalCount: layoutSignalAddresses.size,
      ruleGroupCount: this.document.groups.length,
      orphanSignals,
    };
  }

  async deleteSignalRuleGroups(signalAddresses: number[]): Promise<{
    document: SignalLogicDocumentDto;
    deletedSignalAddresses: number[];
    integrity: SignalLogicIntegrityReportDto;
  }> {
    await this.initialize();

    const uniqueAddresses = [...new Set(
      signalAddresses
        .map(address => Number(address))
        .filter(address => Number.isFinite(address) && address > 0)
    )];

    const addressSet = new Set(uniqueAddresses);
    const beforeCount = this.document.groups.length;

    this.document = {
      ...this.document,
      groups: this.document.groups.filter(group => !addressSet.has(group.signalAddress)),
    };

    const deletedSignalAddresses = beforeCount === this.document.groups.length
      ? []
      : uniqueAddresses;

    if (deletedSignalAddresses.length > 0) {
      await this.persist();
    }

    return {
      document: this.getDocument(),
      deletedSignalAddresses,
      integrity: await this.checkIntegrity(),
    };
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.document, null, 2), "utf8");
  }
}

export const signalLogicRulesStore = new SignalLogicRulesStore();

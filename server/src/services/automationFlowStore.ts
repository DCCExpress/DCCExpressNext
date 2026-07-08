import fs from "node:fs/promises";
import path from "node:path";

import type {
  AutomationFlowDocumentDto,
  AutomationFlowEdgeDto,
  AutomationFlowNodeDto,
} from "../../../common/src/automationFlow.js";
import {
  createEmptyAutomationFlowDocument,
} from "../../../common/src/automationFlow.js";

import {
  dataDir,
} from "../paths.js";

type AutomationFlowInitializeResult = {
  created: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeNode(input: unknown): AutomationFlowNodeDto | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = typeof input.id === "string" && input.id.trim().length > 0
    ? input.id
    : null;

  if (!id || !isRecord(input.data)) {
    return null;
  }

  const data = input.data;
  const kind = typeof data.kind === "string"
    ? data.kind
    : null;
  const label = typeof data.label === "string" && data.label.trim().length > 0
    ? data.label
    : id;

  if (!kind) {
    return null;
  }

  const position = isRecord(input.position)
    ? {
        x: toNumber(input.position.x, 0),
        y: toNumber(input.position.y, 0),
      }
    : { x: 0, y: 0 };

  return {
    id,
    type: "automationNode",
    position,
    data: {
      ...data,
      kind: kind as AutomationFlowNodeDto["data"]["kind"],
      label,
      ...(typeof data.description === "string" ? { description: data.description } : {}),
      ...(typeof data.ioKey === "string" ? { ioKey: data.ioKey } : {}),
      ...(typeof data.sensorAddress === "number" && Number.isFinite(data.sensorAddress)
        ? { sensorAddress: data.sensorAddress }
        : {}),
      ...(typeof data.turnoutAddress === "number" && Number.isFinite(data.turnoutAddress)
        ? { turnoutAddress: data.turnoutAddress }
        : {}),
      ...(typeof data.turnoutClosed === "boolean"
        ? { turnoutClosed: data.turnoutClosed }
        : {}),
      ...(typeof data.turnoutClosedValue === "boolean"
        ? { turnoutClosedValue: data.turnoutClosedValue }
        : {}),
      ...(typeof data.signalAddress === "number" && Number.isFinite(data.signalAddress)
        ? { signalAddress: data.signalAddress }
        : {}),
      ...(data.signalAspect === "red" || data.signalAspect === "yellow" || data.signalAspect === "green" || data.signalAspect === "white"
        ? { signalAspect: data.signalAspect }
        : {}),
      ...(typeof data.signalAddressLength === "number" && Number.isFinite(data.signalAddressLength)
        ? { signalAddressLength: data.signalAddressLength }
        : {}),
      ...(typeof data.signalValueRed === "number" && Number.isFinite(data.signalValueRed)
        ? { signalValueRed: data.signalValueRed }
        : {}),
      ...(typeof data.signalValueYellow === "number" && Number.isFinite(data.signalValueYellow)
        ? { signalValueYellow: data.signalValueYellow }
        : {}),
      ...(typeof data.signalValueGreen === "number" && Number.isFinite(data.signalValueGreen)
        ? { signalValueGreen: data.signalValueGreen }
        : {}),
      ...(typeof data.signalValueWhite === "number" && Number.isFinite(data.signalValueWhite)
        ? { signalValueWhite: data.signalValueWhite }
        : {}),
      ...(typeof data.delayMs === "number" && Number.isFinite(data.delayMs)
        ? { delayMs: data.delayMs }
        : {}),
      ...(typeof data.outputCommand === "string" ? { outputCommand: data.outputCommand } : {}),
      ...(typeof data.active === "boolean" ? { active: data.active } : {}),
    },
  };
}

function normalizeEdge(input: unknown): AutomationFlowEdgeDto | null {
  if (!isRecord(input)) {
    return null;
  }

  const source = typeof input.source === "string" && input.source.trim().length > 0
    ? input.source
    : null;
  const target = typeof input.target === "string" && input.target.trim().length > 0
    ? input.target
    : null;

  if (!source || !target) {
    return null;
  }

  const id = typeof input.id === "string" && input.id.trim().length > 0
    ? input.id
    : `${source}-${target}`;

  return {
    id,
    source,
    target,
    ...(typeof input.type === "string" ? { type: input.type } : {}),
    ...(typeof input.sourceHandle === "string" ? { sourceHandle: input.sourceHandle } : {}),
    ...(typeof input.targetHandle === "string" ? { targetHandle: input.targetHandle } : {}),
  };
}

function normalizeAutomationFlowDocument(input: unknown): AutomationFlowDocumentDto {
  const fallback = createEmptyAutomationFlowDocument();

  if (!isRecord(input)) {
    return fallback;
  }

  const nodes = Array.isArray(input.nodes)
    ? input.nodes
        .map(normalizeNode)
        .filter((node): node is AutomationFlowNodeDto => node !== null)
    : [];

  const validNodeIds = new Set(nodes.map(node => node.id));

  const edges = Array.isArray(input.edges)
    ? input.edges
        .map(normalizeEdge)
        .filter((edge): edge is AutomationFlowEdgeDto => (
          edge !== null &&
          validNodeIds.has(edge.source) &&
          validNodeIds.has(edge.target)
        ))
    : [];

  return {
    version: 1,
    name: typeof input.name === "string" && input.name.trim().length > 0
      ? input.name
      : fallback.name,
    nodes,
    edges,
    updatedAt: typeof input.updatedAt === "string"
      ? input.updatedAt
      : new Date().toISOString(),
  };
}

class AutomationFlowStore {
  private initialized = false;
  private createdOnInitialize = false;
  private document: AutomationFlowDocumentDto = createEmptyAutomationFlowDocument();
  private readonly filePath = path.resolve(dataDir, "automation-flow.json");

  async initialize(): Promise<AutomationFlowInitializeResult> {
    if (this.initialized) {
      return { created: false };
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.document = normalizeAutomationFlowDocument(JSON.parse(raw));
      this.createdOnInitialize = false;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error("[AutomationFlowStore] Failed to read automation flow:", error);
      }

      this.document = createEmptyAutomationFlowDocument();
      this.createdOnInitialize = true;
      await this.persist();
    }

    this.initialized = true;

    return { created: this.createdOnInitialize };
  }

  getDocument(): AutomationFlowDocumentDto {
    return structuredClone(this.document);
  }

  async saveDocument(input: AutomationFlowDocumentDto): Promise<AutomationFlowDocumentDto> {
    await this.initialize();

    this.document = normalizeAutomationFlowDocument({
      ...input,
      updatedAt: new Date().toISOString(),
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

export const automationFlowStore = new AutomationFlowStore();

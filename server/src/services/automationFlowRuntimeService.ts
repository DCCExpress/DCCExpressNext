import type {
  AutomationFlowDocumentDto,
  AutomationFlowEdgeDto,
  AutomationFlowNodeDto,
  AutomationFlowRuntimeSnapshotDto,
  AutomationSignalAspect,
} from "../../../common/src/automationFlow.js";

import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import type {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  automationFlowStore,
} from "./automationFlowStore.js";

import {
  log,
  logError,
} from "../utility.js";

type SignalInputAspect = Exclude<AutomationSignalAspect, "red">;

type AutomationSignalState = {
  valid: boolean;
  value: boolean;
  payload?: unknown;
  signalAspect?: AutomationSignalAspect;
};

type AutomationFunctionInput = {
  valid: boolean;
  value: boolean;
  payload: unknown;
  signalAspect?: AutomationSignalAspect | undefined;
};

type AutomationEvaluationState = Record<string, AutomationSignalState>;

type AutomationFlowRuntimeConfiguration = {
  getCommandCenter: () => CommandCenter | null;
  getLogicalTurnoutState: (address: number) => boolean | null;
};

const SIGNAL_INPUT_ASPECTS: SignalInputAspect[] = ["green", "yellow", "white"];

function emptySignal(): AutomationSignalState {
  return { valid: false, value: false };
}

function signal(
  value: boolean,
  signalAspect?: AutomationSignalAspect,
  payload: unknown = value
): AutomationSignalState {
  return {
    valid: true,
    value,
    payload,
    ...(signalAspect ? { signalAspect } : {}),
  };
}

function payloadsEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function signalsEqual(left: AutomationSignalState, right: AutomationSignalState): boolean {
  return left.valid === right.valid &&
    left.value === right.value &&
    left.signalAspect === right.signalAspect &&
    payloadsEqual(left.payload, right.payload);
}

function createIncomingEdgeMap(edges: AutomationFlowEdgeDto[]): Map<string, AutomationFlowEdgeDto[]> {
  const incoming = new Map<string, AutomationFlowEdgeDto[]>();

  for (const edge of edges) {
    const list = incoming.get(edge.target) ?? [];
    list.push(edge);
    incoming.set(edge.target, list);
  }

  return incoming;
}

function getNodeSignal(evaluation: AutomationEvaluationState, nodeId: string): AutomationSignalState {
  return evaluation[nodeId] ?? emptySignal();
}

function getPayload(signalState: AutomationSignalState): unknown {
  return signalState.payload ?? signalState.value;
}

function getNodePageId(node: AutomationFlowNodeDto): string {
  return typeof node.data.pageId === "string" && node.data.pageId.trim().length > 0
    ? node.data.pageId
    : "main";
}

function getEnabledPageIds(document: AutomationFlowDocumentDto): Set<string> {
  return new Set(
    document.pages
      .filter(page => page.enabled !== false)
      .map(page => page.id)
  );
}

function getEnabledDocument(document: AutomationFlowDocumentDto): AutomationFlowDocumentDto {
  const enabledPageIds = getEnabledPageIds(document);
  const nodes = document.nodes.filter(node => enabledPageIds.has(getNodePageId(node)));
  const nodeIds = new Set(nodes.map(node => node.id));
  const edges = document.edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  return {
    ...document,
    nodes,
    edges,
  };
}

function isInputNode(node: AutomationFlowNodeDto): boolean {
  return node.data.kind === "blockOccupied" ||
    node.data.kind === "sensor" ||
    node.data.kind === "turnout" ||
    node.data.kind === "button";
}

function getPhysicalTurnoutClosedFromLogical(logicalClosed: boolean, turnoutClosedValue: boolean | undefined): boolean {
  const physicalClosedForLogicalClosed = turnoutClosedValue ?? true;
  return logicalClosed ? physicalClosedForLogicalClosed : !physicalClosedForLogicalClosed;
}

function getSignalAspectBits(data: AutomationFlowNodeDto["data"], aspect: AutomationSignalAspect): number {
  switch (aspect) {
    case "green":
      return data.signalValueGreen ?? 0;
    case "white":
      return data.signalValueWhite ?? 0;
    case "yellow":
      return data.signalValueYellow ?? 0;
    case "red":
    default:
      return data.signalValueRed ?? 0;
  }
}

function getSignalAddressLength(data: AutomationFlowNodeDto["data"]): number {
  const raw = data.signalAddressLength ?? 1;

  if (!Number.isFinite(raw)) {
    return 1;
  }

  return Math.max(1, Math.floor(raw));
}

function getFunctionScript(node: AutomationFlowNodeDto): string {
  if (typeof node.data.functionScript === "string") {
    return node.data.functionScript;
  }

  if (typeof node.data.description === "string") {
    return node.data.description;
  }

  return "return payload;";
}

function evaluateFunctionNode(
  node: AutomationFlowNodeDto,
  inputSignals: AutomationSignalState[]
): AutomationSignalState {
  if (inputSignals.length === 0) {
    return emptySignal();
  }

  const inputs: AutomationFunctionInput[] = inputSignals.map(currentSignal => ({
    valid: currentSignal.valid,
    value: currentSignal.value,
    payload: getPayload(currentSignal),
    signalAspect: currentSignal.signalAspect,
  }));

  const payload = inputs.length === 1
    ? inputs[0]?.payload
    : inputs.map(input => input.payload);

  const script = getFunctionScript(node);
  const fn = new Function(
    "payload",
    "inputs",
    "node",
    "context",
    `"use strict";\n${script}`
  ) as (
    payload: unknown,
    inputs: AutomationFunctionInput[],
    node: AutomationFlowNodeDto["data"],
    context: Record<string, unknown>
  ) => unknown;

  const result = fn(
    payload,
    inputs,
    node.data,
    {
      nodeId: node.id,
      label: node.data.label,
    }
  );

  return signal(Boolean(result), undefined, result);
}

class AutomationFlowRuntimeService {
  private config: AutomationFlowRuntimeConfiguration | null = null;
  private evaluating = false;
  private pending = false;
  private running = true;
  private updatedAt = new Date().toISOString();
  private lastReason: string | undefined;
  private lastEvaluationAt: string | undefined;
  private lastError: string | undefined;
  private readonly lastTurnoutCommandByNode = new Map<string, string>();
  private readonly lastSignalCommandByNode = new Map<string, string>();

  configure(config: AutomationFlowRuntimeConfiguration): void {
    this.config = config;
  }

  getSnapshot(): AutomationFlowRuntimeSnapshotDto {
    return {
      status: this.running ? "running" : "stopped",
      running: this.running,
      updatedAt: this.updatedAt,
      ...(this.lastReason ? { lastReason: this.lastReason } : {}),
      ...(this.lastEvaluationAt ? { lastEvaluationAt: this.lastEvaluationAt } : {}),
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }

  async start(reason: string): Promise<AutomationFlowRuntimeSnapshotDto> {
    this.running = true;
    this.lastReason = reason;
    this.lastError = undefined;
    this.updatedAt = new Date().toISOString();
    await this.evaluate(reason);
    return this.getSnapshot();
  }

  stop(reason: string): AutomationFlowRuntimeSnapshotDto {
    this.running = false;
    this.lastReason = reason;
    this.updatedAt = new Date().toISOString();
    this.pending = false;
    this.lastSignalCommandByNode.clear();
    this.lastTurnoutCommandByNode.clear();
    return this.getSnapshot();
  }

  async initializeAndEvaluate(reason: string): Promise<void> {
    await automationFlowStore.initialize();
    await this.evaluate(reason);
  }

  handleRuntimeEvent(message: TypedServerWsMessage): void {
    if (!this.running) {
      return;
    }

    if (message.type !== "sensorChanged" && message.type !== "turnoutChanged") {
      return;
    }

    void this.evaluate(`runtime:${message.type}`).catch(error => {
      logError("[AutomationFlowRuntime] Runtime event evaluation failed:", error);
    });
  }

  async evaluate(reason: string): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.evaluating) {
      this.pending = true;
      return;
    }

    this.evaluating = true;

    try {
      do {
        this.pending = false;
        await this.evaluateOnce(reason);
      } while (this.pending && this.running);

      this.lastReason = reason;
      this.lastEvaluationAt = new Date().toISOString();
      this.lastError = undefined;
      this.updatedAt = new Date().toISOString();
    } catch (error) {
      this.lastReason = reason;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.updatedAt = new Date().toISOString();
      throw error;
    } finally {
      this.evaluating = false;
    }
  }

  private getCommandCenter(): CommandCenter | null {
    return this.config?.getCommandCenter() ?? null;
  }

  private evaluateInputNode(node: AutomationFlowNodeDto): AutomationSignalState {
    const commandCenter = this.getCommandCenter();

    switch (node.data.kind) {
      case "sensor": {
        const address = node.data.sensorAddress;
        if (typeof address !== "number" || !Number.isFinite(address)) {
          return emptySignal();
        }

        const sensor = commandCenter?.getSensors().find(item => item.address === address);
        const active = sensor?.active === true;
        return signal(active, undefined, active);
      }

      case "turnout": {
        const address = node.data.turnoutAddress;
        if (typeof address !== "number" || !Number.isFinite(address)) {
          return emptySignal();
        }

        const logicalClosed = this.config?.getLogicalTurnoutState(address);
        if (typeof logicalClosed !== "boolean") {
          return emptySignal();
        }

        const expectedLogicalClosed = node.data.turnoutClosed ?? true;
        const active = logicalClosed === expectedLogicalClosed;
        return signal(active, undefined, active);
      }

      case "blockOccupied":
      case "button": {
        const active = node.data.active === true;
        return signal(active, undefined, node.data.payload ?? active);
      }

      default:
        return emptySignal();
    }
  }

  private getEdgeSignalState(
    edge: AutomationFlowEdgeDto,
    sourceNode: AutomationFlowNodeDto | undefined,
    evaluation: AutomationEvaluationState
  ): AutomationSignalState {
    if (!sourceNode) {
      return emptySignal();
    }

    const sourceSignal = getNodeSignal(evaluation, edge.source);
    if (!sourceSignal.valid) {
      return emptySignal();
    }

    if (sourceNode.data.kind === "ifThenElse") {
      if (edge.sourceHandle === "else") {
        return sourceSignal.value
          ? emptySignal()
          : signal(true, undefined, getPayload(sourceSignal));
      }

      return sourceSignal.value
        ? signal(true, undefined, getPayload(sourceSignal))
        : emptySignal();
    }

    return sourceSignal;
  }

  private resolveSignalAspectFromInputs(
    incomingEdges: AutomationFlowEdgeDto[],
    nodeById: Map<string, AutomationFlowNodeDto>,
    evaluation: AutomationEvaluationState
  ): AutomationSignalAspect {
    const trueAspects = SIGNAL_INPUT_ASPECTS.filter(aspect => (
      incomingEdges.some(edge => {
        if (edge.targetHandle !== aspect) {
          return false;
        }

        const currentSignal = this.getEdgeSignalState(edge, nodeById.get(edge.source), evaluation);
        return currentSignal.valid && currentSignal.value;
      })
    ));

    if (trueAspects.length !== 1) {
      return "red";
    }

    return trueAspects[0] ?? "red";
  }

  private evaluateDocument(document: AutomationFlowDocumentDto): AutomationEvaluationState {
    const evaluation: AutomationEvaluationState = {};
    const nodeById = new Map(document.nodes.map(node => [node.id, node]));
    const incoming = createIncomingEdgeMap(document.edges);

    for (const node of document.nodes) {
      evaluation[node.id] = isInputNode(node)
        ? this.evaluateInputNode(node)
        : emptySignal();
    }

    for (let pass = 0; pass < document.nodes.length + 2; pass += 1) {
      let changed = false;

      for (const node of document.nodes) {
        if (isInputNode(node)) {
          continue;
        }

        const incomingEdges = incoming.get(node.id) ?? [];
        const inputSignals = incomingEdges
          .map(edge => this.getEdgeSignalState(edge, nodeById.get(edge.source), evaluation))
          .filter(currentSignal => currentSignal.valid);

        let nextSignal = emptySignal();

        switch (node.data.kind) {
          case "and":
            nextSignal = inputSignals.length > 0
              ? signal(
                  inputSignals.every(currentSignal => currentSignal.value),
                  undefined,
                  inputSignals.map(getPayload)
                )
              : emptySignal();
            break;

          case "or":
          case "timer":
          case "latch":
          case "routeLock":
          case "turnoutCommand":
          case "output": {
            const firstActiveSignal = inputSignals.find(currentSignal => currentSignal.value) ?? inputSignals[0];
            nextSignal = inputSignals.length > 0
              ? signal(
                  inputSignals.some(currentSignal => currentSignal.value),
                  undefined,
                  firstActiveSignal ? getPayload(firstActiveSignal) : undefined
                )
              : emptySignal();
            break;
          }

          case "filter": {
            const firstSignal = inputSignals[0];
            const filterValue = node.data.filterValue ?? true;
            nextSignal = firstSignal && firstSignal.value === filterValue
              ? signal(
                  firstSignal.value,
                  firstSignal.signalAspect,
                  getPayload(firstSignal)
                )
              : emptySignal();
            break;
          }

          case "function":
            nextSignal = evaluateFunctionNode(node, inputSignals);
            break;

          case "signal": {
            const aspect = this.resolveSignalAspectFromInputs(incomingEdges, nodeById, evaluation);
            nextSignal = signal(aspect !== "red", aspect, aspect);
            break;
          }

          case "ifThenElse": {
            const ifInputSignals = incomingEdges
              .filter(edge => (edge.targetHandle ?? "if") === "if")
              .map(edge => this.getEdgeSignalState(edge, nodeById.get(edge.source), evaluation))
              .filter(currentSignal => currentSignal.valid);
            const firstActiveSignal = ifInputSignals.find(currentSignal => currentSignal.value) ?? ifInputSignals[0];

            nextSignal = ifInputSignals.length > 0
              ? signal(
                  ifInputSignals.some(currentSignal => currentSignal.value),
                  undefined,
                  firstActiveSignal ? getPayload(firstActiveSignal) : undefined
                )
              : emptySignal();
            break;
          }

          case "not": {
            const firstSignal = inputSignals[0];
            nextSignal = firstSignal
              ? signal(!firstSignal.value, undefined, !firstSignal.value)
              : emptySignal();
            break;
          }

          default:
            nextSignal = emptySignal();
            break;
        }

        const currentSignal = getNodeSignal(evaluation, node.id);
        if (!signalsEqual(currentSignal, nextSignal)) {
          evaluation[node.id] = nextSignal;
          changed = true;
        }
      }

      if (!changed) {
        break;
      }
    }

    return evaluation;
  }

  private async evaluateOnce(reason: string): Promise<void> {
    const commandCenter = this.getCommandCenter();
    if (!commandCenter) {
      return;
    }

    await automationFlowStore.initialize();
    const document = getEnabledDocument(automationFlowStore.getDocument());
    if (document.nodes.length === 0) {
      this.lastSignalCommandByNode.clear();
      this.lastTurnoutCommandByNode.clear();
      return;
    }

    const evaluation = this.evaluateDocument(document);
    await this.executeOutputs(document, evaluation, reason, commandCenter);
  }

  private async executeOutputs(
    document: AutomationFlowDocumentDto,
    evaluation: AutomationEvaluationState,
    reason: string,
    commandCenter: CommandCenter
  ): Promise<void> {
    const evaluatedSignalNodeIds = new Set<string>();
    const activeTurnoutCommandNodeIds = new Set<string>();

    for (const node of document.nodes) {
      const currentSignal = getNodeSignal(evaluation, node.id);

      if (node.data.kind === "signal") {
        if (!currentSignal.valid) {
          continue;
        }

        evaluatedSignalNodeIds.add(node.id);
        await this.executeSignalNode(node, currentSignal.signalAspect ?? "red", reason, commandCenter);
        continue;
      }

      if (node.data.kind === "turnoutCommand") {
        if (!currentSignal.valid || !currentSignal.value) {
          continue;
        }

        activeTurnoutCommandNodeIds.add(node.id);
        await this.executeTurnoutCommandNode(node, reason, commandCenter);
      }
    }

    for (const nodeId of Array.from(this.lastSignalCommandByNode.keys())) {
      if (!evaluatedSignalNodeIds.has(nodeId)) {
        this.lastSignalCommandByNode.delete(nodeId);
      }
    }

    for (const nodeId of Array.from(this.lastTurnoutCommandByNode.keys())) {
      if (!activeTurnoutCommandNodeIds.has(nodeId)) {
        this.lastTurnoutCommandByNode.delete(nodeId);
      }
    }
  }

  private async executeSignalNode(
    node: AutomationFlowNodeDto,
    aspect: AutomationSignalAspect,
    reason: string,
    commandCenter: CommandCenter
  ): Promise<void> {
    const address = node.data.signalAddress;
    if (typeof address !== "number" || !Number.isFinite(address)) {
      logError("[AutomationFlowRuntime] Signal node has no valid address:", node.id);
      return;
    }

    const addressLength = getSignalAddressLength(node.data);
    const bits = getSignalAspectBits(node.data, aspect);
    const commandKey = `${node.id}:${address}:${aspect}:${addressLength}:${bits}`;

    if (this.lastSignalCommandByNode.get(node.id) === commandKey) {
      return;
    }

    let allSent = true;
    for (let i = 0; i < addressLength; i += 1) {
      const accessoryAddress = address + i;
      const active = ((bits >> i) & 1) === 1;
      allSent = await commandCenter.setBasicAccessory(accessoryAddress, active) && allSent;
    }

    if (allSent) {
      this.lastSignalCommandByNode.set(node.id, commandKey);
      log("[AutomationFlowRuntime] Signal command sent:", {
        reason,
        nodeId: node.id,
        address,
        aspect,
        bits,
      });
      await commandCenter.saveRuntimeState();
      return;
    }

    logError("[AutomationFlowRuntime] Signal command failed:", {
      reason,
      nodeId: node.id,
      address,
      aspect,
      bits,
    });
  }

  private async executeTurnoutCommandNode(
    node: AutomationFlowNodeDto,
    reason: string,
    commandCenter: CommandCenter
  ): Promise<void> {
    const address = node.data.turnoutAddress;
    if (typeof address !== "number" || !Number.isFinite(address)) {
      logError("[AutomationFlowRuntime] Turnout command node has no valid address:", node.id);
      return;
    }

    const logicalClosed = node.data.turnoutClosed ?? true;
    const physicalClosed = getPhysicalTurnoutClosedFromLogical(logicalClosed, node.data.turnoutClosedValue);
    const commandKey = `${node.id}:${address}:${physicalClosed}`;

    if (this.lastTurnoutCommandByNode.get(node.id) === commandKey) {
      return;
    }

    const sent = await commandCenter.setTurnout(address, physicalClosed);
    if (sent) {
      this.lastTurnoutCommandByNode.set(node.id, commandKey);
      log("[AutomationFlowRuntime] Turnout command sent:", {
        reason,
        nodeId: node.id,
        address,
        physicalClosed,
      });
      await commandCenter.saveRuntimeState();
      return;
    }

    logError("[AutomationFlowRuntime] Turnout command failed:", {
      reason,
      nodeId: node.id,
      address,
      physicalClosed,
    });
  }
}

export const automationFlowRuntimeService = new AutomationFlowRuntimeService();
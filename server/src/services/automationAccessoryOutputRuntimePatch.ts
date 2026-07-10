import type {
  AutomationFlowDocumentDto,
  AutomationFlowNodeDto,
} from "../../../common/src/automationFlow.js";

import type {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  log,
  logError,
} from "../utility.js";

type AutomationSignalState = {
  valid: boolean;
  value: boolean;
};

type AutomationEvaluationState = Record<string, AutomationSignalState>;

type RuntimeWithOutputs = {
  executeOutputs?: (
    document: AutomationFlowDocumentDto,
    evaluation: AutomationEvaluationState,
    reason: string,
    commandCenter: CommandCenter
  ) => Promise<void>;
  stop?: (reason: string) => unknown;
  __accessoryOutputPatchInstalled?: boolean;
};

function getPositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return null;
}

function getAccessoryAddress(node: AutomationFlowNodeDto): number | null {
  // Backward compatible UI path: the current property panel still edits outputCommand,
  // so prefer it when it contains a numeric accessory decoder address.
  const commandAddress = getPositiveInteger(node.data.outputCommand);
  if (commandAddress !== null) {
    return commandAddress;
  }

  const accessoryAddress = getPositiveInteger(node.data.accessoryAddress);
  if (accessoryAddress !== null) {
    return accessoryAddress;
  }

  if (typeof node.data.ioKey === "string") {
    const match = node.data.ioKey.match(/^(?:accessory|output):(\d+)$/u);
    if (match?.[1]) {
      return getPositiveInteger(match[1]);
    }
  }

  return null;
}

export function installAutomationAccessoryOutputRuntimePatch(runtimeService: unknown): void {
  const service = runtimeService as RuntimeWithOutputs;
  if (service.__accessoryOutputPatchInstalled) {
    return;
  }

  if (typeof service.executeOutputs !== "function") {
    logError("[AutomationFlowRuntime] Cannot install accessory output patch: executeOutputs is missing.");
    return;
  }

  const originalExecuteOutputs = service.executeOutputs.bind(service);
  const originalStop = typeof service.stop === "function"
    ? service.stop.bind(service)
    : null;
  const lastAccessoryCommandByNode = new Map<string, string>();

  service.executeOutputs = async (
    document: AutomationFlowDocumentDto,
    evaluation: AutomationEvaluationState,
    reason: string,
    commandCenter: CommandCenter
  ): Promise<void> => {
    await originalExecuteOutputs(document, evaluation, reason, commandCenter);

    const evaluatedOutputNodeIds = new Set<string>();

    for (const node of document.nodes) {
      if (node.data.kind !== "output") {
        continue;
      }

      const currentSignal = evaluation[node.id];
      if (!currentSignal?.valid) {
        continue;
      }

      const address = getAccessoryAddress(node);
      if (address === null) {
        logError("[AutomationFlowRuntime] Accessory output node has no valid address:", node.id);
        continue;
      }

      evaluatedOutputNodeIds.add(node.id);
      const active = currentSignal.value;
      const commandKey = `${node.id}:${address}:${active}`;

      if (lastAccessoryCommandByNode.get(node.id) === commandKey) {
        continue;
      }

      const sent = await commandCenter.setBasicAccessory(address, active);
      if (sent) {
        lastAccessoryCommandByNode.set(node.id, commandKey);
        log("[AutomationFlowRuntime] Accessory output command sent:", {
          reason,
          nodeId: node.id,
          address,
          active,
        });
        await commandCenter.saveRuntimeState();
        continue;
      }

      logError("[AutomationFlowRuntime] Accessory output command failed:", {
        reason,
        nodeId: node.id,
        address,
        active,
      });
    }

    for (const nodeId of Array.from(lastAccessoryCommandByNode.keys())) {
      if (!evaluatedOutputNodeIds.has(nodeId)) {
        lastAccessoryCommandByNode.delete(nodeId);
      }
    }
  };

  if (originalStop) {
    service.stop = (reason: string): unknown => {
      lastAccessoryCommandByNode.clear();
      return originalStop(reason);
    };
  }

  service.__accessoryOutputPatchInstalled = true;
}

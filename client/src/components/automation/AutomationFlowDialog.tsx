import { useEffect } from "react";
import { Badge, Box, Group, Modal, Text, Title } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";
import AutomationFlowEditor from "./AutomationFlowEditor";

type AutomationFlowDialogProps = {
  opened: boolean;
  onClose: () => void;
};

const LOGIC_DATA_FLOW_NODE_KINDS = new Set([
  "and",
  "or",
  "not",
  "timer",
  "latch",
  "routeLock",
]);

function findEdgeSourceNodeId(edgeId: string, nodeIds: string[]): string | null {
  return nodeIds
    .filter(nodeId => edgeId.startsWith(`${nodeId}-`))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

function findEdgeTargetNodeId(edgeId: string, nodeIds: string[], sourceNodeId: string | null): string | null {
  return nodeIds
    .filter(nodeId => nodeId !== sourceNodeId)
    .filter(nodeId => edgeId.includes(`-${nodeId}`) || edgeId.endsWith(nodeId))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

function toggleClass(element: Element, className: string, enabled: boolean): void {
  if (element.classList.contains(className) !== enabled) {
    element.classList.toggle(className, enabled);
  }
}

function syncAutomationEdgeDataFlow(root: Element): void {
  const nodeElements = Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"));
  const nodeIds = nodeElements
    .map(node => node.dataset.id)
    .filter((nodeId): nodeId is string => typeof nodeId === "string" && nodeId.length > 0);

  const nodeInfoById = new Map<string, { kind: string; value: string }>();
  const edgeInfoByElement = new Map<SVGGElement, { sourceNodeId: string | null; targetNodeId: string | null }>();
  const incomingCountByNodeId = new Map<string, number>();

  for (const nodeElement of nodeElements) {
    const nodeId = nodeElement.dataset.id;
    const card = nodeElement.querySelector<HTMLElement>("[data-automation-node-kind]");

    if (!nodeId || !card) {
      continue;
    }

    nodeInfoById.set(nodeId, {
      kind: card.dataset.automationNodeKind ?? "",
      value: card.dataset.automationOutputValue ?? "false",
    });
  }

  const edgeElements = Array.from(root.querySelectorAll<SVGGElement>(".react-flow__edge[data-id]"));

  for (const edgeElement of edgeElements) {
    const edgeId = edgeElement.dataset.id;
    const sourceNodeId = edgeId ? findEdgeSourceNodeId(edgeId, nodeIds) : null;
    const targetNodeId = edgeId ? findEdgeTargetNodeId(edgeId, nodeIds, sourceNodeId) : null;

    edgeInfoByElement.set(edgeElement, { sourceNodeId, targetNodeId });

    if (targetNodeId) {
      incomingCountByNodeId.set(targetNodeId, (incomingCountByNodeId.get(targetNodeId) ?? 0) + 1);
    }
  }

  for (const edgeElement of edgeElements) {
    const { sourceNodeId } = edgeInfoByElement.get(edgeElement) ?? { sourceNodeId: null, targetNodeId: null };
    const source = sourceNodeId ? nodeInfoById.get(sourceNodeId) : undefined;
    const sourceHasInput = sourceNodeId ? (incomingCountByNodeId.get(sourceNodeId) ?? 0) > 0 : false;
    const hasDataFlow = !!source && sourceHasInput && LOGIC_DATA_FLOW_NODE_KINDS.has(source.kind);
    const valueIsTrue = source?.value === "true";

    toggleClass(edgeElement, "automation-edge-data-flow", hasDataFlow);
    toggleClass(edgeElement, "automation-edge-data-flow-true", hasDataFlow && valueIsTrue);
    toggleClass(edgeElement, "automation-edge-data-flow-false", hasDataFlow && !valueIsTrue);
  }
}

function useAutomationEdgeDataFlow(opened: boolean): void {
  useEffect(() => {
    if (!opened) {
      return undefined;
    }

    let timeoutId: number | undefined;
    let observer: MutationObserver | undefined;

    const scheduleSync = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        const root = document.querySelector(".react-flow");
        if (!root) {
          return;
        }

        syncAutomationEdgeDataFlow(root);

        observer?.disconnect();
        observer = new MutationObserver(() => scheduleSync());
        observer.observe(root, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      }, 40);
    };

    scheduleSync();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      observer?.disconnect();
    };
  }, [opened]);
}

export default function AutomationFlowDialog({ opened, onClose }: AutomationFlowDialogProps) {
  useAutomationEdgeDataFlow(opened);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="calc(100vw - 32px)"
      radius="md"
      padding="md"
      title={
        <Group gap="sm" align="flex-start">
          <IconCpu size={28} />

          <Box>
            <Group gap="xs" align="center">
              <Title order={4}>Vasútmodell automatizálás</Title>
              <Badge color="orange" variant="light">
                React Flow MVP
              </Badge>
            </Group>

            <Text size="xs" c="dimmed">
              Node-RED jellegű grafikus logikai szerkesztő vasútmodell automatizáláshoz.
            </Text>
          </Box>
        </Group>
      }
      styles={{
        content: {
          height: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        header: {
          flex: "0 0 auto",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          paddingBottom: 12,
          marginBottom: 12,
        },
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          paddingTop: 0,
          overflow: "hidden",
        },
      }}
    >
      <Box style={{ flex: 1, minHeight: 0, height: "100%", display: "flex" }}>
        <AutomationFlowEditor />
      </Box>
    </Modal>
  );
}

import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import {
  Badge,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import type {
  Node,
  NodeProps,
  NodeTypes,
} from "@xyflow/react";
import { useTranslation } from "react-i18next";

import type {
  AutomationFlowDocumentDto,
  AutomationFlowNodeData,
  AutomationSignalAspect,
} from "../../../../../common/src/automationFlow";

import {
  loadAutomationFlowWs,
  saveAutomationFlowWs,
} from "../../../api/automationFlowWsApi";
import {
  wsApi,
} from "../../../services/wsApi";

import FunctionScriptEditorDialog from "../FunctionScriptEditorDialog";
import {
  AutomationNodeCard,
} from "./AutomationNodeCard";
import {
  DEFAULT_FUNCTION_SCRIPT,
} from "./automationNodeDefinitions";

type AutomationNode = Node<AutomationFlowNodeData, "automationNode">;

type AutomationTypedNodeProps = NodeProps<AutomationNode>;

function getLogicalTurnoutLabel(closed: boolean | undefined): "closed" | "thrown" {
  return closed === false ? "thrown" : "closed";
}

function getOutputActive(data: AutomationFlowNodeData): boolean {
  return data.active === true;
}

function getOutputValid(data: AutomationFlowNodeData): boolean {
  return data.outputValid === true;
}

function getSingleOutputBadge(data: AutomationFlowNodeData, label?: string) {
  return [
    {
      id: "out",
      ...(label !== undefined ? { label } : {}),
      active: getOutputActive(data),
      valid: getOutputValid(data),
      top: "50%",
    },
  ];
}

function getPayloadPreview(payload: unknown): string {
  if (payload === undefined) {
    return "undefined";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function getFunctionScript(data: AutomationFlowNodeData): string {
  if (typeof data.functionScript === "string") {
    return data.functionScript;
  }

  if (typeof data.description === "string" && data.description.includes("return")) {
    return data.description;
  }

  return DEFAULT_FUNCTION_SCRIPT;
}

function getResolvedSignalAspect(data: AutomationFlowNodeData): AutomationSignalAspect {
  const value = data.resolvedSignalAspect;

  if (value === "green" || value === "yellow" || value === "white" || value === "red") {
    return value;
  }

  if (data.signalAspect === "green" || data.signalAspect === "yellow" || data.signalAspect === "white" || data.signalAspect === "red") {
    return data.signalAspect;
  }

  return "red";
}

function getActualLogicalTurnoutClosed(data: AutomationFlowNodeData): boolean {
  const expectedLogicalClosed = data.turnoutClosed ?? true;

  if (data.outputValid !== true) {
    return expectedLogicalClosed;
  }

  return data.active === true
    ? expectedLogicalClosed
    : !expectedLogicalClosed;
}

function getPhysicalTurnoutClosed(logicalClosed: boolean, turnoutClosedValue: boolean | undefined): boolean {
  const physicalClosedForLogicalClosed = turnoutClosedValue ?? true;
  return logicalClosed ? physicalClosedForLogicalClosed : !physicalClosedForLogicalClosed;
}

function getBooleanBadgeColor(valid: boolean, value: boolean): "green" | "red" | "gray" {
  if (!valid) {
    return "gray";
  }

  return value ? "green" : "red";
}

function stopNodeButtonEvent(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function useAutomationSelectedKindMarker(kind: string, selected: boolean): void {
  useEffect(() => {
    if (!selected) {
      return;
    }

    document.body.dataset.automationSelectedNodeKind = kind;

    return () => {
      if (document.body.dataset.automationSelectedNodeKind === kind) {
        delete document.body.dataset.automationSelectedNodeKind;
      }
    };
  }, [kind, selected]);
}

async function saveFunctionScriptToDocument(
  nodeId: string,
  script: string
): Promise<void> {
  const document = await loadAutomationFlowWs();
  let found = false;

  const nextDocument: AutomationFlowDocumentDto = {
    ...document,
    nodes: document.nodes.map(node => {
      if (node.id !== nodeId) {
        return node;
      }

      found = true;
      return {
        ...node,
        data: {
          ...node.data,
          functionScript: script,
        },
      };
    }),
  };

  if (!found) {
    throw new Error("Function node is not saved on the server yet. Save the automation flow first, then edit the script.");
  }

  await saveAutomationFlowWs(nextDocument);
}

function BlockOccupiedNode({ data, selected }: AutomationTypedNodeProps) {
  return <AutomationNodeCard data={data} selected={selected} kind="blockOccupied" />;
}

function SensorNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="sensor"
      detail={typeof data.sensorAddress === "number"
        ? (
            <Text size="xs" c="dimmed">
              {t("automation.graph.sensorAddress", { address: data.sensorAddress })}
            </Text>
          )
        : null}
    />
  );
}

function TurnoutNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();
  const actualLogicalClosed = getActualLogicalTurnoutClosed(data);
  const actualState = getLogicalTurnoutLabel(actualLogicalClosed);
  const nextLogicalClosed = !actualLogicalClosed;
  const nextState = getLogicalTurnoutLabel(nextLogicalClosed);
  const canToggle = typeof data.turnoutAddress === "number" && data.turnoutAddress > 0;
  const valid = data.outputValid === true;
  const active = data.active === true;

  useAutomationSelectedKindMarker("turnout", selected);

  const handleToggleTurnout = (event: MouseEvent): void => {
    stopNodeButtonEvent(event);

    if (!canToggle) {
      return;
    }

    wsApi.setTurnout(
      data.turnoutAddress as number,
      getPhysicalTurnoutClosed(nextLogicalClosed, data.turnoutClosedValue)
    );
  };

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="turnout"
      showIoKey={false}
      outputBadges={getSingleOutputBadge(data)}
      detail={typeof data.turnoutAddress === "number"
        ? (
            <Group
              className="nodrag nopan"
              gap={6}
              wrap="nowrap"
              onPointerDown={stopNodeButtonEvent}
              onPointerUp={stopNodeButtonEvent}
              onMouseDown={stopNodeButtonEvent}
              onMouseUp={stopNodeButtonEvent}
              onDoubleClick={stopNodeButtonEvent}
              style={{ marginTop: 10, overflow: "visible" }}
            >
              <Badge
                className="nodrag nopan"
                color={getBooleanBadgeColor(valid, active)}
                variant={valid ? "filled" : "light"}
                size="xs"
                style={{ flexShrink: 0 }}
              >
                actual: {t(`automation.graph.${actualState}`)}
              </Badge>
              <Button
                className="nodrag nopan"
                size="compact-xs"
                variant="light"
                disabled={!canToggle}
                onPointerDown={stopNodeButtonEvent}
                onPointerUp={stopNodeButtonEvent}
                onMouseDown={stopNodeButtonEvent}
                onMouseUp={stopNodeButtonEvent}
                onDoubleClick={stopNodeButtonEvent}
                onClick={handleToggleTurnout}
                style={{ flexShrink: 0 }}
              >
                → {t(`automation.graph.${nextState}`)}
              </Button>
            </Group>
          )
        : null}
    />
  );
}

function ButtonNode({ data, selected }: AutomationTypedNodeProps) {
  return <AutomationNodeCard data={data} selected={selected} kind="button" />;
}

function AndNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="and"
      outputBadges={getSingleOutputBadge(data)}
    />
  );
}

function OrNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="or"
      outputBadges={getSingleOutputBadge(data)}
    />
  );
}

function NotNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="not"
      outputBadges={getSingleOutputBadge(data)}
    />
  );
}

function FilterNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();
  const filterValue = data.filterValue ?? true;

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="filter"
      outputBadges={getSingleOutputBadge(data)}
      detail={(
        <Text size="xs" c="dimmed">
          {t("automation.graph.filterValue", { value: String(filterValue) })}
        </Text>
      )}
    />
  );
}

function IfThenElseNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();
  const conditionActive = data.active === true;
  const conditionValid = data.outputValid === true;

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="ifThenElse"
      targetHandles={[{ id: "if", top: "50%" }]}
      sourceHandles={[
        { id: "then", top: "35%" },
        { id: "else", top: "65%" },
      ]}
      outputBadges={[
        {
          id: "then",
          label: "THEN",
          active: conditionActive,
          valid: conditionValid,
          top: "35%",
        },
        {
          id: "else",
          label: "ELSE",
          active: conditionValid && !conditionActive,
          valid: conditionValid,
          top: "65%",
        },
      ]}
      detail={(
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {t("automation.graph.ifInput")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("automation.graph.thenOutput")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("automation.graph.elseOutput")}
          </Text>
        </Stack>
      )}
    />
  );
}

function TimerNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="timer"
      outputBadges={getSingleOutputBadge(data)}
      detail={(
        <Text size="xs" c="dimmed">
          {t("automation.fields.delayMs")}: <b>{data.delayMs ?? 0}</b>
        </Text>
      )}
    />
  );
}

function LatchNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="latch"
      outputBadges={getSingleOutputBadge(data)}
    />
  );
}

function RouteLockNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="routeLock"
      outputBadges={getSingleOutputBadge(data)}
    />
  );
}

function FunctionNode({ id, data, selected }: AutomationTypedNodeProps) {
  const [scriptEditorOpened, setScriptEditorOpened] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const script = getFunctionScript(data);

  const handleSaveFunctionScript = async (value: string): Promise<void> => {
    try {
      setScriptError(null);
      await saveFunctionScriptToDocument(id, value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setScriptError(message);
      throw error;
    }
  };

  return (
    <>
      <AutomationNodeCard
        data={data}
        selected={selected}
        kind="function"
        outputBadges={getSingleOutputBadge(data, "payload")}
        detail={(
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              return → payload
            </Text>
            {data.outputValid === true && (
              <Text size="xs" c="dimmed" truncate>
                payload: {getPayloadPreview(data.payload)}
              </Text>
            )}
            {scriptError && (
              <Text size="xs" c="red">
                {scriptError}
              </Text>
            )}
            <Button
              className="nodrag nopan"
              size="compact-xs"
              variant="light"
              onPointerDown={stopNodeButtonEvent}
              onPointerUp={stopNodeButtonEvent}
              onMouseDown={stopNodeButtonEvent}
              onMouseUp={stopNodeButtonEvent}
              onDoubleClick={stopNodeButtonEvent}
              onClick={(event) => {
                stopNodeButtonEvent(event);
                setScriptEditorOpened(true);
              }}
              style={{ marginTop: 10 }}
            >
              Edit script
            </Button>
          </Stack>
        )}
      />
      <FunctionScriptEditorDialog
        opened={scriptEditorOpened}
        title={`${data.label} function script`}
        value={script}
        onSave={handleSaveFunctionScript}
        onClose={() => setScriptEditorOpened(false)}
      />
    </>
  );
}

function SignalNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();
  const aspect = getResolvedSignalAspect(data);

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="signal"
      targetHandles={[
        { id: "green", top: "30%" },
        { id: "yellow", top: "50%" },
        { id: "white", top: "70%" },
      ]}
      detail={typeof data.signalAddress === "number"
        ? (
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                {t("automation.graph.signalMain", {
                  address: data.signalAddress,
                  aspect: t(`automation.aspects.${aspect}`),
                })}
              </Text>
              <Text size="xs" c="dimmed">
                {t("automation.graph.signalBits", {
                  length: data.signalAddressLength ?? 1,
                  bits: getSignalAspectValue(data, aspect),
                })}
              </Text>
              <Text size="xs" c="dimmed">
                {t("automation.graph.signalInputRule")}
              </Text>
            </Stack>
          )
        : null}
    />
  );
}

function getSignalAspectValue(data: AutomationFlowNodeData, aspect: AutomationSignalAspect): number {
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

function TurnoutCommandNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();
  const targetState = getLogicalTurnoutLabel(data.turnoutClosed);

  useAutomationSelectedKindMarker("turnoutCommand", selected);

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="turnoutCommand"
      showIoKey={false}
      detail={typeof data.turnoutAddress === "number"
        ? (
            <Text size="xs" c="dimmed">
              #{data.turnoutAddress} → {t(`automation.graph.${targetState}`)}
            </Text>
          )
        : null}
    />
  );
}

function OutputNode({ data, selected }: AutomationTypedNodeProps) {
  const { t } = useTranslation();

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="output"
      detail={data.outputCommand
        ? (
            <Text size="xs" c="dimmed">
              {t("automation.graph.outputCommand", { command: data.outputCommand })}
            </Text>
          )
        : null}
    />
  );
}

export function AutomationGraphNode(props: AutomationTypedNodeProps) {
  switch (props.data.kind) {
    case "blockOccupied":
      return <BlockOccupiedNode {...props} />;
    case "sensor":
      return <SensorNode {...props} />;
    case "turnout":
      return <TurnoutNode {...props} />;
    case "button":
      return <ButtonNode {...props} />;
    case "and":
      return <AndNode {...props} />;
    case "or":
      return <OrNode {...props} />;
    case "not":
      return <NotNode {...props} />;
    case "filter":
      return <FilterNode {...props} />;
    case "ifThenElse":
      return <IfThenElseNode {...props} />;
    case "timer":
      return <TimerNode {...props} />;
    case "latch":
      return <LatchNode {...props} />;
    case "routeLock":
      return <RouteLockNode {...props} />;
    case "function":
      return <FunctionNode {...props} />;
    case "signal":
      return <SignalNode {...props} />;
    case "turnoutCommand":
      return <TurnoutCommandNode {...props} />;
    case "output":
      return <OutputNode {...props} />;
    default:
      return <OutputNode {...props} />;
  }
}

export const automationNodeTypes: NodeTypes = {
  automationNode: AutomationGraphNode as never,
};
import {
  Stack,
  Text,
} from "@mantine/core";
import type {
  Node,
  NodeProps,
  NodeTypes,
} from "@xyflow/react";

import type {
  AutomationFlowNodeData,
} from "../../../../../common/src/automationFlow";

import {
  AutomationNodeCard,
} from "./AutomationNodeCard";

type AutomationNode = Node<AutomationFlowNodeData, "automationNode">;

type AutomationTypedNodeProps = NodeProps<AutomationNode>;

function getLogicalTurnoutLabel(closed: boolean | undefined): string {
  return closed === false ? "thrown" : "closed";
}

function getPhysicalClosedLabel(closedValue: boolean | undefined): string {
  return closedValue === false ? "physical false" : "physical true";
}

function getOutputActive(data: AutomationFlowNodeData): boolean {
  return data.active === true;
}

function getSingleOutputBadge(data: AutomationFlowNodeData, label = "OUT") {
  return [
    {
      id: "out",
      label,
      active: getOutputActive(data),
      top: "50%",
    },
  ];
}

function BlockOccupiedNode({ data, selected }: AutomationTypedNodeProps) {
  return <AutomationNodeCard data={data} selected={selected} kind="blockOccupied" />;
}

function SensorNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="sensor"
      detail={typeof data.sensorAddress === "number"
        ? (
            <Text size="xs" c="dimmed">
              cím: <b>{data.sensorAddress}</b>
            </Text>
          )
        : null}
    />
  );
}

function TurnoutNode({ data, selected }: AutomationTypedNodeProps) {
  const expectedState = getLogicalTurnoutLabel(data.turnoutClosed);
  const closedValueLabel = getPhysicalClosedLabel(data.turnoutClosedValue);

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="turnout"
      detail={typeof data.turnoutAddress === "number"
        ? (
            <Text size="xs" c="dimmed">
              T{data.turnoutAddress}: <b>{expectedState}</b> · closed = {closedValueLabel}
            </Text>
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

function IfThenElseNode({ data, selected }: AutomationTypedNodeProps) {
  const conditionActive = data.active === true;

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
          top: "35%",
        },
        {
          id: "else",
          label: "ELSE",
          active: !conditionActive,
          top: "65%",
        },
      ]}
      detail={(
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            <b>IF</b> bemenet: feltétel
          </Text>
          <Text size="xs" c="dimmed">
            <b>THEN</b> kimenet: ha igaz
          </Text>
          <Text size="xs" c="dimmed">
            <b>ELSE</b> kimenet: ha hamis
          </Text>
        </Stack>
      )}
    />
  );
}

function TimerNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="timer"
      outputBadges={getSingleOutputBadge(data)}
      detail={(
        <Text size="xs" c="dimmed">
          késleltetés: <b>{data.delayMs ?? 0} ms</b>
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

function SignalNode({ data, selected }: AutomationTypedNodeProps) {
  const aspect = data.signalAspect ?? "yellow";

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="signal"
      detail={typeof data.signalAddress === "number"
        ? (
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                S{data.signalAddress}: <b>{aspect}</b>
              </Text>
              <Text size="xs" c="dimmed">
                hossz: {data.signalAddressLength ?? 1} · bit: {getSignalAspectValue(data)}
              </Text>
            </Stack>
          )
        : null}
    />
  );
}

function getSignalAspectValue(data: AutomationFlowNodeData): number {
  switch (data.signalAspect ?? "yellow") {
    case "red":
      return data.signalValueRed ?? 0;
    case "green":
      return data.signalValueGreen ?? 0;
    case "white":
      return data.signalValueWhite ?? 0;
    case "yellow":
    default:
      return data.signalValueYellow ?? 0;
  }
}

function TurnoutCommandNode({ data, selected }: AutomationTypedNodeProps) {
  const targetState = getLogicalTurnoutLabel(data.turnoutClosed);
  const closedValueLabel = getPhysicalClosedLabel(data.turnoutClosedValue);

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="turnoutCommand"
      detail={typeof data.turnoutAddress === "number"
        ? (
            <Text size="xs" c="dimmed">
              állítás: <b>T{data.turnoutAddress} {targetState}</b> · closed = {closedValueLabel}
            </Text>
          )
        : null}
    />
  );
}

function OutputNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="output"
      detail={data.outputCommand
        ? (
            <Text size="xs" c="dimmed">
              parancs: <b>{data.outputCommand}</b>
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
    case "ifThenElse":
      return <IfThenElseNode {...props} />;
    case "timer":
      return <TimerNode {...props} />;
    case "latch":
      return <LatchNode {...props} />;
    case "routeLock":
      return <RouteLockNode {...props} />;
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

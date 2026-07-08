import {
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
  const expectedState = data.turnoutClosed === true
    ? "closed"
    : "thrown";

  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="turnout"
      detail={typeof data.turnoutAddress === "number"
        ? (
            <Text size="xs" c="dimmed">
              T{data.turnoutAddress}: <b>{expectedState}</b>
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
  return <AutomationNodeCard data={data} selected={selected} kind="and" />;
}

function OrNode({ data, selected }: AutomationTypedNodeProps) {
  return <AutomationNodeCard data={data} selected={selected} kind="or" />;
}

function NotNode({ data, selected }: AutomationTypedNodeProps) {
  return <AutomationNodeCard data={data} selected={selected} kind="not" />;
}

function IfThenElseNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="ifThenElse"
      detail={(
        <Text size="xs" c="dimmed">
          1: IF · 2: THEN · 3: ELSE
        </Text>
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
      detail={(
        <Text size="xs" c="dimmed">
          késleltetés: <b>{data.delayMs ?? 0} ms</b>
        </Text>
      )}
    />
  );
}

function LatchNode({ data, selected }: AutomationTypedNodeProps) {
  return <AutomationNodeCard data={data} selected={selected} kind="latch" />;
}

function RouteLockNode({ data, selected }: AutomationTypedNodeProps) {
  return <AutomationNodeCard data={data} selected={selected} kind="routeLock" />;
}

function SignalNode({ data, selected }: AutomationTypedNodeProps) {
  return (
    <AutomationNodeCard
      data={data}
      selected={selected}
      kind="signal"
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
    case "output":
      return <OutputNode {...props} />;
    default:
      return <OutputNode {...props} />;
  }
}

export const automationNodeTypes: NodeTypes = {
  automationNode: AutomationGraphNode as never,
};

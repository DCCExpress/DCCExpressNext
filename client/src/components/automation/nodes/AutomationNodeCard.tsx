import type {
  ReactNode,
} from "react";

import {
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import {
  Handle,
  Position,
} from "@xyflow/react";

import type {
  AutomationFlowNodeData,
  AutomationFlowNodeKind,
} from "../../../../../common/src/automationFlow";

import {
  hasSourceHandle,
  hasTargetHandle,
  NODE_DEFINITIONS,
} from "./automationNodeDefinitions";

type AutomationNodeHandle = {
  id?: string;
  top?: string | number;
};

type AutomationNodeCardProps = {
  data: AutomationFlowNodeData;
  selected: boolean;
  kind: AutomationFlowNodeKind;
  detail?: ReactNode;
  targetHandles?: AutomationNodeHandle[];
  sourceHandles?: AutomationNodeHandle[];
};

function renderHandles(
  type: "source" | "target",
  position: Position,
  handles: AutomationNodeHandle[]
) {
  return handles.map((handle, index) => (
    <Handle
      key={handle.id ?? `${type}-${index}`}
      {...(handle.id ? { id: handle.id } : {})}
      type={type}
      position={position}
      style={{
        width: 10,
        height: 10,
        ...(handle.top !== undefined
          ? {
              top: handle.top,
              transform: "translateY(-50%)",
            }
          : {}),
      }}
    />
  ));
}

export function AutomationNodeCard({
  data,
  selected,
  kind,
  detail,
  targetHandles,
  sourceHandles,
}: AutomationNodeCardProps) {
  const definition = NODE_DEFINITIONS[kind];
  const active = data.active === true;
  const resolvedTargetHandles = targetHandles ?? (hasTargetHandle(kind) ? [{}] : []);
  const resolvedSourceHandles = sourceHandles ?? (hasSourceHandle(kind) ? [{}] : []);

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      shadow={selected ? "md" : "xs"}
      style={{
        minWidth: 190,
        borderColor: active
          ? "var(--mantine-color-green-5)"
          : selected
            ? "var(--mantine-color-blue-5)"
            : "var(--mantine-color-gray-4)",
        boxShadow: active
          ? "0 0 0 2px rgba(64, 192, 87, 0.22), 0 14px 34px rgba(0, 0, 0, 0.18)"
          : undefined,
        background: active
          ? "linear-gradient(180deg, rgba(47, 158, 68, 0.14), rgba(20, 120, 60, 0.06))"
          : "var(--mantine-color-body)",
        position: "relative",
      }}
    >
      {renderHandles("target", Position.Left, resolvedTargetHandles)}

      <Stack gap={6}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text fw={900} size="lg" lh={1}>
              {definition.icon}
            </Text>
            <Box>
              <Text fw={800} size="sm" lh={1.15}>
                {data.label}
              </Text>
              <Text size="xs" c="dimmed" lh={1.15}>
                {definition.title}
              </Text>
            </Box>
          </Group>

          {active && (
            <Badge color="green" variant="filled" size="xs">
              ON
            </Badge>
          )}
        </Group>

        {data.ioKey && (
          <Badge variant="light" color="gray" size="xs" w="fit-content">
            {data.ioKey}
          </Badge>
        )}

        {detail}
      </Stack>

      {renderHandles("source", Position.Right, resolvedSourceHandles)}
    </Paper>
  );
}

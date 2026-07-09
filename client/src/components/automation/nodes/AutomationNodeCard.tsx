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
import { useTranslation } from "react-i18next";

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

type AutomationNodeOutputBadge = {
  id?: string;
  label?: string;
  active: boolean;
  valid?: boolean;
  top?: string | number;
};

type AutomationNodeCardProps = {
  data: AutomationFlowNodeData;
  selected: boolean;
  kind: AutomationFlowNodeKind;
  detail?: ReactNode;
  targetHandles?: AutomationNodeHandle[];
  sourceHandles?: AutomationNodeHandle[];
  outputBadges?: AutomationNodeOutputBadge[];
  showIoKey?: boolean;
};

function getHandleHorizontalStyle(position: Position) {
  if (position === Position.Left) {
    return {
      left: 0,
      transform: "translate(-50%, -50%)",
    };
  }

  if (position === Position.Right) {
    return {
      right: 0,
      transform: "translate(50%, -50%)",
    };
  }

  return {
    transform: "translate(-50%, -50%)",
  };
}

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
        top: handle.top ?? "50%",
        zIndex: 4,
        ...getHandleHorizontalStyle(position),
      }}
    />
  ));
}

function renderOutputBadges(
  badges: AutomationNodeOutputBadge[],
  t: (key: string) => string
) {
  return badges.map((badge, index) => {
    const valid = badge.valid ?? true;
    const valueText = valid
      ? badge.active
        ? t("automation.badge.true")
        : t("automation.badge.false")
      : t("automation.badge.noData");
    const label = badge.label?.trim();
    const color = valid ? (badge.active ? "green" : "red") : "gray";
    const variant = valid ? "filled" : "light";

    return (
      <Badge
        key={badge.id ?? label ?? index}
        color={color}
        variant={variant}
        size="xs"
        data-automation-output-badge="true"
        style={{
          position: "absolute",
          right: 12,
          top: badge.top ?? "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          zIndex: 3,
          boxShadow: valid
            ? badge.active
              ? "0 0 0 2px rgba(64, 192, 87, 0.18), 0 8px 18px rgba(0, 0, 0, 0.2)"
              : "0 0 0 2px rgba(250, 82, 82, 0.16), 0 8px 18px rgba(0, 0, 0, 0.16)"
            : undefined,
        }}
      >
        {label ? `${label} ${valueText}` : valueText}
      </Badge>
    );
  });
}

export function AutomationNodeCard({
  data,
  selected,
  kind,
  detail,
  targetHandles,
  sourceHandles,
  outputBadges,
  showIoKey = true,
}: AutomationNodeCardProps) {
  const { t } = useTranslation();
  const definition = NODE_DEFINITIONS[kind];
  const active = data.active === true;
  const outputValid = data.outputValid === true;
  const resolvedTargetHandles = targetHandles ?? (hasTargetHandle(kind) ? [{}] : []);
  const resolvedSourceHandles = sourceHandles ?? (hasSourceHandle(kind) ? [{}] : []);
  const resolvedOutputBadges = outputBadges ?? [];

  const borderColor = selected
    ? "var(--mantine-color-blue-6)"
    : active
      ? "var(--mantine-color-green-5)"
      : outputValid
        ? "var(--mantine-color-red-5)"
        : "var(--mantine-color-gray-4)";

  const boxShadow = selected
    ? active
      ? "0 0 0 3px rgba(34, 139, 230, 0.48), 0 0 0 6px rgba(64, 192, 87, 0.22), 0 18px 42px rgba(0, 0, 0, 0.26)"
      : outputValid
        ? "0 0 0 3px rgba(34, 139, 230, 0.44), 0 0 0 6px rgba(250, 82, 82, 0.18), 0 14px 34px rgba(0, 0, 0, 0.2)"
        : "0 0 0 3px rgba(34, 139, 230, 0.44), 0 14px 34px rgba(0, 0, 0, 0.2)"
    : active
      ? "0 0 0 2px rgba(64, 192, 87, 0.22), 0 14px 34px rgba(0, 0, 0, 0.18)"
      : outputValid
        ? "0 0 0 2px rgba(250, 82, 82, 0.16), 0 12px 28px rgba(0, 0, 0, 0.14)"
        : undefined;

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      shadow={selected ? "md" : "xs"}
      data-automation-node-kind={kind}
      data-automation-output-valid={outputValid ? "true" : "false"}
      data-automation-output-value={active ? "true" : "false"}
      style={{
        minWidth: 190,
        borderColor,
        borderWidth: selected ? 3 : active ? 2 : outputValid ? 2 : 1,
        boxShadow,
        background: active
          ? "linear-gradient(180deg, rgba(47, 158, 68, 0.14), rgba(20, 120, 60, 0.06))"
          : outputValid
            ? "linear-gradient(180deg, rgba(250, 82, 82, 0.1), rgba(250, 82, 82, 0.04))"
            : "var(--mantine-color-body)",
        position: "relative",
        zIndex: selected ? 2 : undefined,
      }}
    >
      {renderHandles("target", Position.Left, resolvedTargetHandles)}

      <Stack gap={6} pr={resolvedOutputBadges.length > 0 ? 82 : 0}>
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
                {t(`automation.nodes.${kind}.title`, { defaultValue: definition.title })}
              </Text>
            </Box>
          </Group>

          {active && resolvedOutputBadges.length === 0 && (
            <Badge color="green" variant="filled" size="xs">
              {t("automation.badge.on")}
            </Badge>
          )}
        </Group>

        {showIoKey && data.ioKey && (
          <Badge variant="light" color="gray" size="xs" w="fit-content">
            {data.ioKey}
          </Badge>
        )}

        {detail}
      </Stack>

      {renderOutputBadges(resolvedOutputBadges, t)}
      {renderHandles("source", Position.Right, resolvedSourceHandles)}
    </Paper>
  );
}

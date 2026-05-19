// client/src/components/common/InfoRows.tsx

import type {
  ReactNode,
} from "react";

import {
  Group,
  Stack,
  Text,
} from "@mantine/core";

import StatusBadge from "./StatusBadge";

export type InfoSectionProps = {
  title: string;
  children: ReactNode;
};

export function InfoSection({
  title,
  children,
}: InfoSectionProps) {
  return (
    <Stack gap={4}>
      <Text
        size="xs"
        fw={700}
        c="dimmed"
      >
        {title}
      </Text>

      <Stack gap={2}>
        {children}
      </Stack>
    </Stack>
  );
}

export type InfoValueRowProps = {
  label: string;
  value: string | number;
  valueColor?: string | undefined;
};

export function InfoValueRow({
  label,
  value,
  valueColor,
}: InfoValueRowProps) {
  return (
    <Group
      justify="space-between"
      gap="xs"
      wrap="nowrap"
    >
      <Text
        size="xs"
        c="dimmed"
      >
        {label}
      </Text>

      <Text
        size="xs"
        fw={600}
        ta="right"
        {...(
          valueColor !== undefined
            ? { c: valueColor }
            : {}
        )}
      >
        {value}
      </Text>
    </Group>
  );
}

export type InfoFlagRowProps = {
  label: string;
  value: boolean | undefined;
};

export function InfoFlagRow({
  label,
  value,
}: InfoFlagRowProps) {
  return (
    <Group
      justify="space-between"
      gap="xs"
      wrap="nowrap"
    >
      <Text
        size="xs"
        c="dimmed"
      >
        {label}
      </Text>

      <StatusBadge
        color={value ? "green" : "gray"}
        variant="light"
      >
        {value === undefined
          ? "-"
          : value
            ? "YES"
            : "NO"}
      </StatusBadge>
    </Group>
  );
}

// client/src/components/common/CollapsibleCardHeader.tsx

import type {
  ReactNode,
} from "react";

import {
  ActionIcon,
  Group,
  Text,
  Tooltip,
} from "@mantine/core";

import {
  IconChevronDown,
} from "@tabler/icons-react";

type CollapsibleCardHeaderProps = {
  title: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  expandTooltip: string;
  collapseTooltip: string;
  rightSection?: ReactNode;
};

export default function CollapsibleCardHeader({
  title,
  collapsed,
  onToggle,
  expandTooltip,
  collapseTooltip,
  rightSection,
}: CollapsibleCardHeaderProps) {
  return (
    <Group
      justify="space-between"
      align="center"
      wrap="nowrap"
    >
      {typeof title === "string" ? (
        <Text
          size="sm"
          fw={700}
        >
          {title}
        </Text>
      ) : (
        title
      )}

      <Group
        gap="xs"
        wrap="nowrap"
      >
        {rightSection}

        <Tooltip
          label={
            collapsed
              ? expandTooltip
              : collapseTooltip
          }
        >
          <ActionIcon
            size="sm"
            variant="light"
            color="gray"
            onClick={onToggle}
          >
            <IconChevronDown
              size={16}
              style={{
                transform: collapsed
                  ? "rotate(-90deg)"
                  : "rotate(0deg)",
                transition: "transform 150ms ease",
              }}
            />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

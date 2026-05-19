// client/src/components/common/CollapsiblePanelCard.tsx

import type {
  ReactNode,
} from "react";

import {
  Card,
  Collapse,
  Divider,
  Stack,
} from "@mantine/core";

import {
  usePersistentCollapsedState,
} from "../../hooks/usePersistentCollapsedState";

import CollapsibleCardHeader from "./CollapsibleCardHeader";

export type CollapsiblePanelCardProps = {
  title: ReactNode;
  collapsedStorageKey: string;
  expandTooltip: string;
  collapseTooltip: string;
  rightSection?: ReactNode;
  children: ReactNode;
  bodyGap?: string | number;
  cardPadding?: string | number;
};

export default function CollapsiblePanelCard({
  title,
  collapsedStorageKey,
  expandTooltip,
  collapseTooltip,
  rightSection,
  children,
  bodyGap = "sm",
  cardPadding = "sm",
}: CollapsiblePanelCardProps) {
  const {
    collapsed,
    toggleCollapsed,
  } =
    usePersistentCollapsedState(
      collapsedStorageKey
    );

  return (
    <Card
      withBorder
      radius="md"
      p={cardPadding}
    >
      <Stack gap="sm">
        <CollapsibleCardHeader
          title={title}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          expandTooltip={expandTooltip}
          collapseTooltip={collapseTooltip}
          {...(
            rightSection !== undefined
              ? { rightSection }
              : {}
          )}
        />

        <Collapse expanded={!collapsed}>
          <Stack gap={bodyGap}>
            <Divider />
            {children}
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

// client/src/components/tasks/task-manager/TaskRouteBadges.tsx

import {
  Badge,
  Group,
  Text,
} from "@mantine/core";

import type {
  BlockRouteSolution,
} from "../../../../../common/src/railway/graph";
import { useTranslation } from "react-i18next";

type TurnoutRequirementBadgesProps = {
  turnoutStates: {
    address: number;
    closed: boolean;
  }[];
};

export function TurnoutRequirementBadges({
  turnoutStates,
}: TurnoutRequirementBadgesProps) {
  const { t } = useTranslation();

  if (turnoutStates.length === 0) {
    return (
      <Text
        size="sm"
        c="dimmed"
      >
        —
      </Text>
    );
  }

  return (
    <Group
      gap="xs"
      wrap="wrap"
    >
      {turnoutStates.map((turnoutState, index) => (
        <Badge
          key={`turnout-${turnoutState.address}-${turnoutState.closed}-${index}`}
          color="orange"
          variant="light"
          styles={{
            label: {
              display: "flex",
              alignItems: "center",
              gap: 6,
            },
          }}
        >
          <span>{t("graph.items.turnout")} {turnoutState.address}</span>

          <Badge
            size="xs"
            color="dark"
            variant="filled"
            radius="sm"
          >
            {turnoutState.closed ? t("turnout.closed") : t("turnout.thrown")}
          </Badge>
        </Badge>
      ))}
    </Group>
  );
}

type BlockRoutePathProps = {
  solution: BlockRouteSolution;
  badgeSize?: "sm" | "md" | "lg";
};

export function BlockRoutePath({
  solution,
  badgeSize = "sm",
}: BlockRoutePathProps) {
  if (solution.path.length === 0) {
    return null;
  }

  return (
    <Group
      gap="xs"
      wrap="wrap"
    >
      {solution.path.map((item, index) => (
        <Group
          key={`task-route-path-${item.type}-${index}`}
          gap="xs"
          wrap="nowrap"
        >
          {item.type === "block" ? (
            <Badge
              size={badgeSize}
              color="violet"
              variant="filled"
              styles={{
                label: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                },
              }}
            >
              <span>{item.block.name}</span>

              <Badge
                size="xs"
                color="gray"
                variant="filled"
                radius="sm"
              >
                {item.node.name}
              </Badge>
            </Badge>
          ) : (
            <Badge
              size={badgeSize}
              color="gray"
              variant="light"
            >
              {item.node.name}
            </Badge>
          )}

          {index < solution.path.length - 1 && (
            <Text fw={700}>→</Text>
          )}
        </Group>
      ))}
    </Group>
  );
}

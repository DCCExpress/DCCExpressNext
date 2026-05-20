// client/src/components/tasks/task-manager/TaskTablePanel.tsx

import {
  Badge,
  Card,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

import {
  getTaskStatusColor,
  getTaskStatusLabel,
} from "../taskUiHelpers";

import {
  BlockRoutePath,
  TurnoutRequirementBadges,
} from "./TaskRouteBadges";

import TaskProgressBadge from "./TaskProgressBadge";
import TaskActionIcons, {
  type RunTaskAction,
} from "./TaskActionIcons";
import { useTranslation } from "react-i18next";

type TaskTablePanelProps = {
  tasks: TrainTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onEditTask: (task: TrainTask) => void;
  onDeleteTask: (task: TrainTask) => void;
  onRunTaskAction: RunTaskAction;
};

export default function TaskTablePanel({
  tasks,
  selectedTaskId,
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onRunTaskAction,
}: TaskTablePanelProps) {
  const { t } = useTranslation();
  return (
    <Card
      withBorder
      radius="lg"
      padding="md"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {tasks.length > 0 ? (
        <ScrollArea
          type="auto"
          offsetScrollbars
          style={{
            flex: 1,
            minHeight: 0,
          }}
        >
          <Table
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("task.table.index")}</Table.Th>
                <Table.Th>{t("task.table.task")}</Table.Th>
                <Table.Th>{t("task.table.loco")}</Table.Th>
                <Table.Th>{t("task.table.speed")}</Table.Th>
                <Table.Th>{t("task.table.route")}</Table.Th>
                <Table.Th>{t("task.table.status")}</Table.Th>
                <Table.Th>{t("task.table.progress")}</Table.Th>
                <Table.Th>{t("task.table.turnouts")}</Table.Th>
                <Table.Th>{t("task.table.controls")}</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {tasks.map((task, index) => (
                <Table.Tr
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  style={{
                    cursor: "pointer",
                    background:
                      selectedTaskId === task.id
                        ? "var(--mantine-color-blue-light)"
                        : undefined,
                  }}
                >
                  <Table.Td>{index + 1}</Table.Td>

                  <Table.Td>
                    <Stack gap={2}>
                      <Text fw={600}>{task.name}</Text>

                      <Text
                        size="xs"
                        c="dimmed"
                      >
                        {task.id}
                      </Text>
                    </Stack>
                  </Table.Td>

                  <Table.Td>
                    {task.runtime.loco ? (
                      <Stack gap={2}>
                        <Badge
                          color="indigo"
                          variant="light"
                        >
                          {task.runtime.loco.name}
                        </Badge>

                        <Text
                          size="xs"
                          c="dimmed"
                        >
                          {t("loco.address")} {task.runtime.loco.address}
                        </Text>
                      </Stack>
                    ) : (
                      <Text
                        size="sm"
                        c="dimmed"
                      >
                        —
                      </Text>
                    )}
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      color="cyan"
                      variant="light"
                    >
                      {task.targetSpeed}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <BlockRoutePath
                      solution={task.transition.solution}
                    />
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      color={getTaskStatusColor(task.status)}
                      variant="light"
                    >
                      {getTaskStatusLabel(task.status)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <TaskProgressBadge task={task} />
                  </Table.Td>

                  <Table.Td>
                    <TurnoutRequirementBadges
                      turnoutStates={
                        task.transition.solution.turnoutStates
                      }
                    />
                  </Table.Td>

                  <Table.Td>
                    <TaskActionIcons
                      task={task}
                      onRunTaskAction={onRunTaskAction}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      ) : (
        <Text c="dimmed">
          {t("task.list.emptyNew")}
        </Text>
      )}
    </Card>
  );
}

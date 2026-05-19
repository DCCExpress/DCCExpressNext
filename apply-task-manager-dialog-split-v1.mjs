#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  taskManagerDialog: path.join(
    ROOT,
    "client/src/components/common/TaskManagerDialog.tsx"
  ),
  taskAddDialog: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskAddDialog.tsx"
  ),
  taskEditDialog: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskEditDialog.tsx"
  ),
  taskDeleteDialog: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskDeleteDialog.tsx"
  ),
  taskManagerToolbar: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskManagerToolbar.tsx"
  ),
  taskTablePanel: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskTablePanel.tsx"
  ),
  taskStepsPanel: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskStepsPanel.tsx"
  ),
  taskRouteBadges: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskRouteBadges.tsx"
  ),
  taskProgressBadge: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskProgressBadge.tsx"
  ),
  taskActionIcons: path.join(
    ROOT,
    "client/src/components/tasks/task-manager/TaskActionIcons.tsx"
  ),
};

function fail(message) {
  throw new Error(message);
}

function ensureExisting(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Írva: ${path.relative(ROOT, file)}`);
}

const TASK_ROUTE_BADGES = `// client/src/components/tasks/task-manager/TaskRouteBadges.tsx

import {
  Badge,
  Group,
  Text,
} from "@mantine/core";

import type {
  BlockRouteSolution,
} from "../../../../../common/src/railway/graph";

type TurnoutRequirementBadgesProps = {
  turnoutStates: {
    address: number;
    closed: boolean;
  }[];
};

export function TurnoutRequirementBadges({
  turnoutStates,
}: TurnoutRequirementBadgesProps) {
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
          key={\`turnout-\${turnoutState.address}-\${turnoutState.closed}-\${index}\`}
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
          <span>Turnout {turnoutState.address}</span>

          <Badge
            size="xs"
            color="dark"
            variant="filled"
            radius="sm"
          >
            {turnoutState.closed ? "closed" : "thrown"}
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
          key={\`task-route-path-\${item.type}-\${index}\`}
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
`;

const TASK_PROGRESS_BADGE = `// client/src/components/tasks/task-manager/TaskProgressBadge.tsx

import {
  Badge,
} from "@mantine/core";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

type TaskProgressBadgeProps = {
  task: TrainTask;
};

export default function TaskProgressBadge({
  task,
}: TaskProgressBadgeProps) {
  if (task.status === "completed") {
    return (
      <Badge
        color="blue"
        variant="light"
      >
        Arrived
      </Badge>
    );
  }

  if (task.status === "aborted") {
    return (
      <Badge
        color="red"
        variant="light"
      >
        Aborted
      </Badge>
    );
  }

  if (task.runtime.simulation.phase === "waitingForRoute") {
    return (
      <Badge
        color="yellow"
        variant="light"
      >
        Waiting route
      </Badge>
    );
  }

  if (task.runtime.simulation.phase === "waitingForBlockSensor") {
    const sensorAddress =
      task.runtime.simulation.waitingSensorAddress;

    return (
      <Badge
        color="yellow"
        variant="light"
      >
        {sensorAddress && sensorAddress > 0
          ? \`Waiting sensor #\${sensorAddress}\`
          : "Waiting next block free"}
      </Badge>
    );
  }

  if (task.runtime.inTransit) {
    return (
      <Badge
        color="red"
        variant="light"
      >
        Between blocks
      </Badge>
    );
  }

  if (task.runtime.hasLeftFromBlock) {
    return (
      <Badge
        color="orange"
        variant="light"
      >
        Left start block
      </Badge>
    );
  }

  return (
    <Badge
      color="gray"
      variant="light"
    >
      Waiting
    </Badge>
  );
}
`;

const TASK_ACTION_ICONS = `// client/src/components/tasks/task-manager/TaskActionIcons.tsx

import {
  ActionIcon,
  Group,
  Tooltip,
} from "@mantine/core";

import {
  IconCheck,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconTrash,
} from "@tabler/icons-react";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

import {
  taskManager,
} from "../../../services/tasks/taskManagerSingleton";

type TaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type RunTaskAction = (
  action: () => Promise<TaskActionResult>
) => Promise<void>;

type TaskActionIconsProps = {
  task: TrainTask;
  onRunTaskAction: RunTaskAction;
  onEditTask: (task: TrainTask) => void;
  onDeleteTask: (task: TrainTask) => void;
};

export default function TaskActionIcons({
  task,
  onRunTaskAction,
  onEditTask,
  onDeleteTask,
}: TaskActionIconsProps) {
  const renderEditButton = () => {
    const disabled =
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing";

    return (
      <Tooltip
        label={
          disabled
            ? "Futó, szüneteltetett vagy befejezés alatt álló task nem módosítható"
            : "Edit"
        }
      >
        <ActionIcon
          color="blue"
          variant="light"
          disabled={disabled}
          onClick={() => onEditTask(task)}
        >
          <IconPencil size={18} />
        </ActionIcon>
      </Tooltip>
    );
  };

  const renderDeleteButton = () => {
    return (
      <Tooltip label="Delete">
        <ActionIcon
          color="red"
          variant="light"
          onClick={() => onDeleteTask(task)}
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Tooltip>
    );
  };

  switch (task.status) {
    case "queued":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label="Start">
            <ActionIcon
              color="green"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.startTask(task.id)
                )
              }
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>

          {renderEditButton()}
          {renderDeleteButton()}
        </Group>
      );

    case "running":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label="Pause">
            <ActionIcon
              color="yellow"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.pauseTask(task.id)
                )
              }
            >
              <IconPlayerPause size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Finish">
            <ActionIcon
              color="orange"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.finishTask(task.id)
                )
              }
            >
              <IconCheck size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Abort">
            <ActionIcon
              color="red"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.abortTask(task.id)
                )
              }
            >
              <IconPlayerStop size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );

    case "paused":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label="Resume">
            <ActionIcon
              color="green"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.resumeTask(task.id)
                )
              }
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Finish">
            <ActionIcon
              color="orange"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.finishTask(task.id)
                )
              }
            >
              <IconCheck size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Abort">
            <ActionIcon
              color="red"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.abortTask(task.id)
                )
              }
            >
              <IconPlayerStop size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );

    case "finishing":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label="Abort">
            <ActionIcon
              color="red"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.abortTask(task.id)
                )
              }
            >
              <IconPlayerStop size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );

    case "aborted":
    case "completed":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label="Start again">
            <ActionIcon
              color="green"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.startTask(task.id)
                )
              }
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>

          {renderEditButton()}
          {renderDeleteButton()}
        </Group>
      );

    case "error":
      return renderDeleteButton();
  }
}
`;

const TASK_TABLE_PANEL = `// client/src/components/tasks/task-manager/TaskTablePanel.tsx

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
                <Table.Th>#</Table.Th>
                <Table.Th>Task</Table.Th>
                <Table.Th>Loco</Table.Th>
                <Table.Th>Speed</Table.Th>
                <Table.Th>Route</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Progress</Table.Th>
                <Table.Th>Turnouts</Table.Th>
                <Table.Th>Controls</Table.Th>
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
                          Address {task.runtime.loco.address}
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
          Még nincs felvett feladat.
        </Text>
      )}
    </Card>
  );
}
`;

const TASK_STEPS_PANEL = `// client/src/components/tasks/task-manager/TaskStepsPanel.tsx

import {
  Badge,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

import {
  getTaskStatusColor,
  getTaskStatusLabel,
} from "../taskUiHelpers";

type StepState =
  | "done"
  | "active"
  | "upcoming";

type TaskVisualStep = {
  key: string;
  title: string;
  description: string;
  state: StepState;
};

type TaskStepsPanelProps = {
  selectedTask: TrainTask | null;
};

function buildTaskSteps(
  task: TrainTask
): TaskVisualStep[] {
  const simulation =
    task.runtime.simulation;

  const pathBlocks =
    task.transition.solution.path
      .filter(item => item.type === "block")
      .map(item => item.block);

  const legs = pathBlocks
    .slice(0, -1)
    .map((block, index) => ({
      from: block,
      to: pathBlocks[index + 1]!,
    }));

  const steps: TaskVisualStep[] = [];

  const taskStarted =
    task.status !== "queued";

  steps.push({
    key: "task-start",
    title: "Task indítása",
    description:
      taskStarted
        ? "A task fut vagy már elindult."
        : "A feladat Start parancsra vár.",
    state:
      taskStarted
        ? "done"
        : "active",
  });

  steps.push({
    key: "waiting-for-loco",
    title: \`Mozdonyra vár az \${task.transition.fromBlock.name} blokkban\`,
    description:
      task.runtime.loco
        ? \`\${task.runtime.loco.name} • address \${task.runtime.loco.address}\`
        : "A task figyeli az induló blokkot, és mozdonyra vár.",
    state:
      !taskStarted
        ? "upcoming"
        : task.runtime.loco
          ? "done"
          : "active",
  });

  const routeStepDone =
    simulation.phase === "departing" ||
    simulation.phase === "waitingForBlockSensor" ||
    simulation.phase === "transit";

  const routeStepActive =
    (task.status === "running" || task.status === "paused") &&
    task.runtime.loco !== null &&
    simulation.phase === "waitingForRoute";

  steps.push({
    key: "waiting-for-route",
    title: "Útvonal foglalására vár",
    description:
      routeStepActive
        ? "A mozdony megvan, de az útvonal vagy a command center még foglalt. A task újrapróbálkozik."
        : routeStepDone
          ? "Az útvonal lefoglalva, a váltók beállítva."
          : "Ez a lépés még hátravan.",
    state:
      routeStepDone
        ? "done"
        : routeStepActive
          ? "active"
          : "upcoming",
  });

  for (let legIndex = 0; legIndex < legs.length; legIndex++) {
    const leg =
      legs[legIndex]!;

    const waitingForBlockSensorActive =
      simulation.legIndex === legIndex &&
      simulation.phase === "waitingForBlockSensor";

    const targetBlockGuardDone =
      simulation.legIndex > legIndex ||
      (
        simulation.legIndex === legIndex &&
        (
          simulation.phase === "departing" ||
          simulation.phase === "transit"
        )
      );

    steps.push({
      key: \`guard-\${leg.from.id}-\${leg.to.id}\`,
      title: \`\${leg.to.name} blokk szabad jelzésére vár\`,
      description:
        waitingForBlockSensorActive
          ? simulation.waitingSensorAddress && simulation.waitingSensorAddress > 0
            ? \`Ütközésvédelem: a következő blokk foglalt. A task a(z) #\${simulation.waitingSensorAddress} szenzor felszabadulására vár.\`
            : "Ütközésvédelem: a következő blokk foglalt. A task a blokk felszabadulására vár."
          : targetBlockGuardDone
            ? "A célblokk szabad, az indulás engedélyezett."
            : "Ez a lépés még hátravan.",
      state:
        waitingForBlockSensorActive
          ? "active"
          : targetBlockGuardDone
            ? "done"
            : "upcoming",
    });

    const departureDone =
      simulation.legIndex > legIndex ||
      (
        simulation.legIndex === legIndex &&
        simulation.phase === "transit"
      );

    const departureActive =
      simulation.legIndex === legIndex &&
      simulation.phase === "departing";

    steps.push({
      key: \`depart-\${leg.from.id}-\${leg.to.id}\`,
      title: \`\${leg.from.name} blokk elhagyása\`,
      description:
        departureDone
          ? \`A mozdony elhagyta a(z) \${leg.from.name} blokkot.\`
          : departureActive
            ? \`A mozdony a(z) \${leg.from.name} blokk elhagyására készül.\`
            : "Ez a lépés még hátravan.",
      state:
        departureDone
          ? "done"
          : departureActive
            ? "active"
            : "upcoming",
    });

    const arrivalDone =
      simulation.legIndex > legIndex;

    const arrivalActive =
      simulation.legIndex === legIndex &&
      simulation.phase === "transit";

    steps.push({
      key: \`arrive-\${leg.from.id}-\${leg.to.id}\`,
      title: \`\${leg.to.name} blokk érkezésére vár\`,
      description:
        arrivalDone
          ? \`A mozdony megérkezett a(z) \${leg.to.name} blokkba.\`
          : arrivalActive
            ? \`A mozdony úton van a(z) \${leg.to.name} blokk felé.\`
            : "Ez a lépés még hátravan.",
      state:
        arrivalDone
          ? "done"
          : arrivalActive
            ? "active"
            : "upcoming",
    });
  }

  return steps;
}

function TaskStepsList({
  task,
}: {
  task: TrainTask;
}) {
  const steps =
    buildTaskSteps(task);

  return (
    <Stack gap="xs">
      {steps.map(step => {
        const badgeColor =
          step.state === "done"
            ? "green"
            : step.state === "active"
              ? "blue"
              : "gray";

        const badgeLabel =
          step.state === "done"
            ? "Done"
            : step.state === "active"
              ? "Current"
              : "Pending";

        return (
          <Card
            key={step.key}
            withBorder
            radius="md"
            padding="sm"
            style={{
              opacity:
                step.state === "upcoming"
                  ? 0.55
                  : 1,
              borderLeft:
                step.state === "done"
                  ? "6px solid var(--mantine-color-green-6)"
                  : step.state === "active"
                    ? "6px solid var(--mantine-color-blue-6)"
                    : "6px solid var(--mantine-color-gray-4)",
              background:
                step.state === "active"
                  ? "var(--mantine-color-blue-light)"
                  : undefined,
            }}
          >
            <Group
              justify="space-between"
              align="flex-start"
            >
              <Stack gap={2}>
                <Text fw={700}>
                  {step.title}
                </Text>

                <Text
                  size="sm"
                  c="dimmed"
                >
                  {step.description}
                </Text>
              </Stack>

              <Badge
                color={badgeColor}
                variant="light"
              >
                {badgeLabel}
              </Badge>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}

export default function TaskStepsPanel({
  selectedTask,
}: TaskStepsPanelProps) {
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
      <Group
        justify="space-between"
        align="center"
        mb="md"
      >
        <Stack gap={0}>
          <Text fw={800}>
            Task steps
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            {selectedTask
              ? selectedTask.name
              : "Nincs kiválasztott feladat"}
          </Text>
        </Stack>

        {selectedTask && (
          <Badge
            color={getTaskStatusColor(selectedTask.status)}
            variant="light"
          >
            {getTaskStatusLabel(selectedTask.status)}
          </Badge>
        )}
      </Group>

      <ScrollArea
        type="auto"
        offsetScrollbars
        style={{
          flex: 1,
          minHeight: 0,
        }}
      >
        {selectedTask ? (
          <TaskStepsList task={selectedTask} />
        ) : (
          <Card
            withBorder
            radius="md"
            padding="md"
            style={{
              minHeight: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              c="dimmed"
              ta="center"
            >
              Válassz egy feladatot a táblázatból.
            </Text>
          </Card>
        )}
      </ScrollArea>
    </Card>
  );
}
`;

const TASK_ADD_DIALOG = `// client/src/components/tasks/task-manager/TaskAddDialog.tsx

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import {
  IconPlus,
} from "@tabler/icons-react";

import type {
  RunnableBlockRoute,
} from "../../../../../common/src/railway/graph";

import {
  BlockRoutePath,
  TurnoutRequirementBadges,
} from "./TaskRouteBadges";

type SelectOption = {
  value: string;
  label: string;
};

type TaskAddDialogProps = {
  opened: boolean;
  onClose: () => void;
  formError: string | null;
  taskName: string;
  onTaskNameChange: (value: string) => void;
  targetSpeed: number | string;
  onTargetSpeedChange: (value: number | string) => void;
  fromBlockSelectData: SelectOption[];
  toBlockSelectData: SelectOption[];
  fromBlockId: string | null;
  toBlockId: string | null;
  onFromBlockChange: (value: string | null) => void;
  onToBlockChange: (value: string | null) => void;
  hasGraph: boolean;
  selectedRoute: RunnableBlockRoute | null;
  onAddTask: () => void;
};

export default function TaskAddDialog({
  opened,
  onClose,
  formError,
  taskName,
  onTaskNameChange,
  targetSpeed,
  onTargetSpeedChange,
  fromBlockSelectData,
  toBlockSelectData,
  fromBlockId,
  toBlockId,
  onFromBlockChange,
  onToBlockChange,
  hasGraph,
  selectedRoute,
  onAddTask,
}: TaskAddDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Új feladat"
      centered
      size="lg"
      zIndex={10000}
    >
      <Stack gap="md">
        {formError && (
          <Alert
            color="red"
            title="Feladat nem vehető fel"
          >
            {formError}
          </Alert>
        )}

        <TextInput
          label="Task name"
          placeholder="Pl. B1 → C1"
          value={taskName}
          onChange={event =>
            onTaskNameChange(event.currentTarget.value)
          }
        />

        <Group
          grow
          align="end"
        >
          <Select
            label="From block"
            placeholder="Induló blokk"
            data={fromBlockSelectData}
            value={fromBlockId}
            onChange={onFromBlockChange}
            comboboxProps={{ zIndex: 10001 }}
            clearable
            disabled={!hasGraph}
          />

          <Select
            label="To block"
            placeholder="Cél blokk"
            data={toBlockSelectData}
            value={toBlockId}
            comboboxProps={{ zIndex: 10001 }}
            onChange={onToBlockChange}
            clearable
            disabled={!hasGraph || !fromBlockId}
          />

          <NumberInput
            label="Target speed"
            value={targetSpeed}
            onChange={onTargetSpeedChange}
            min={0}
            max={126}
            hideControls={false}
          />
        </Group>

        {selectedRoute && (
          <Stack gap="xs">
            <Text
              size="sm"
              fw={600}
            >
              Kiválasztott végrehajtható blokkátmenet
            </Text>

            <BlockRoutePath
              solution={selectedRoute.solution}
              badgeSize="md"
            />

            <Group gap="xs">
              <Badge
                color={
                  selectedRoute.solution.locoDirection === "forward"
                    ? "green"
                    : selectedRoute.solution.locoDirection === "reverse"
                      ? "orange"
                      : "gray"
                }
                variant="light"
              >
                {selectedRoute.solution.locoDirection.toUpperCase()}
              </Badge>

              <TurnoutRequirementBadges
                turnoutStates={selectedRoute.solution.turnoutStates}
              />
            </Group>
          </Stack>
        )}

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            Mégse
          </Button>

          <Button
            leftSection={<IconPlus size={18} />}
            onClick={onAddTask}
            disabled={!hasGraph}
          >
            Hozzáadás
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
`;

const TASK_EDIT_DIALOG = `// client/src/components/tasks/task-manager/TaskEditDialog.tsx

import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";

type SelectOption = {
  value: string;
  label: string;
};

type TaskEditDialogProps = {
  opened: boolean;
  onClose: () => void;
  editError: string | null;
  taskName: string;
  onTaskNameChange: (value: string) => void;
  targetSpeed: number | string;
  onTargetSpeedChange: (value: number | string) => void;
  fromBlockSelectData: SelectOption[];
  toBlockSelectData: SelectOption[];
  fromBlockId: string | null;
  toBlockId: string | null;
  onFromBlockChange: (value: string | null) => void;
  onToBlockChange: (value: string | null) => void;
  onSave: () => void;
};

export default function TaskEditDialog({
  opened,
  onClose,
  editError,
  taskName,
  onTaskNameChange,
  targetSpeed,
  onTargetSpeedChange,
  fromBlockSelectData,
  toBlockSelectData,
  fromBlockId,
  toBlockId,
  onFromBlockChange,
  onToBlockChange,
  onSave,
}: TaskEditDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Feladat szerkesztése"
      centered
      size="lg"
      zIndex={10001}
    >
      <Stack gap="md">
        {editError && (
          <Alert
            color="red"
            title="Feladat nem módosítható"
          >
            {editError}
          </Alert>
        )}

        <TextInput
          label="Task name"
          placeholder="Pl. B1 → C1"
          value={taskName}
          onChange={event =>
            onTaskNameChange(event.currentTarget.value)
          }
        />

        <Group
          grow
          align="end"
        >
          <Select
            label="From block"
            placeholder="Induló blokk"
            data={fromBlockSelectData}
            value={fromBlockId}
            comboboxProps={{ zIndex: 10001 }}
            onChange={onFromBlockChange}
            clearable
          />

          <Select
            label="To block"
            placeholder="Cél blokk"
            data={toBlockSelectData}
            value={toBlockId}
            comboboxProps={{ zIndex: 10001 }}
            onChange={onToBlockChange}
            clearable
            disabled={!fromBlockId}
          />

          <NumberInput
            label="Target speed"
            value={targetSpeed}
            onChange={onTargetSpeedChange}
            min={0}
            max={126}
            hideControls={false}
          />
        </Group>

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            Mégse
          </Button>

          <Button
            color="blue"
            onClick={onSave}
          >
            Mentés
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
`;

const TASK_DELETE_DIALOG = `// client/src/components/tasks/task-manager/TaskDeleteDialog.tsx

import {
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

type TaskDeleteDialogProps = {
  task: TrainTask | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function TaskDeleteDialog({
  task,
  onClose,
  onConfirm,
}: TaskDeleteDialogProps) {
  return (
    <Modal
      opened={task !== null}
      onClose={onClose}
      title="Feladat törlése"
      centered
      size="sm"
      zIndex={10000}
    >
      <Stack gap="md">
        <Text>
          Biztosan törlöd ezt a feladatot?
        </Text>

        {task && (
          <Badge
            color="violet"
            variant="light"
            style={{ alignSelf: "flex-start" }}
          >
            {task.name}
          </Badge>
        )}

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            Mégse
          </Button>

          <Button
            color="red"
            onClick={onConfirm}
          >
            Törlés
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
`;

const TASK_MANAGER_TOOLBAR = `// client/src/components/tasks/task-manager/TaskManagerToolbar.tsx

import {
  Badge,
  Button,
  Group,
  Text,
} from "@mantine/core";

import {
  IconCheck,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
} from "@tabler/icons-react";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

type TaskManagerToolbarProps = {
  tasks: TrainTask[];
  onAddTask: () => void;
  onStartAllTasks: () => void;
  onFinishAllTasks: () => void;
  onAbortAllTasks: () => void;
  onLoadTasks: () => void;
  onSaveTasks: () => void;
};

export default function TaskManagerToolbar({
  tasks,
  onAddTask,
  onStartAllTasks,
  onFinishAllTasks,
  onAbortAllTasks,
  onLoadTasks,
  onSaveTasks,
}: TaskManagerToolbarProps) {
  return (
    <Group
      justify="space-between"
      align="center"
    >
      <Group gap="xs">
        <Text fw={700}>
          Feladatok
        </Text>

        <Badge variant="light">
          {tasks.length} db
        </Badge>
      </Group>

      <Group gap="xs">
        <Button
          size="xs"
          leftSection={<IconPlus size={16} />}
          onClick={onAddTask}
        >
          Add task
        </Button>

        <Button
          size="xs"
          variant="light"
          color="green"
          leftSection={<IconPlayerPlay size={16} />}
          onClick={onStartAllTasks}
          disabled={tasks.length === 0}
        >
          Start all
        </Button>

        <Button
          size="xs"
          variant="light"
          color="orange"
          leftSection={<IconCheck size={16} />}
          onClick={onFinishAllTasks}
          disabled={
            !tasks.some(task =>
              task.status === "running" ||
              task.status === "paused"
            )
          }
        >
          Finish all
        </Button>

        <Button
          size="xs"
          variant="light"
          color="red"
          leftSection={<IconPlayerStop size={16} />}
          onClick={onAbortAllTasks}
          disabled={
            !tasks.some(task =>
              task.status === "running" ||
              task.status === "paused" ||
              task.status === "finishing"
            )
          }
        >
          Abort all
        </Button>

        <Button
          size="xs"
          variant="light"
          color="blue"
          onClick={onLoadTasks}
        >
          Load
        </Button>

        <Button
          size="xs"
          variant="light"
          color="green"
          onClick={onSaveTasks}
        >
          Save
        </Button>
      </Group>
    </Group>
  );
}
`;

const TASK_MANAGER_DIALOG = `// client/src/components/common/TaskManagerDialog.tsx

import {
  Alert,
  Stack,
} from "@mantine/core";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AppModal from "./AppModal";

import {
  useTaskManager,
} from "../../services/tasks/useTaskManager";

import {
  routeGraphStore,
} from "../../services/routeGraphStore";

import {
  taskManager,
} from "../../services/tasks/taskManagerSingleton";

import type {
  TrainTask,
} from "../../services/tasks/TaskTypes";

import {
  showErrorMessage,
  showOkMessage,
  showWarningMessage,
} from "../../helpers";

import type {
  RunnableBlockRoute,
} from "../../../../common/src/railway/graph";

import TaskAddDialog from "../tasks/task-manager/TaskAddDialog";
import TaskDeleteDialog from "../tasks/task-manager/TaskDeleteDialog";
import TaskEditDialog from "../tasks/task-manager/TaskEditDialog";
import TaskManagerToolbar from "../tasks/task-manager/TaskManagerToolbar";
import TaskStepsPanel from "../tasks/task-manager/TaskStepsPanel";
import TaskTablePanel from "../tasks/task-manager/TaskTablePanel";

type TaskManagerDialogProps = {
  opened: boolean;
  onClose: () => void;
};

export default function TaskManagerDialog({
  opened,
  onClose,
}: TaskManagerDialogProps) {
  const snapshot =
    useTaskManager();

  const [taskName, setTaskName] =
    useState("");

  const [targetSpeed, setTargetSpeed] =
    useState<number | string>(40);

  const [fromBlockId, setFromBlockId] =
    useState<string | null>(null);

  const [toBlockId, setToBlockId] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  const [addTaskOpened, setAddTaskOpened] =
    useState(false);

  const [selectedTaskId, setSelectedTaskId] =
    useState<string | null>(null);

  const [deleteTask, setDeleteTask] =
    useState<TrainTask | null>(null);

  const [editTask, setEditTask] =
    useState<TrainTask | null>(null);

  const [editTaskName, setEditTaskName] =
    useState("");

  const [editTargetSpeed, setEditTargetSpeed] =
    useState<number | string>(40);

  const [editFromBlockId, setEditFromBlockId] =
    useState<string | null>(null);

  const [editToBlockId, setEditToBlockId] =
    useState<string | null>(null);

  const [editError, setEditError] =
    useState<string | null>(null);

  const graph =
    routeGraphStore.getGraph();

  const selectedTask = useMemo(() => {
    return (
      snapshot.tasks.find(task => task.id === selectedTaskId) ??
      null
    );
  }, [snapshot.tasks, selectedTaskId]);

  useEffect(() => {
    if (snapshot.tasks.length === 0) {
      if (selectedTaskId !== null) {
        setSelectedTaskId(null);
      }

      return;
    }

    const selectedTaskStillExists =
      selectedTaskId !== null &&
      snapshot.tasks.some(task => task.id === selectedTaskId);

    if (!selectedTaskStillExists) {
      setSelectedTaskId(snapshot.tasks[0]!.id);
    }
  }, [snapshot.tasks, selectedTaskId]);

  const runnableRoutes = useMemo(() => {
    return graph?.getRunnableBlockRoutes() ?? [];
  }, [graph, snapshot.hasGraph]);

  const fromBlockSelectData = useMemo(() => {
    const map =
      new Map<string, string>();

    for (const transition of runnableRoutes) {
      map.set(
        transition.fromBlock.id,
        transition.fromBlock.label
      );
    }

    return [...map.entries()]
      .map(([value, label]) => ({
        value,
        label,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label)
      );
  }, [runnableRoutes]);

  const toBlockSelectData = useMemo(() => {
    const filtered =
      fromBlockId
        ? runnableRoutes.filter(
          transition => transition.fromBlock.id === fromBlockId
        )
        : runnableRoutes;

    const map =
      new Map<string, string>();

    for (const transition of filtered) {
      map.set(
        transition.toBlock.id,
        transition.toBlock.label
      );
    }

    return [...map.entries()]
      .map(([value, label]) => ({
        value,
        label,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label)
      );
  }, [runnableRoutes, fromBlockId]);

  const editToBlockSelectData = useMemo(() => {
    const filtered =
      editFromBlockId
        ? runnableRoutes.filter(
          transition => transition.fromBlock.id === editFromBlockId
        )
        : runnableRoutes;

    const map =
      new Map<string, string>();

    for (const transition of filtered) {
      map.set(
        transition.toBlock.id,
        transition.toBlock.label
      );
    }

    return [...map.entries()]
      .map(([value, label]) => ({
        value,
        label,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label)
      );
  }, [runnableRoutes, editFromBlockId]);

  const selectedRoute =
    useMemo<RunnableBlockRoute | null>(() => {
      if (!fromBlockId || !toBlockId) {
        return null;
      }

      return (
        runnableRoutes.find(
          transition =>
            transition.fromBlock.id === fromBlockId &&
            transition.toBlock.id === toBlockId
        ) ?? null
      );
    }, [runnableRoutes, fromBlockId, toBlockId]);

  const handleFromBlockChange = (
    value: string | null
  ) => {
    setFromBlockId(value);
    setToBlockId(null);
    setFormError(null);
  };

  const handleAddTask = async () => {
    setFormError(null);
    setActionError(null);

    if (!fromBlockId || !toBlockId) {
      setFormError("Válassz induló és cél blokkot.");
      return;
    }

    if (
      typeof targetSpeed !== "number" ||
      targetSpeed < 0
    ) {
      setFormError("Adj meg érvényes célsebességet.");
      return;
    }

    const trimmedTaskName =
      taskName.trim();

    const result =
      await taskManager.addTask({
        ...(trimmedTaskName ? { name: trimmedTaskName } : {}),
        targetSpeed,
        fromBlockId,
        toBlockId,
      });

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setTaskName("");
    setFromBlockId(null);
    setToBlockId(null);
    setFormError(null);
    setAddTaskOpened(false);
  };

  const runTaskAction = async (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>
  ) => {
    setActionError(null);

    const result =
      await action();

    if (!result.ok) {
      setActionError(result.error);
    }
  };

  const openEditTask = (
    task: TrainTask
  ) => {
    setEditTask(task);
    setEditTaskName(task.name);
    setEditTargetSpeed(task.targetSpeed);
    setEditFromBlockId(task.fromBlockId);
    setEditToBlockId(task.toBlockId);
    setEditError(null);
  };

  const handleEditFromBlockChange = (
    value: string | null
  ) => {
    setEditFromBlockId(value);
    setEditToBlockId(null);
    setEditError(null);
  };

  const handleSaveEditedTask = async () => {
    if (!editTask) {
      return;
    }

    setEditError(null);
    setActionError(null);

    if (!editFromBlockId || !editToBlockId) {
      setEditError("Válassz induló és cél blokkot.");
      return;
    }

    if (
      typeof editTargetSpeed !== "number" ||
      editTargetSpeed < 0
    ) {
      setEditError("Adj meg érvényes célsebességet.");
      return;
    }

    const trimmedTaskName =
      editTaskName.trim();

    const result =
      await taskManager.updateTask(editTask.id, {
        ...(trimmedTaskName ? { name: trimmedTaskName } : {}),
        targetSpeed: editTargetSpeed,
        fromBlockId: editFromBlockId,
        toBlockId: editToBlockId,
      });

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    setEditTask(null);
    setEditError(null);

    showOkMessage("SUCCESSFUL", "Task updated.");
  };

  const handleStartAllTasks = async () => {
    setActionError(null);

    const result =
      await taskManager.startAllTasks();

    if (!result.ok) {
      setActionError(result.error);
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage("SUCCESSFUL", "All tasks started.");
  };

  const handleFinishAllTasks = async () => {
    setActionError(null);

    const result =
      await taskManager.finishAllTasks();

    if (!result.ok) {
      setActionError(result.error);
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage("SUCCESSFUL", "All tasks marked for finish.");
  };

  const handleAbortAllTasks = async () => {
    setActionError(null);

    const result =
      await taskManager.abortAllTasks();

    if (!result.ok) {
      setActionError(result.error);
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage("SUCCESSFUL", "All active tasks aborted.");
  };

  const handleSaveTasks = async () => {
    setActionError(null);

    const result =
      await taskManager.saveTasks();

    if (!result.ok) {
      setActionError(result.error);
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage("SUCCESSFUL", "Tasks saved.");
  };

  const handleLoadTasks = async () => {
    setActionError(null);

    const result =
      await taskManager.loadTasks();

    if (!result.ok) {
      setActionError(result.error);
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage(
      "SUCCESSFUL",
      \`\${result.loadedCount} task loaded.\`
    );

    if (result.skippedCount > 0) {
      showWarningMessage(
        "Warning",
        result.warnings.join("\\n")
      );
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deleteTask) {
      return;
    }

    const result =
      await taskManager.removeTask(deleteTask.id);

    if (!result.ok) {
      setActionError(result.error);
      showErrorMessage("ERROR", result.error);
      return;
    }

    setDeleteTask(null);
  };

  return (
    <>
      <TaskAddDialog
        opened={addTaskOpened}
        onClose={() => setAddTaskOpened(false)}
        formError={formError}
        taskName={taskName}
        onTaskNameChange={setTaskName}
        targetSpeed={targetSpeed}
        onTargetSpeedChange={setTargetSpeed}
        fromBlockSelectData={fromBlockSelectData}
        toBlockSelectData={toBlockSelectData}
        fromBlockId={fromBlockId}
        toBlockId={toBlockId}
        onFromBlockChange={handleFromBlockChange}
        onToBlockChange={value => {
          setToBlockId(value);
          setFormError(null);
        }}
        hasGraph={snapshot.hasGraph}
        selectedRoute={selectedRoute}
        onAddTask={() => {
          void handleAddTask();
        }}
      />

      <TaskEditDialog
        opened={editTask !== null}
        onClose={() => setEditTask(null)}
        editError={editError}
        taskName={editTaskName}
        onTaskNameChange={setEditTaskName}
        targetSpeed={editTargetSpeed}
        onTargetSpeedChange={setEditTargetSpeed}
        fromBlockSelectData={fromBlockSelectData}
        toBlockSelectData={editToBlockSelectData}
        fromBlockId={editFromBlockId}
        toBlockId={editToBlockId}
        onFromBlockChange={handleEditFromBlockChange}
        onToBlockChange={value => {
          setEditToBlockId(value);
          setEditError(null);
        }}
        onSave={() => {
          void handleSaveEditedTask();
        }}
      />

      <TaskDeleteDialog
        task={deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={() => {
          void handleConfirmDeleteTask();
        }}
      />

      <AppModal
        opened={opened}
        onClose={onClose}
        title="Task Manager"
        size="calc(92vw - 64px)"
        centered
        draggable
      >
        <Stack
          gap="md"
          h="calc(100vh - 190px)"
          style={{
            overflow: "hidden",
          }}
        >
          {!snapshot.hasGraph && (
            <Alert
              color="red"
              title="Nincs útvonalgráf"
            >
              Előbb generálni kell a gráfot, hogy feladatot lehessen
              felvenni.
            </Alert>
          )}

          {!snapshot.hasLayout && (
            <Alert
              color="yellow"
              title="Nincs aktív layout"
            >
              A layout store jelenleg nem tartalmaz pályát.
            </Alert>
          )}

          {formError && (
            <Alert
              color="red"
              title="Feladat nem vehető fel"
            >
              {formError}
            </Alert>
          )}

          {actionError && (
            <Alert
              color="red"
              title="Művelet nem hajtható végre"
            >
              {actionError}
            </Alert>
          )}

          <Stack
            gap="sm"
            style={{
              flex: 1,
              minHeight: 0,
            }}
          >
            <TaskManagerToolbar
              tasks={snapshot.tasks}
              onAddTask={() => setAddTaskOpened(true)}
              onStartAllTasks={() => {
                void handleStartAllTasks();
              }}
              onFinishAllTasks={() => {
                void handleFinishAllTasks();
              }}
              onAbortAllTasks={() => {
                void handleAbortAllTasks();
              }}
              onLoadTasks={() => {
                void handleLoadTasks();
              }}
              onSaveTasks={() => {
                void handleSaveTasks();
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1.6fr) minmax(340px, 1fr)",
                gap: 16,
                flex: 1,
                minHeight: 0,
              }}
            >
              <TaskTablePanel
                tasks={snapshot.tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
                onEditTask={openEditTask}
                onDeleteTask={setDeleteTask}
                onRunTaskAction={runTaskAction}
              />

              <TaskStepsPanel
                selectedTask={selectedTask}
              />
            </div>
          </Stack>
        </Stack>
      </AppModal>
    </>
  );
}
`;

try {
  console.log("DCCExpressNext – TaskManagerDialog split patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  ensureExisting(FILES.taskManagerDialog);

  write(FILES.taskRouteBadges, TASK_ROUTE_BADGES);
  write(FILES.taskProgressBadge, TASK_PROGRESS_BADGE);
  write(FILES.taskActionIcons, TASK_ACTION_ICONS);
  write(FILES.taskTablePanel, TASK_TABLE_PANEL);
  write(FILES.taskStepsPanel, TASK_STEPS_PANEL);
  write(FILES.taskAddDialog, TASK_ADD_DIALOG);
  write(FILES.taskEditDialog, TASK_EDIT_DIALOG);
  write(FILES.taskDeleteDialog, TASK_DELETE_DIALOG);
  write(FILES.taskManagerToolbar, TASK_MANAGER_TOOLBAR);
  write(FILES.taskManagerDialog, TASK_MANAGER_DIALOG);

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

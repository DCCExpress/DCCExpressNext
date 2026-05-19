// client/src/components/tasks/task-manager/TaskStepsPanel.tsx

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
    title: `Mozdonyra vár az ${task.transition.fromBlock.name} blokkban`,
    description:
      task.runtime.loco
        ? `${task.runtime.loco.name} • address ${task.runtime.loco.address}`
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
      key: `guard-${leg.from.id}-${leg.to.id}`,
      title: `${leg.to.name} blokk szabad jelzésére vár`,
      description:
        waitingForBlockSensorActive
          ? simulation.waitingSensorAddress && simulation.waitingSensorAddress > 0
            ? `Ütközésvédelem: a következő blokk foglalt. A task a(z) #${simulation.waitingSensorAddress} szenzor felszabadulására vár.`
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
      key: `depart-${leg.from.id}-${leg.to.id}`,
      title: `${leg.from.name} blokk elhagyása`,
      description:
        departureDone
          ? `A mozdony elhagyta a(z) ${leg.from.name} blokkot.`
          : departureActive
            ? `A mozdony a(z) ${leg.from.name} blokk elhagyására készül.`
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
      key: `arrive-${leg.from.id}-${leg.to.id}`,
      title: `${leg.to.name} blokk érkezésére vár`,
      description:
        arrivalDone
          ? `A mozdony megérkezett a(z) ${leg.to.name} blokkba.`
          : arrivalActive
            ? `A mozdony úton van a(z) ${leg.to.name} blokk felé.`
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

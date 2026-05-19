import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Card,
    Divider,
    Group,
    Modal,
    NumberInput,
    ScrollArea,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";
import {
    IconPlayerPause,
    IconPlayerPlay,
    IconPlayerStop,
    IconCheck,
    IconPlus,
    IconPencil,
    IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import AppModal from "./AppModal";

import { useTaskManager } from "../../services/tasks/useTaskManager";
import { routeGraphStore } from "../../services/routeGraphStore";
import { taskManager } from "../../services/tasks/taskManagerSingleton";
import type {
    TrainTask,
} from "../../services/tasks/TaskTypes";
import {
    showErrorMessage,
    showOkMessage,
    showWarningMessage,
} from "../../helpers";
import {
    getTaskStatusColor,
    getTaskStatusLabel,
} from "../tasks/taskUiHelpers";

import type {
    BlockRouteSolution,
    RunnableBlockRoute,
} from "../../../../common/src/railway/graph";

type TaskManagerDialogProps = {
    opened: boolean;
    onClose: () => void;
};

export default function TaskManagerDialog({
    opened,
    onClose,
}: TaskManagerDialogProps) {
    const snapshot = useTaskManager();

    const [taskName, setTaskName] = useState("");
    const [targetSpeed, setTargetSpeed] = useState<number | string>(40);

    const [fromBlockId, setFromBlockId] = useState<string | null>(null);
    const [toBlockId, setToBlockId] = useState<string | null>(null);

    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [addTaskOpened, setAddTaskOpened] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [deleteTask, setDeleteTask] = useState<TrainTask | null>(null);

    const [editTask, setEditTask] = useState<TrainTask | null>(null);
    const [editTaskName, setEditTaskName] = useState("");
    const [editTargetSpeed, setEditTargetSpeed] = useState<number | string>(40);
    const [editFromBlockId, setEditFromBlockId] = useState<string | null>(null);
    const [editToBlockId, setEditToBlockId] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);

    const graph = routeGraphStore.getGraph();

    const selectedTask = useMemo(() => {
        return snapshot.tasks.find(task => task.id === selectedTaskId) ?? null;
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
        const map = new Map<string, string>();

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
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [runnableRoutes]);

    const toBlockSelectData = useMemo(() => {
        const filtered = fromBlockId
            ? runnableRoutes.filter(
                transition => transition.fromBlock.id === fromBlockId
            )
            : runnableRoutes;

        const map = new Map<string, string>();

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
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [runnableRoutes, fromBlockId]);

    const editToBlockSelectData = useMemo(() => {
        const filtered = editFromBlockId
            ? runnableRoutes.filter(
                transition => transition.fromBlock.id === editFromBlockId
            )
            : runnableRoutes;

        const map = new Map<string, string>();

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
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [runnableRoutes, editFromBlockId]);

    const selectedRoute = useMemo<RunnableBlockRoute | null>(() => {
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

    const handleFromBlockChange = (value: string | null) => {
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

        if (typeof targetSpeed !== "number" || targetSpeed < 0) {
            setFormError("Adj meg érvényes célsebességet.");
            return;
        }

        const trimmedTaskName = taskName.trim();

        const result = await taskManager.addTask({
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

        const result = await action();

        if (!result.ok) {
            setActionError(result.error);
        }
    };

    const openEditTask = (task: TrainTask) => {
        setEditTask(task);
        setEditTaskName(task.name);
        setEditTargetSpeed(task.targetSpeed);
        setEditFromBlockId(task.fromBlockId);
        setEditToBlockId(task.toBlockId);
        setEditError(null);
    };

    const handleEditFromBlockChange = (value: string | null) => {
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

        if (typeof editTargetSpeed !== "number" || editTargetSpeed < 0) {
            setEditError("Adj meg érvényes célsebességet.");
            return;
        }

        const trimmedTaskName = editTaskName.trim();

        const result = await taskManager.updateTask(editTask.id, {
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

        const result = await taskManager.saveTasks();

        if (!result.ok) {
            setActionError(result.error);
            showErrorMessage("ERROR", result.error);
            return;
        }

        showOkMessage("SUCCESSFUL", "Tasks saved.");
    };

    const handleLoadTasks = async () => {
        setActionError(null);

        const result = await taskManager.loadTasks();

        if (!result.ok) {
            setActionError(result.error);
            showErrorMessage("ERROR", result.error);
            return;
        }

        showOkMessage(
            "SUCCESSFUL",
            `${result.loadedCount} task loaded.`
        );

        if (result.skippedCount > 0) {
            showWarningMessage(
                "Warning",
                result.warnings.join("\n")
            );
        }
    };

    const handleConfirmDeleteTask = async () => {
        if (!deleteTask) {
            return;
        }

        const result = await taskManager.removeTask(deleteTask.id);

        if (!result.ok) {
            setActionError(result.error);
            showErrorMessage("ERROR", result.error);
            return;
        }

        setDeleteTask(null);
    };

    function renderTurnoutRequirementBadges(
        turnoutStates: { address: number; closed: boolean }[]
    ) {
        if (turnoutStates.length === 0) {
            return (
                <Text size="sm" c="dimmed">
                    —
                </Text>
            );
        }

        return (
            <Group gap="xs" wrap="wrap">
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

    function renderBlockRoutePath(
        solution: BlockRouteSolution,
        badgeSize: "sm" | "md" | "lg" = "sm"
    ) {
        if (solution.path.length === 0) {
            return null;
        }

        return (
            <Group gap="xs" wrap="wrap">
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

    function renderTaskProgress(task: TrainTask) {
        if (task.status === "completed") {
            return (
                <Badge color="blue" variant="light">
                    Arrived
                </Badge>
            );
        }

        if (task.status === "aborted") {
            return (
                <Badge color="red" variant="light">
                    Aborted
                </Badge>
            );
        }

        if (task.runtime.simulation.phase === "waitingForRoute") {
            return (
                <Badge color="yellow" variant="light">
                    Waiting route
                </Badge>
            );
        }

        if (task.runtime.simulation.phase === "waitingForBlockSensor") {
            const sensorAddress =
                task.runtime.simulation.waitingSensorAddress;

            return (
                <Badge color="yellow" variant="light">
                    {sensorAddress && sensorAddress > 0
                        ? `Waiting sensor #${sensorAddress}`
                        : "Waiting next block free"}
                </Badge>
            );
        }

        if (task.runtime.inTransit) {
            return (
                <Badge color="red" variant="light">
                    Between blocks
                </Badge>
            );
        }

        if (task.runtime.hasLeftFromBlock) {
            return (
                <Badge color="orange" variant="light">
                    Left start block
                </Badge>
            );
        }

        return (
            <Badge color="gray" variant="light">
                Waiting
            </Badge>
        );
    }

    function renderEditButton(task: TrainTask) {
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
                    onClick={() => openEditTask(task)}
                >
                    <IconPencil size={18} />
                </ActionIcon>
            </Tooltip>
        );
    }

    function renderDeleteButton(task: TrainTask) {
        return (
            <Tooltip label="Delete">
                <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => setDeleteTask(task)}
                >
                    <IconTrash size={18} />
                </ActionIcon>
            </Tooltip>
        );
    }

    function renderTaskControls(task: TrainTask) {
        switch (task.status) {
            case "queued":
                return (
                    <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Start">
                            <ActionIcon
                                color="green"
                                variant="light"
                                onClick={() =>
                                    void runTaskAction(() =>
                                        taskManager.startTask(task.id)
                                    )
                                }
                            >
                                <IconPlayerPlay size={18} />
                            </ActionIcon>
                        </Tooltip>

                        {renderEditButton(task)}
                        {renderDeleteButton(task)}
                    </Group>
                );

            case "running":
                return (
                    <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Pause">
                            <ActionIcon
                                color="yellow"
                                variant="light"
                                onClick={() =>
                                    void runTaskAction(() =>
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
                                    void runTaskAction(() =>
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
                                    void runTaskAction(() =>
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
                    <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Resume">
                            <ActionIcon
                                color="green"
                                variant="light"
                                onClick={() =>
                                    void runTaskAction(() =>
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
                                    void runTaskAction(() =>
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
                                    void runTaskAction(() =>
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
                    <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Abort">
                            <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() =>
                                    void runTaskAction(() =>
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
                    <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Start again">
                            <ActionIcon
                                color="green"
                                variant="light"
                                onClick={() =>
                                    void runTaskAction(() =>
                                        taskManager.startTask(task.id)
                                    )
                                }
                            >
                                <IconPlayerPlay size={18} />
                            </ActionIcon>
                        </Tooltip>

                        {renderEditButton(task)}
                        {renderDeleteButton(task)}
                    </Group>
                );

            case "error":
                return renderDeleteButton(task);
        }
    }
    function renderTaskSteps(task: TrainTask) {
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
            const leg = legs[legIndex]!;

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
                            <Group justify="space-between" align="flex-start">
                                <Stack gap={2}>
                                    <Text fw={700}>
                                        {step.title}
                                    </Text>

                                    <Text size="sm" c="dimmed">
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

    const taskRows = snapshot.tasks.map((task, index) => (
        <Table.Tr
            key={task.id}
            onClick={() => setSelectedTaskId(task.id)}
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
                    <Text size="xs" c="dimmed">
                        {task.id}
                    </Text>
                </Stack>
            </Table.Td>

            <Table.Td>
                {task.runtime.loco ? (
                    <Stack gap={2}>
                        <Badge color="indigo" variant="light">
                            {task.runtime.loco.name}
                        </Badge>

                        <Text size="xs" c="dimmed">
                            Address {task.runtime.loco.address}
                        </Text>
                    </Stack>
                ) : (
                    <Text size="sm" c="dimmed">
                        —
                    </Text>
                )}
            </Table.Td>

            <Table.Td>
                <Badge color="cyan" variant="light">
                    {task.targetSpeed}
                </Badge>
            </Table.Td>

            <Table.Td>
                {renderBlockRoutePath(task.transition.solution)}
            </Table.Td>

            <Table.Td>
                <Badge
                    color={getTaskStatusColor(task.status)}
                    variant="light"
                >
                    {getTaskStatusLabel(task.status)}
                </Badge>
            </Table.Td>

            <Table.Td>{renderTaskProgress(task)}</Table.Td>

            <Table.Td>
                {renderTurnoutRequirementBadges(
                    task.transition.solution.turnoutStates
                )}
            </Table.Td>

            <Table.Td>{renderTaskControls(task)}</Table.Td>
        </Table.Tr>
    ));

    return (
        <>
            <Modal
                opened={addTaskOpened}
                onClose={() => setAddTaskOpened(false)}
                title="Új feladat"
                centered
                size="lg"
                zIndex={10000}
            >
                <Stack gap="md">
                    {formError && (
                        <Alert color="red" title="Feladat nem vehető fel">
                            {formError}
                        </Alert>
                    )}

                    <TextInput
                        label="Task name"
                        placeholder="Pl. B1 → C1"
                        value={taskName}
                        onChange={event =>
                            setTaskName(event.currentTarget.value)
                        }
                    />

                    <Group grow align="end">
                        <Select
                            label="From block"
                            placeholder="Induló blokk"
                            data={fromBlockSelectData}
                            value={fromBlockId}
                            onChange={handleFromBlockChange}
                            comboboxProps={{ zIndex: 10001 }}
                            clearable
                            disabled={!snapshot.hasGraph}
                        />

                        <Select
                            label="To block"
                            placeholder="Cél blokk"
                            data={toBlockSelectData}
                            value={toBlockId}
                            comboboxProps={{ zIndex: 10001 }}
                            onChange={value => {
                                setToBlockId(value);
                                setFormError(null);
                            }}
                            clearable
                            disabled={!snapshot.hasGraph || !fromBlockId}
                        />

                        <NumberInput
                            label="Target speed"
                            value={targetSpeed}
                            onChange={setTargetSpeed}
                            min={0}
                            max={126}
                            hideControls={false}
                        />
                    </Group>

                    {selectedRoute && (
                        <Stack gap="xs">
                            <Text size="sm" fw={600}>
                                Kiválasztott végrehajtható blokkátmenet
                            </Text>

                            {renderBlockRoutePath(
                                selectedRoute.solution,
                                "md"
                            )}

                            <Group gap="xs">
                                <Badge
                                    color={
                                        selectedRoute.solution.locoDirection ===
                                            "forward"
                                            ? "green"
                                            : selectedRoute.solution
                                                .locoDirection === "reverse"
                                                ? "orange"
                                                : "gray"
                                    }
                                    variant="light"
                                >
                                    {selectedRoute.solution.locoDirection.toUpperCase()}
                                </Badge>

                                {renderTurnoutRequirementBadges(
                                    selectedRoute.solution.turnoutStates
                                )}
                            </Group>
                        </Stack>
                    )}

                    <Group justify="flex-end">
                        <Button
                            variant="default"
                            onClick={() => setAddTaskOpened(false)}
                        >
                            Mégse
                        </Button>

                        <Button
                            leftSection={<IconPlus size={18} />}
                            onClick={() => {
                                void handleAddTask();
                            }}
                            disabled={!snapshot.hasGraph}
                        >
                            Hozzáadás
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={editTask !== null}
                onClose={() => setEditTask(null)}
                title="Feladat szerkesztése"
                centered
                size="lg"
                zIndex={10001}
            >
                <Stack gap="md">
                    {editError && (
                        <Alert color="red" title="Feladat nem módosítható">
                            {editError}
                        </Alert>
                    )}

                    <TextInput
                        label="Task name"
                        placeholder="Pl. B1 → C1"
                        value={editTaskName}
                        onChange={event =>
                            setEditTaskName(event.currentTarget.value)
                        }
                    />

                    <Group grow align="end">
                        <Select
                            label="From block"
                            placeholder="Induló blokk"
                            data={fromBlockSelectData}
                            value={editFromBlockId}
                            comboboxProps={{ zIndex: 10001 }}
                            onChange={handleEditFromBlockChange}
                            clearable
                        />

                        <Select
                            label="To block"
                            placeholder="Cél blokk"
                            data={editToBlockSelectData}
                            value={editToBlockId}
                            comboboxProps={{ zIndex: 10001 }}
                            onChange={value => {
                                setEditToBlockId(value);
                                setEditError(null);
                            }}
                            clearable
                            disabled={!editFromBlockId}
                        />

                        <NumberInput
                            label="Target speed"
                            value={editTargetSpeed}
                            onChange={setEditTargetSpeed}
                            min={0}
                            max={126}
                            hideControls={false}
                        />
                    </Group>

                    <Group justify="flex-end">
                        <Button
                            variant="default"
                            onClick={() => setEditTask(null)}
                        >
                            Mégse
                        </Button>

                        <Button
                            color="blue"
                            onClick={() => {
                                void handleSaveEditedTask();
                            }}
                        >
                            Mentés
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={deleteTask !== null}
                onClose={() => setDeleteTask(null)}
                title="Feladat törlése"
                centered
                size="sm"
                zIndex={10000}
            >
                <Stack gap="md">
                    <Text>
                        Biztosan törlöd ezt a feladatot?
                    </Text>

                    {deleteTask && (
                        <Badge
                            color="violet"
                            variant="light"
                            style={{ alignSelf: "flex-start" }}
                        >
                            {deleteTask.name}
                        </Badge>
                    )}

                    <Group justify="flex-end">
                        <Button
                            variant="default"
                            onClick={() => setDeleteTask(null)}
                        >
                            Mégse
                        </Button>

                        <Button
                            color="red"
                            onClick={() => {
                                void handleConfirmDeleteTask();
                            }}
                        >
                            Törlés
                        </Button>
                    </Group>
                </Stack>
            </Modal>

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
                        <Alert color="red" title="Nincs útvonalgráf">
                            Előbb generálni kell a gráfot, hogy feladatot lehessen
                            felvenni.
                        </Alert>
                    )}

                    {!snapshot.hasLayout && (
                        <Alert color="yellow" title="Nincs aktív layout">
                            A layout store jelenleg nem tartalmaz pályát.
                        </Alert>
                    )}

                    {formError && (
                        <Alert color="red" title="Feladat nem vehető fel">
                            {formError}
                        </Alert>
                    )}

                    {actionError && (
                        <Alert color="red" title="Művelet nem hajtható végre">
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
                        <Group justify="space-between" align="center">
                            <Group gap="xs">
                                <Text fw={700}>Feladatok</Text>

                                <Badge variant="light">
                                    {snapshot.tasks.length} db
                                </Badge>
                            </Group>

                            <Group gap="xs">
                                <Button
                                    size="xs"
                                    leftSection={<IconPlus size={16} />}
                                    onClick={() => setAddTaskOpened(true)}
                                >
                                    Add task
                                </Button>

                                
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="green"
                                    leftSection={<IconPlayerPlay size={16} />}
                                    onClick={() => {
                                        void handleStartAllTasks();
                                    }}
                                    disabled={snapshot.tasks.length === 0}
                                >
                                    Start all
                                </Button>

                                <Button
                                    size="xs"
                                    variant="light"
                                    color="orange"
                                    leftSection={<IconCheck size={16} />}
                                    onClick={() => {
                                        void handleFinishAllTasks();
                                    }}
                                    disabled={!snapshot.tasks.some(task =>
                                        task.status === "running" ||
                                        task.status === "paused"
                                    )}
                                >
                                    Finish all
                                </Button>

                                <Button
                                    size="xs"
                                    variant="light"
                                    color="red"
                                    leftSection={<IconPlayerStop size={16} />}
                                    onClick={() => {
                                        void handleAbortAllTasks();
                                    }}
                                    disabled={!snapshot.tasks.some(task =>
                                        task.status === "running" ||
                                        task.status === "paused" ||
                                        task.status === "finishing"
                                    )}
                                >
                                    Abort all
                                </Button>

<Button
                                    size="xs"
                                    variant="light"
                                    color="blue"
                                    onClick={() => {
                                        void handleLoadTasks();
                                    }}
                                >
                                    Load
                                </Button>

                                <Button
                                    size="xs"
                                    variant="light"
                                    color="green"
                                    onClick={() => {
                                        void handleSaveTasks();
                                    }}
                                >
                                    Save
                                </Button>
                            </Group>
                        </Group>

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
                                {snapshot.tasks.length > 0 ? (
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

                                            <Table.Tbody>{taskRows}</Table.Tbody>
                                        </Table>
                                    </ScrollArea>
                                ) : (
                                    <Text c="dimmed">
                                        Még nincs felvett feladat.
                                    </Text>
                                )}
                            </Card>

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
                                        <Text fw={800}>Task steps</Text>

                                        <Text size="sm" c="dimmed">
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
                                        renderTaskSteps(selectedTask)
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
                                            <Text c="dimmed" ta="center">
                                                Válassz egy feladatot a táblázatból.
                                            </Text>
                                        </Card>
                                    )}
                                </ScrollArea>
                            </Card>
                        </div>
                    </Stack>
                </Stack>
            </AppModal>
        </>
    );
}

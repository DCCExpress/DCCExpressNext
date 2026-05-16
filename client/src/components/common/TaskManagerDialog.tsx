import {
    ActionIcon,
    Alert,
    Badge,
    Button,
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
    IconPlus,
    IconTrash,
} from "@tabler/icons-react";
import { useMemo, useState, type ReactNode } from "react";

import AppModal from "./AppModal";

import type {
    BlockRouteSolution,
    RunnableBlockTransition,
} from "../../models/editor/core/Graph";
import { useTaskManager } from "../../services/tasks/useTaskManager";
import { routeGraphStore } from "../../services/routeGraphStore";
import { taskManager } from "../../services/tasks/taskManagerSingleton";
import type {
    TrainTask,
    TrainTaskStatus,
} from "../../services/tasks/TaskTypes";
import {
    showErrorMessage,
    showOkMessage,
    showWarningMessage,
} from "../../helpers";

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
    const [locoAddress, setLocoAddress] = useState<number | string>(3);
    const [targetSpeed, setTargetSpeed] = useState<number | string>(40);

    const [fromBlockId, setFromBlockId] = useState<string | null>(null);
    const [toBlockId, setToBlockId] = useState<string | null>(null);

    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [deleteTask, setDeleteTask] = useState<TrainTask | null>(null);

    const graph = routeGraphStore.getGraph();

    const runnableTransitions = useMemo(() => {
        return graph?.getRunnableBlockTransitions() ?? [];
    }, [graph, snapshot.hasGraph]);

    const fromBlockSelectData = useMemo(() => {
        const map = new Map<string, string>();

        for (const transition of runnableTransitions) {
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
    }, [runnableTransitions]);

    const toBlockSelectData = useMemo(() => {
        const filtered = fromBlockId
            ? runnableTransitions.filter(
                transition => transition.fromBlock.id === fromBlockId
            )
            : runnableTransitions;

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
    }, [runnableTransitions, fromBlockId]);

    const selectedTransition = useMemo<RunnableBlockTransition | null>(() => {
        if (!fromBlockId || !toBlockId) {
            return null;
        }

        return (
            runnableTransitions.find(
                transition =>
                    transition.fromBlock.id === fromBlockId &&
                    transition.toBlock.id === toBlockId
            ) ?? null
        );
    }, [runnableTransitions, fromBlockId, toBlockId]);

    const handleFromBlockChange = (value: string | null) => {
        setFromBlockId(value);
        setToBlockId(null);
        setFormError(null);
    };

    const handleAddTask = () => {
        setFormError(null);
        setActionError(null);

        if (!fromBlockId || !toBlockId) {
            setFormError("Válassz induló és cél blokkot.");
            return;
        }

        if (typeof locoAddress !== "number" || locoAddress <= 0) {
            setFormError("Adj meg érvényes mozdony címet.");
            return;
        }

        if (typeof targetSpeed !== "number" || targetSpeed < 0) {
            setFormError("Adj meg érvényes célsebességet.");
            return;
        }

        const trimmedTaskName = taskName.trim();

        const result = taskManager.addTask({
            ...(trimmedTaskName ? { name: trimmedTaskName } : {}),
            locoAddress,
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
    };

    const runTaskAction = (
        action: () => { ok: true } | { ok: false; error: string }
    ) => {
        setActionError(null);

        const result = action();

        if (!result.ok) {
            setActionError(result.error);
        }
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

    const handleConfirmDeleteTask = () => {
        if (!deleteTask) {
            return;
        }

        const result = taskManager.removeTask(deleteTask.id);

        if (!result.ok) {
            setActionError(result.error);
            showErrorMessage("ERROR", result.error);
            return;
        }

        setDeleteTask(null);
    };

    function getStatusColor(status: TrainTaskStatus): string {
        switch (status) {
            case "queued":
                return "gray";
            case "running":
                return "green";
            case "paused":
                return "yellow";
            case "stopped":
                return "red";
            case "completed":
                return "blue";
            case "error":
                return "red";
        }
    }

    function getStatusLabel(status: TrainTaskStatus): string {
        switch (status) {
            case "queued":
                return "Queued";
            case "running":
                return "Running";
            case "paused":
                return "Paused";
            case "stopped":
                return "Stopped";
            case "completed":
                return "Completed";
            case "error":
                return "Error";
        }
    }

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
        const firstItem = solution.path[0];
        const lastItem = solution.path[solution.path.length - 1];

        const segmentItems = solution.path.filter(
            item => item.type === "segment"
        );

        const firstSegment = segmentItems[0];
        const lastSegment = segmentItems[segmentItems.length - 1];

        if (
            !firstItem ||
            firstItem.type !== "block" ||
            !lastItem ||
            lastItem.type !== "block" ||
            !firstSegment ||
            !lastSegment
        ) {
            return null;
        }

        const middleSegments = segmentItems.slice(1, -1);

        const items: ReactNode[] = [];

        items.push(
            <Badge
                key={`from-block-${firstItem.block.id}-${firstSegment.node.name}`}
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
                <span>{firstItem.block.name}</span>

                <Badge
                    size="xs"
                    color="gray"
                    variant="filled"
                    radius="sm"
                >
                    {firstSegment.node.name}
                </Badge>
            </Badge>
        );

        for (const segment of middleSegments) {
            items.push(
                <Badge
                    key={`middle-segment-${segment.node.name}`}
                    size={badgeSize}
                    color="gray"
                    variant="light"
                >
                    {segment.node.name}
                </Badge>
            );
        }

        items.push(
            <Badge
                key={`to-block-${lastItem.block.id}-${lastSegment.node.name}`}
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
                <span>{lastItem.block.name}</span>

                <Badge
                    size="xs"
                    color="gray"
                    variant="filled"
                    radius="sm"
                >
                    {lastSegment.node.name}
                </Badge>
            </Badge>
        );

        return (
            <Group gap="xs" wrap="wrap">
                {items.map((item, index) => (
                    <Group key={`task-route-item-${index}`} gap="xs">
                        {item}

                        {index < items.length - 1 && (
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
                                    runTaskAction(() =>
                                        taskManager.startTask(task.id)
                                    )
                                }
                            >
                                <IconPlayerPlay size={18} />
                            </ActionIcon>
                        </Tooltip>

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
                                    runTaskAction(() =>
                                        taskManager.pauseTask(task.id)
                                    )
                                }
                            >
                                <IconPlayerPause size={18} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Stop">
                            <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() =>
                                    runTaskAction(() =>
                                        taskManager.stopTask(task.id)
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
                                    runTaskAction(() =>
                                        taskManager.resumeTask(task.id)
                                    )
                                }
                            >
                                <IconPlayerPlay size={18} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Stop">
                            <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() =>
                                    runTaskAction(() =>
                                        taskManager.stopTask(task.id)
                                    )
                                }
                            >
                                <IconPlayerStop size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                );

            case "stopped":
                return (
                    <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Start again">
                            <ActionIcon
                                color="green"
                                variant="light"
                                onClick={() =>
                                    runTaskAction(() =>
                                        taskManager.startTask(task.id)
                                    )
                                }
                            >
                                <IconPlayerPlay size={18} />
                            </ActionIcon>
                        </Tooltip>

                        {renderDeleteButton(task)}
                    </Group>
                );

            case "completed":
            case "error":
                return renderDeleteButton(task);
        }
    }

    const taskRows = snapshot.tasks.map((task, index) => (
        <Table.Tr key={task.id}>
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
                <Badge color="indigo" variant="light">
                    Loco {task.locoAddress}
                </Badge>
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
                    color={getStatusColor(task.status)}
                    variant="light"
                >
                    {getStatusLabel(task.status)}
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
                            onClick={handleConfirmDeleteTask}
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

                    <Stack gap="sm">
                        <Text fw={700}>Új feladat</Text>

                        <Group grow align="end">
                            <TextInput
                                label="Task name"
                                placeholder="Pl. B1 → C1"
                                value={taskName}
                                onChange={event =>
                                    setTaskName(event.currentTarget.value)
                                }
                            />

                            <NumberInput
                                label="Loco address"
                                value={locoAddress}
                                onChange={setLocoAddress}
                                min={1}
                                hideControls={false}
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

                        <Group grow align="end">
                            <Select
                                label="From block"
                                placeholder="Induló blokk"
                                data={fromBlockSelectData}
                                value={fromBlockId}
                                onChange={handleFromBlockChange}
                                searchable
                                clearable
                                disabled={!snapshot.hasGraph}
                            />

                            <Select
                                label="To block"
                                placeholder="Cél blokk"
                                data={toBlockSelectData}
                                value={toBlockId}
                                onChange={value => {
                                    setToBlockId(value);
                                    setFormError(null);
                                }}
                                searchable
                                clearable
                                disabled={!snapshot.hasGraph || !fromBlockId}
                            />

                            <Button
                                leftSection={<IconPlus size={18} />}
                                onClick={handleAddTask}
                                disabled={!snapshot.hasGraph}
                            >
                                Add task
                            </Button>
                        </Group>

                        {selectedTransition && (
                            <Stack gap="xs">
                                <Text size="sm" fw={600}>
                                    Kiválasztott végrehajtható blokkátmenet
                                </Text>

                                {renderBlockRoutePath(
                                    selectedTransition.solution,
                                    "md"
                                )}

                                <Group gap="xs">
                                    <Badge
                                        color={
                                            selectedTransition.solution.locoDirection ===
                                                "forward"
                                                ? "green"
                                                : selectedTransition.solution
                                                    .locoDirection === "reverse"
                                                    ? "orange"
                                                    : "gray"
                                        }
                                        variant="light"
                                    >
                                        {selectedTransition.solution.locoDirection.toUpperCase()}
                                    </Badge>

                                    {renderTurnoutRequirementBadges(
                                        selectedTransition.solution.turnoutStates
                                    )}
                                </Group>
                            </Stack>
                        )}
                    </Stack>

                    <Divider />

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
                    </Stack>
                </Stack>
            </AppModal>
        </>
    );
}
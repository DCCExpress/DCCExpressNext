import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rel = "client/src/components/common/TaskManagerDialog.tsx";
const fn = path.join(root, rel);

if (!fs.existsSync(fn)) {
  console.error(`Missing file: ${rel}`);
  process.exit(1);
}

let text = fs.readFileSync(fn, "utf8");

function ok(label) {
  console.log(`✓ ${label}`);
}

function skip(label) {
  console.log(`• ${label}: already OK / not present`);
}

function mustRegex(label, regex, replacement) {
  const next = text.replace(regex, replacement);

  if (next === text) {
    throw new Error(`Could not patch: ${label}`);
  }

  text = next;
  ok(label);
}

function optionalRegex(label, regex, replacement) {
  const next = text.replace(regex, replacement);

  if (next === text) {
    skip(label);
    return;
  }

  text = next;
  ok(label);
}

try {
  if (!/\bIconPencil\b/.test(text)) {
    mustRegex(
      "TaskManagerDialog: import IconPencil",
      /(import\s*\{[\s\S]*?\bIconPlus,\s*)([\s\S]*?\}\s*from\s*"@tabler\/icons-react";)/m,
      `$1    IconPencil,\n$2`
    );
  } else {
    skip("TaskManagerDialog: IconPencil import");
  }

  if (!text.includes("const [editTask, setEditTask]")) {
    mustRegex(
      "TaskManagerDialog: add edit state",
      /(\s*const \[deleteTask,\s*setDeleteTask\]\s*=\s*useState<TrainTask \| null>\(null\);\s*)/,
      `$1
    const [editTask, setEditTask] = useState<TrainTask | null>(null);
    const [editTaskName, setEditTaskName] = useState("");
    const [editTargetSpeed, setEditTargetSpeed] = useState<number | string>(40);
    const [editFromBlockId, setEditFromBlockId] = useState<string | null>(null);
    const [editToBlockId, setEditToBlockId] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
`
    );
  } else {
    skip("TaskManagerDialog: edit state");
  }

  if (!text.includes("const editToBlockSelectData = useMemo")) {
    mustRegex(
      "TaskManagerDialog: add edit to-block select data",
      /(\s*const selectedTransition = useMemo<RunnableBlockTransition \| null>\(\(\) => \{)/m,
      `
    const editToBlockSelectData = useMemo(() => {
        const filtered = editFromBlockId
            ? runnableTransitions.filter(
                transition => transition.fromBlock.id === editFromBlockId
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
    }, [runnableTransitions, editFromBlockId]);

$1`
    );
  } else {
    skip("TaskManagerDialog: edit to-block select data");
  }

  if (!text.includes("const openEditTask = (task: TrainTask) =>")) {
    mustRegex(
      "TaskManagerDialog: add edit handlers",
      /(\s*const handleSaveTasks = async \(\) => \{)/m,
      `
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

$1`
    );
  } else {
    skip("TaskManagerDialog: edit handlers");
  }

  if (!text.includes("function renderEditButton(task: TrainTask)")) {
    mustRegex(
      "TaskManagerDialog: add edit button renderer",
      /(\s*function renderDeleteButton\(task: TrainTask\) \{)/m,
      `
    function renderEditButton(task: TrainTask) {
        const disabled =
            task.status === "running" ||
            task.status === "paused";

        return (
            <Tooltip
                label={
                    disabled
                        ? "Futó vagy szüneteltetett task nem módosítható"
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

$1`
    );
  } else {
    skip("TaskManagerDialog: edit button renderer");
  }

  if (!text.includes("{renderEditButton(task)}")) {
    optionalRegex(
      "TaskManagerDialog: add edit beside delete buttons",
      /(\s*)\{renderDeleteButton\(task\)\}/g,
      `$1{renderEditButton(task)}

$1{renderDeleteButton(task)}`
    );
  } else {
    skip("TaskManagerDialog: edit buttons already inserted");
  }

  if (
    text.includes(`case "completed":
            case "error":
                return renderDeleteButton(task);`)
  ) {
    text = text.replace(
      `case "completed":
            case "error":
                return renderDeleteButton(task);`,
      `case "completed":
            case "error":
                return (
                    <Group gap="xs" wrap="nowrap">
                        {renderEditButton(task)}
                        {renderDeleteButton(task)}
                    </Group>
                );`
    );
    ok("TaskManagerDialog: completed/error controls include edit button");
  } else {
    skip("TaskManagerDialog: completed/error edit controls");
  }

  if (!text.includes('title="Feladat szerkesztése"')) {
    mustRegex(
      "TaskManagerDialog: add edit modal",
      /(\s*<Modal\s*\n\s*opened=\{deleteTask !== null\})/m,
      `
            <Modal
                opened={editTask !== null}
                onClose={() => setEditTask(null)}
                title="Feladat szerkesztése"
                centered
                size="lg"
                zIndex={10000}
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
                            onChange={handleEditFromBlockChange}
                            searchable
                            clearable
                        />

                        <Select
                            label="To block"
                            placeholder="Cél blokk"
                            data={editToBlockSelectData}
                            value={editToBlockId}
                            onChange={value => {
                                setEditToBlockId(value);
                                setEditError(null);
                            }}
                            searchable
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

$1`
    );
  } else {
    skip("TaskManagerDialog: edit modal");
  }

  fs.writeFileSync(fn, text, "utf8");

  console.log("");
  console.log("TaskManager dialog editing v8 applied.");
  console.log("Now run: npm run build");
} catch (error) {
  console.error("");
  console.error("Fix script failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

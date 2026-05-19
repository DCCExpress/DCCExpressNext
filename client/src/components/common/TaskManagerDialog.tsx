// client/src/components/common/TaskManagerDialog.tsx

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

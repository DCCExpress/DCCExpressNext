// client/src/components/control-panel/controller/TaskListCard.tsx

import {
  Badge,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";

import type {
  TaskManagerSnapshot,
} from "../../../services/tasks/TaskTypes";

import {
  showErrorMessage,
} from "../../../helpers";

import {
  taskManager,
} from "../../../services/tasks/taskManagerSingleton";

import CollapsiblePanelCard from "../../common/CollapsiblePanelCard";
import TaskListItemCard from "./TaskListItemCard";

const TASK_LIST_COLLAPSED_KEY =
  "dcc-express.controller.task-list.collapsed";

type TaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

type TaskListCardProps = {
  snapshot: TaskManagerSnapshot;
};

export default function TaskListCard({
  snapshot,
}: TaskListCardProps) {
  const runTaskAction = async (
    action: () => Promise<TaskActionResult>
  ): Promise<void> => {
    const result =
      await action();

    if (!result.ok) {
      showErrorMessage(
        "ERROR",
        result.error
      );
    }
  };

  return (
    <CollapsiblePanelCard
      title="Task list"
      collapsedStorageKey={
        TASK_LIST_COLLAPSED_KEY
      }
      expandTooltip="Expand task list"
      collapseTooltip="Collapse task list"
      rightSection={
        <Badge variant="light">
          {snapshot.tasks.length} task
        </Badge>
      }
    >
      <ScrollArea.Autosize
        mah="calc(100vh - 420px)"
        type="auto"
        offsetScrollbars
      >
        {snapshot.tasks.length === 0 ? (
          <Text
            size="sm"
            c="dimmed"
          >
            Nincs aktív vagy felvett feladat.
          </Text>
        ) : (
          <Stack gap="sm">
            {snapshot.tasks.map(task => (
              <TaskListItemCard
                key={task.id}
                task={task}
                onStart={() =>
                  taskManager.startTask(task.id)
                }
                onPause={() =>
                  taskManager.pauseTask(task.id)
                }
                onResume={() =>
                  taskManager.resumeTask(task.id)
                }
                onFinish={() =>
                  taskManager.finishTask(task.id)
                }
                onAbort={() =>
                  taskManager.abortTask(task.id)
                }
                onRunTaskAction={action => {
                  void runTaskAction(action);
                }}
              />
            ))}
          </Stack>
        )}
      </ScrollArea.Autosize>
    </CollapsiblePanelCard>
  );
}

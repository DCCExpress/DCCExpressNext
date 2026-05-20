// client/src/components/control-panel/controller/RouteTaskControlCard.tsx

import {
  useState,
} from "react";

import {
  Badge,
  Button,
  Group,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

import {
  IconCheck,
  IconPlayerPlay,
  IconPlayerStop,
  IconRoute,
} from "@tabler/icons-react";

import type {
  TaskManagerSnapshot,
} from "../../../services/tasks/TaskTypes";

import {
  showErrorMessage,
  showOkMessage,
} from "../../../helpers";

import {
  wsApi,
} from "../../../services/wsApi";

import {
  taskManager,
} from "../../../services/tasks/taskManagerSingleton";

import CollapsiblePanelCard from "../../common/CollapsiblePanelCard";

const ROUTE_TASK_CONTROL_COLLAPSED_KEY =
  "dcc-express.controller.route-task-control.collapsed";

type RouteTaskControlCardProps = {
  snapshot: TaskManagerSnapshot;
  onOpenTaskManager: () => void;
};

export default function RouteTaskControlCard({
  snapshot,
  onOpenTaskManager,
}: RouteTaskControlCardProps) {
  const { t } = useTranslation();
  const [fromBlockName, setFromBlockName] =
    useState("A1");

  const [toBlockName, setToBlockName] =
    useState("C1");

  const handleStartAllTasks = async (): Promise<void> => {
    const result =
      await taskManager.startAllTasks();

    if (!result.ok) {
      showErrorMessage(t("common.error"), result.error);
      return;
    }

    showOkMessage(
      t("common.success"),
      t("routeTask.allStarted")
    );
  };

  const handleFinishAllTasks = async (): Promise<void> => {
    const result =
      await taskManager.finishAllTasks();

    if (!result.ok) {
      showErrorMessage(t("common.error"), result.error);
      return;
    }

    showOkMessage(
      t("common.success"),
      t("routeTask.allFinishing")
    );
  };

  const handleAbortAllTasks = async (): Promise<void> => {
    const result =
      await taskManager.abortAllTasks();

    if (!result.ok) {
      showErrorMessage(t("common.error"), result.error);
      return;
    }

    showOkMessage(
      t("common.success"),
      t("routeTask.allAborted")
    );
  };

  const handleReserveRoute = (): void => {
    const from =
      fromBlockName.trim();

    const to =
      toBlockName.trim();

    if (!from || !to) {
      return;
    }

    wsApi.reserveRoute(from, to);
  };

  const handleReleaseRoute = (): void => {
    const from =
      fromBlockName.trim();

    const to =
      toBlockName.trim();

    if (!from || !to) {
      return;
    }

    wsApi.releaseRouteReservation(from, to);
  };

  const handleClearAllBusy = (): void => {
    wsApi.clearAllRouteReservations();
  };

  return (
    <CollapsiblePanelCard
      title={t("routeTask.title")}
      collapsedStorageKey={
        ROUTE_TASK_CONTROL_COLLAPSED_KEY
      }
      expandTooltip={t("routeTask.expand")}
      collapseTooltip={t("routeTask.collapse")}
      rightSection={
        <Badge variant="light">
          {snapshot.tasks.length} {t("task.list.count")}
        </Badge>
      }
    >
      <Group
        align="end"
        gap="xs"
      >
        <TextInput
          label={t("task.form.fromBlock")}
          value={fromBlockName}
          onChange={event =>
            setFromBlockName(
              event.currentTarget.value
            )
          }
          placeholder={t("routeTask.fromPlaceholder")}
          w={120}
        />

        <TextInput
          label={t("task.form.toBlock")}
          value={toBlockName}
          onChange={event =>
            setToBlockName(
              event.currentTarget.value
            )
          }
          placeholder={t("routeTask.toPlaceholder")}
          w={120}
        />

        <Button
          color="orange"
          variant="light"
          onClick={handleReserveRoute}
        >
          Set route
        </Button>

        <Button
          color="gray"
          variant="light"
          onClick={handleReleaseRoute}
        >
          Release route
        </Button>

        <Button
          color="gray"
          variant="light"
          onClick={handleClearAllBusy}
        >
          Clear all busy
        </Button>
      </Group>

      <Group grow>
        <Button
          size="xs"
          variant="light"
          color="violet"
          leftSection={<IconRoute size={16} />}
          onClick={onOpenTaskManager}
        >
          Task Manager...
        </Button>

        <Button
          size="xs"
          variant="light"
          color="green"
          leftSection={
            <IconPlayerPlay size={16} />
          }
          onClick={() => {
            void handleStartAllTasks();
          }}
          disabled={snapshot.tasks.length === 0}
        >
          Start all tasks
        </Button>

        <Button
          size="xs"
          variant="light"
          color="orange"
          leftSection={<IconCheck size={16} />}
          onClick={() => {
            void handleFinishAllTasks();
          }}
          disabled={
            !snapshot.tasks.some(task =>
              task.status === "running" ||
              task.status === "paused"
            )
          }
        >
          Finish all tasks
        </Button>

        <Button
          size="xs"
          variant="light"
          color="red"
          leftSection={
            <IconPlayerStop size={16} />
          }
          onClick={() => {
            void handleAbortAllTasks();
          }}
          disabled={
            !snapshot.tasks.some(task =>
              task.status === "running" ||
              task.status === "paused" ||
              task.status === "finishing"
            )
          }
        >
          Abort all tasks
        </Button>
      </Group>
    </CollapsiblePanelCard>
  );
}

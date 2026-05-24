// client/src/components/control-panel/controller/RouteTaskControlCard.tsx

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Select,
  Tooltip,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipForward,
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

import {
  useRouteGraph,
} from "../../../hooks/useRouteGraph";

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

  const {
    graph,
    ensureLoaded,
  } = useRouteGraph();

  const [fromBlockName, setFromBlockName] =
    useState<string | null>(null);

  const [toBlockName, setToBlockName] =
    useState<string | null>(null);

  useEffect(() => {
    void ensureLoaded().catch(error => {
      console.error(
        "[RouteTaskControl] Could not load route graph:",
        error
      );
    });
  }, []);

  const blockOptions =
    useMemo(() => {
      const blockNames =
        new Set<string>();

      for (const node of graph?.nodes ?? []) {
        for (const block of node.blocks) {
          const name =
            block.name.trim();

          if (name.length > 0) {
            blockNames.add(name);
          }
        }
      }

      return [...blockNames]
        .sort((a, b) => a.localeCompare(b))
        .map(name => ({
          value: name,
          label: name,
        }));
    }, [graph]);

  useEffect(() => {
    const availableBlockNames =
      new Set(
        blockOptions.map(option => option.value)
      );

    setFromBlockName(current =>
      current && availableBlockNames.has(current)
        ? current
        : null
    );

    setToBlockName(current =>
      current && availableBlockNames.has(current)
        ? current
        : null
    );
  }, [blockOptions]);

  const hasRunningTasks =
    snapshot.tasks.some(task => task.status === "running");

  const hasPausableOrFinishableTasks =
    snapshot.tasks.some(task =>
      task.status === "running" ||
      task.status === "paused"
    );

  const hasActiveTasks =
    snapshot.tasks.some(task =>
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing"
    );

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

  const handlePauseAllTasks = async (): Promise<void> => {
    const result =
      await taskManager.pauseAllTasks();

    if (!result.ok) {
      showErrorMessage(t("common.error"), result.error);
      return;
    }

    showOkMessage(
      t("common.success"),
      t("routeTask.allPaused", { defaultValue: "All tasks paused." })
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
      fromBlockName?.trim() ?? "";

    const to =
      toBlockName?.trim() ?? "";

    if (!from || !to) {
      return;
    }

    wsApi.reserveRoute(from, to);
  };

  const handleReleaseRoute = (): void => {
    const from =
      fromBlockName?.trim() ?? "";

    const to =
      toBlockName?.trim() ?? "";

    if (!from || !to) {
      return;
    }

    wsApi.releaseRouteReservation(from, to);
  };

  const handleClearAllBusy = (): void => {
    wsApi.clearAllRouteReservations();
  };

  const routeSelectionDisabled =
    blockOptions.length === 0;

  const routeActionDisabled =
    !fromBlockName ||
    !toBlockName ||
    routeSelectionDisabled;

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
        <Select
          label={t("task.form.fromBlock")}
          value={fromBlockName}
          onChange={setFromBlockName}
          data={blockOptions}
          placeholder={t("task.form.fromPlaceholder")}
          nothingFoundMessage={t("routesPanel.noBlocks")}
          disabled={routeSelectionDisabled}
          clearable
          w={140}
        />

        <Select
          label={t("task.form.toBlock")}
          value={toBlockName}
          onChange={setToBlockName}
          data={blockOptions}
          placeholder={t("task.form.toPlaceholder")}
          nothingFoundMessage={t("routesPanel.noBlocks")}
          disabled={routeSelectionDisabled}
          clearable
          w={140}
        />

        <Button
          color="orange"
          variant="light"
          onClick={handleReserveRoute}
          disabled={routeActionDisabled}
        >
          {t("routeTask.setRoute")}
        </Button>

        <Button
          color="gray"
          variant="light"
          onClick={handleReleaseRoute}
          disabled={routeActionDisabled}
        >
          {t("routeTask.releaseRoute")}
        </Button>

        <Button
          color="gray"
          variant="light"
          onClick={handleClearAllBusy}
        >
          {t("routeTask.clearAllBusy")}
        </Button>
      </Group>

      <Group gap="xs">
        <RouteTaskActionButton
          tooltip={t("routeTask.taskManager")}
          color="violet"
          onClick={onOpenTaskManager}
        >
          <IconRoute size={16} />
        </RouteTaskActionButton>

        <RouteTaskActionButton
          tooltip={t("routeTask.startAll")}
          color="green"
          onClick={() => {
            void handleStartAllTasks();
          }}
          disabled={snapshot.tasks.length === 0}
        >
          <IconPlayerPlay size={16} />
        </RouteTaskActionButton>

        <RouteTaskActionButton
          tooltip={t("routeTask.allPaused", { defaultValue: "Pause all running tasks" })}
          color="yellow"
          onClick={() => {
            void handlePauseAllTasks();
          }}
          disabled={!hasRunningTasks}
        >
          <IconPlayerPause size={16} />
        </RouteTaskActionButton>

        <RouteTaskActionButton
          tooltip={t("routeTask.finishAll")}
          color="orange"
          onClick={() => {
            void handleFinishAllTasks();
          }}
          disabled={!hasPausableOrFinishableTasks}
        >
          <IconPlayerSkipForward size={16} />
        </RouteTaskActionButton>

        <RouteTaskActionButton
          tooltip={t("routeTask.abortAll")}
          color="red"
          onClick={() => {
            void handleAbortAllTasks();
          }}
          disabled={!hasActiveTasks}
        >
          <IconPlayerStop size={16} />
        </RouteTaskActionButton>
      </Group>
    </CollapsiblePanelCard>
  );
}

type RouteTaskActionButtonProps = {
  tooltip: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function RouteTaskActionButton({
  tooltip,
  color,
  disabled = false,
  onClick,
  children,
}: RouteTaskActionButtonProps) {
  return (
    <Tooltip label={tooltip} withArrow>
      <ActionIcon
        size="sm"
        variant="light"
        color={color}
        disabled={disabled}
        onClick={onClick}
        aria-label={tooltip}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}

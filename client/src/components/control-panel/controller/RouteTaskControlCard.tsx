// client/src/components/control-panel/controller/RouteTaskControlCard.tsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Button,
  Group,
  Select,
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

      <Group grow>
        <Button
          size="xs"
          variant="light"
          color="violet"
          leftSection={<IconRoute size={16} />}
          onClick={onOpenTaskManager}
        >
          {t("routeTask.taskManager")}
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
          {t("routeTask.startAll")}
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
          {t("routeTask.finishAll")}
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
          {t("routeTask.abortAll")}
        </Button>
      </Group>
    </CollapsiblePanelCard>
  );
}

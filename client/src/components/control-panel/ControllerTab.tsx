// client/src/components/control-panel/ControllerTab.tsx

import {
  useState,
} from "react";

import {
  Stack,
} from "@mantine/core";

import {
  useTaskManager,
} from "../../services/tasks/useTaskManager";

import TaskManagerDialog from "../common/TaskManagerDialog";
import FastClockCard from "../common/FastClockCard";

import RouteTaskControlCard from "./controller/RouteTaskControlCard";
import TaskListCard from "./controller/TaskListCard";

export default function ControllerTab() {
  const snapshot =
    useTaskManager();

  const [taskManagerOpened, setTaskManagerOpened] =
    useState(false);

  return (
    <>
      <TaskManagerDialog
        opened={taskManagerOpened}
        onClose={() => setTaskManagerOpened(false)}
      />

      <Stack gap="sm">
        <FastClockCard />

        <RouteTaskControlCard
          snapshot={snapshot}
          onOpenTaskManager={() => setTaskManagerOpened(true)}
        />

        <TaskListCard
          snapshot={snapshot}
        />
      </Stack>
    </>
  );
}

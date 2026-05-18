import {
  useEffect,
  useState,
} from "react";

import { taskManager } from "./taskManagerSingleton";

import type {
  TaskManagerSnapshot,
} from "./TaskTypes";

export function useTaskManager(): TaskManagerSnapshot {
  const [snapshot, setSnapshot] =
    useState<TaskManagerSnapshot>(() =>
      taskManager.getSnapshot()
    );

  useEffect(() => {
    const unsubscribe =
      taskManager.subscribe(() => {
        setSnapshot(
          taskManager.getSnapshot()
        );
      });

    void taskManager.loadTasks();

    return unsubscribe;
  }, []);

  return snapshot;
}

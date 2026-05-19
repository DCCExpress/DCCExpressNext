// client/src/hooks/layout/useLayoutHistory.ts

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import {
  Layout,
} from "../../models/editor/core/Layout";

import {
  routeGraphStore,
} from "../../services/routeGraphStore";

const DEFAULT_MAX_HISTORY = 100;

type LayoutSetter =
  Dispatch<SetStateAction<Layout>>;

type HistoryStackSetter =
  Dispatch<SetStateAction<string[]>>;

export type UseLayoutHistoryParams = {
  layoutRef: MutableRefObject<Layout>;
  setLayout: LayoutSetter;
  maxHistory?: number;
};

export type UseLayoutHistoryResult = {
  undoStack: string[];
  redoStack: string[];
  setUndoStack: HistoryStackSetter;
  setRedoStack: HistoryStackSetter;
  canUndo: boolean;
  canRedo: boolean;
  pushHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;
};

export function useLayoutHistory({
  layoutRef,
  setLayout,
  maxHistory = DEFAULT_MAX_HISTORY,
}: UseLayoutHistoryParams): UseLayoutHistoryResult {
  const [undoStack, setUndoStack] =
    useState<string[]>([]);

  const [redoStack, setRedoStack] =
    useState<string[]>([]);

  const createLayoutSnapshot = useCallback(
    (source: Layout): string => {
      return JSON.stringify(source);
    },
    []
  );

  const pushHistorySnapshot = useCallback((): void => {
    const snapshot =
      createLayoutSnapshot(layoutRef.current);

    setUndoStack(prev => {
      const last =
        prev[prev.length - 1];

      if (last === snapshot) {
        return prev;
      }

      const next =
        [...prev, snapshot];

      return next.length > maxHistory
        ? next.slice(next.length - maxHistory)
        : next;
    });

    setRedoStack([]);
  }, [
    createLayoutSnapshot,
    layoutRef,
    maxHistory,
  ]);

  const undo = useCallback((): void => {
    setUndoStack(prevUndo => {
      if (prevUndo.length === 0) {
        return prevUndo;
      }

      const currentSnapshot =
        createLayoutSnapshot(layoutRef.current);

      const previousSnapshot =
        prevUndo[prevUndo.length - 1];

      const restoredLayout =
        Layout.fromJSON(
          JSON.parse(previousSnapshot!)
        );

      setRedoStack(prevRedo => {
        const next =
          [...prevRedo, currentSnapshot];

        return next.length > maxHistory
          ? next.slice(next.length - maxHistory)
          : next;
      });

      setLayout(restoredLayout);
      routeGraphStore.clear();

      return prevUndo.slice(0, -1);
    });
  }, [
    createLayoutSnapshot,
    layoutRef,
    maxHistory,
    setLayout,
  ]);

  const redo = useCallback((): void => {
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) {
        return prevRedo;
      }

      const currentSnapshot =
        createLayoutSnapshot(layoutRef.current);

      const nextSnapshot =
        prevRedo[prevRedo.length - 1];

      const restoredLayout =
        Layout.fromJSON(
          JSON.parse(nextSnapshot!)
        );

      setUndoStack(prevUndo => {
        const next =
          [...prevUndo, currentSnapshot];

        return next.length > maxHistory
          ? next.slice(next.length - maxHistory)
          : next;
      });

      setLayout(restoredLayout);
      routeGraphStore.clear();

      return prevRedo.slice(0, -1);
    });
  }, [
    createLayoutSnapshot,
    layoutRef,
    maxHistory,
    setLayout,
  ]);

  useEffect(() => {
    const onHistoryKeys = (
      ev: KeyboardEvent
    ): void => {
      const key =
        ev.key.toLowerCase();

      if (
        ev.ctrlKey &&
        !ev.shiftKey &&
        key === "z"
      ) {
        ev.preventDefault();
        undo();
        return;
      }

      if (
        (ev.ctrlKey && key === "y") ||
        (
          ev.ctrlKey &&
          ev.shiftKey &&
          key === "z"
        )
      ) {
        ev.preventDefault();
        redo();
      }
    };

    window.addEventListener(
      "keydown",
      onHistoryKeys
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onHistoryKeys
      );
    };
  }, [redo, undo]);

  return {
    undoStack,
    redoStack,
    setUndoStack,
    setRedoStack,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    pushHistorySnapshot,
    undo,
    redo,
  };
}

// client/src/hooks/layout/useLayoutPageShortcuts.ts

import {
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  EditorTool,
} from "../../models/editor/types/EditorTypes";

type EditorToolSetter =
  Dispatch<SetStateAction<EditorTool>>;

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

export type UseLayoutPageShortcutsParams = {
  saveLayoutToServer: () => Promise<void>;
  setTool: EditorToolSetter;
  setEditMode: BooleanSetter;
};

export function useLayoutPageShortcuts({
  saveLayoutToServer,
  setTool,
  setEditMode,
}: UseLayoutPageShortcutsParams): void {
  useEffect(() => {
    const onKeyDown = (
      ev: KeyboardEvent
    ): void => {
      const isCtrl =
        ev.ctrlKey || ev.metaKey;

      if (
        isCtrl &&
        ev.key.toLowerCase() === "s"
      ) {
        ev.preventDefault();
        void saveLayoutToServer();
      }

      const target =
        ev.target as HTMLElement | null;

      const tagName =
        target?.tagName;

      const isTypingField =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable === true;

      if (isTypingField) {
        return;
      }

      if (ev.key === "Escape") {
        setTool({
          mode: "cursor",
          elementType: "general",
        });

        return;
      }

      if (
        ev.key.toLowerCase() === "e" &&
        !ev.ctrlKey &&
        !ev.altKey &&
        !ev.metaKey
      ) {
        ev.preventDefault();
        setEditMode(prev => !prev);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [
    saveLayoutToServer,
    setEditMode,
    setTool,
  ]);
}

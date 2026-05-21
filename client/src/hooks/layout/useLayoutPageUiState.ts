// client/src/hooks/layout/useLayoutPageUiState.ts

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  showWarningMessage,
} from "../../helpers";

import {
  wsApi,
} from "../../services/wsApi";

import {
  wsClient,
} from "../../services/wsClient";

const EDIT_MODE_KEY =
  "dcc-express.editor.editMode";

const LOCO_PANEL_COLLAPSED_KEY =
  "dcc-express.editor.locoPanelCollapsed";

const PROPERTY_PANEL_COLLAPSED_KEY =
  "dcc-express.editor.propertyPanelCollapsed";

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

export type UseLayoutPageUiStateResult = {
  editMode: boolean;
  setEditMode: BooleanSetter;
  locoPanelCollapsed: boolean;
  setLocoPanelCollapsed: BooleanSetter;
  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: BooleanSetter;
};

function readStoredBoolean(
  key: string,
  fallback: boolean
): boolean {
  try {
    const raw =
      localStorage.getItem(key);

    return raw === null
      ? fallback
      : raw === "true";
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(
  key: string,
  value: boolean
): void {
  try {
    localStorage.setItem(
      key,
      String(value)
    );
  } catch {
    // Storage unavailable; ignore.
  }
}

export function useLayoutPageUiState(): UseLayoutPageUiStateResult {
  const [
    editMode,
    setEditMode,
  ] =
    useState<boolean>(() =>
      readStoredBoolean(
        EDIT_MODE_KEY,
        false
      )
    );

  const [
    locoPanelCollapsed,
    setLocoPanelCollapsed,
  ] =
    useState<boolean>(() =>
      readStoredBoolean(
        LOCO_PANEL_COLLAPSED_KEY,
        false
      )
    );

  const [
    propertyPanelCollapsed,
    setPropertyPanelCollapsed,
  ] =
    useState<boolean>(() =>
      readStoredBoolean(
        PROPERTY_PANEL_COLLAPSED_KEY,
        false
      )
    );

  useEffect(() => {
    writeStoredBoolean(
      EDIT_MODE_KEY,
      editMode
    );

    wsApi.setEditorEditMode(editMode);

    return () => {
      if (editMode) {
        wsApi.setEditorEditMode(false);
      }
    };
  }, [editMode]);

  useEffect(() => {
    const unsubscribeEditModeRejected =
      wsClient.on(
        "editorEditModeRejected",
        data => {
          showWarningMessage(
            "Editor mode",
            data.reason
          );

          setEditMode(false);
        }
      );

    const unsubscribeTaskRejected =
      wsClient.on(
        "taskRejected",
        data => {
          showWarningMessage(
            "Task",
            data.reason
          );
        }
      );

    return () => {
      unsubscribeEditModeRejected();
      unsubscribeTaskRejected();
    };
  }, []);

  useEffect(() => {
    writeStoredBoolean(
      LOCO_PANEL_COLLAPSED_KEY,
      locoPanelCollapsed
    );
  }, [locoPanelCollapsed]);

  useEffect(() => {
    writeStoredBoolean(
      PROPERTY_PANEL_COLLAPSED_KEY,
      propertyPanelCollapsed
    );
  }, [propertyPanelCollapsed]);

  return {
    editMode,
    setEditMode,
    locoPanelCollapsed,
    setLocoPanelCollapsed,
    propertyPanelCollapsed,
    setPropertyPanelCollapsed,
  };
}

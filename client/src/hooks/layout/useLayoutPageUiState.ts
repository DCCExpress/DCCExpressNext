// client/src/hooks/layout/useLayoutPageUiState.ts

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslation } from "react-i18next";

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

const RIGHT_PANEL_MODE_KEY =
  "dcc-express.editor.rightPanelMode";

export type RightPanelMode =
  | "property"
  | "loco";

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

type RightPanelModeSetter =
  Dispatch<SetStateAction<RightPanelMode>>;

export type UseLayoutPageUiStateResult = {
  editMode: boolean;
  setEditMode: BooleanSetter;
  locoPanelCollapsed: boolean;
  setLocoPanelCollapsed: BooleanSetter;
  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: BooleanSetter;
  rightPanelMode: RightPanelMode;
  setRightPanelMode: RightPanelModeSetter;
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

function readStoredRightPanelMode(): RightPanelMode {
  try {
    const raw =
      localStorage.getItem(RIGHT_PANEL_MODE_KEY);

    return raw === "loco"
      ? "loco"
      : "property";
  } catch {
    return "property";
  }
}

function writeStoredRightPanelMode(
  value: RightPanelMode
): void {
  try {
    localStorage.setItem(
      RIGHT_PANEL_MODE_KEY,
      value
    );
  } catch {
    // Storage unavailable; ignore.
  }
}

export function useLayoutPageUiState(): UseLayoutPageUiStateResult {
  const { t } = useTranslation();

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

  const [
    rightPanelMode,
    setRightPanelMode,
  ] =
    useState<RightPanelMode>(() =>
      readStoredRightPanelMode()
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
            t("editor.mode"),
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
            t("task.title"),
            data.reason
          );
        }
      );

    return () => {
      unsubscribeEditModeRejected();
      unsubscribeTaskRejected();
    };
  }, [t]);

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

  useEffect(() => {
    writeStoredRightPanelMode(
      rightPanelMode
    );
  }, [rightPanelMode]);

  return {
    editMode,
    setEditMode,
    locoPanelCollapsed,
    setLocoPanelCollapsed,
    propertyPanelCollapsed,
    setPropertyPanelCollapsed,
    rightPanelMode,
    setRightPanelMode,
  };
}

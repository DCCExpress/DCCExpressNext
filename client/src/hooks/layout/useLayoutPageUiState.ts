// client/src/hooks/layout/useLayoutPageUiState.ts

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  useRuntimeVariable,
} from "../useRuntimeVariable";

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
  /**
   * Server-authoritative shared runtime state.
   *
   * A kliens csak kérést küld, a tényleges érték akkor frissül,
   * amikor a szerver runtimeVariableChanged üzenettel visszaigazolja.
   */
  const [
    editMode,
    setEditMode,
  ] =
    useRuntimeVariable("editor.editMode");

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

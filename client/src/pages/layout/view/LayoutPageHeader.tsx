import {
  ActionIcon,
  AppShell,
  Box,
} from "@mantine/core";

import {
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  EditorTool,
} from "../../../models/editor/types/EditorTypes";

import TopMenuBar from "../../../layout/TopMenuBar";

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

type EditorToolSetter =
  Dispatch<SetStateAction<EditorTool>>;

type LayoutPageHeaderProps = {
  onGoHome: () => void;

  toolbarOpened: boolean;
  setToolbarOpened: BooleanSetter;

  editMode: boolean;
  setEditMode: BooleanSetter;

  locoPanelCollapsed: boolean;
  setLocoPanelCollapsed: BooleanSetter;

  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: BooleanSetter;

  tool: EditorTool;
  setTool: EditorToolSetter;

  setLocoDialogOpened: BooleanSetter;
  setBlockActionsDialogOpened: BooleanSetter;
  setPickerOpened: BooleanSetter;

  saveLayoutToServer: () => Promise<void>;
  loadLayoutFromServer: () => Promise<void>;

  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  onOpenAppSettingsDialog: () => void;
  onFitLayout: () => void;
};

export default function LayoutPageHeader({
  onGoHome,

  toolbarOpened,
  setToolbarOpened,

  editMode,
  setEditMode,

  locoPanelCollapsed,
  setLocoPanelCollapsed,

  propertyPanelCollapsed,
  setPropertyPanelCollapsed,

  tool,
  setTool,

  setLocoDialogOpened,
  setBlockActionsDialogOpened,
  setPickerOpened,

  saveLayoutToServer,
  loadLayoutFromServer,

  canUndo,
  canRedo,
  undo,
  redo,

  onOpenAppSettingsDialog,
  onFitLayout,
}: LayoutPageHeaderProps) {
  return (
    <>
      <ActionIcon
        variant="filled"
        size="md"
        radius="xl"
        color="blue"
        onClick={() =>
          setToolbarOpened(value => !value)
        }
        onMouseDown={event =>
          event.preventDefault()
        }
        aria-label={
          toolbarOpened
            ? "Hide toolbar"
            : "Show toolbar"
        }
        style={{
          position: "fixed",
          top: 12,
          left: 8,
          zIndex: 5000,
          boxShadow: "var(--mantine-shadow-md)",
        }}
      >
        {toolbarOpened ? (
          <IconChevronUp size={16} />
        ) : (
          <IconChevronDown size={16} />
        )}
      </ActionIcon>

      <AppShell.Header>
        <Box
          pl={0}
          h="100%"
          style={{
            opacity: toolbarOpened ? 1 : 0,
            pointerEvents: toolbarOpened
              ? "auto"
              : "none",
            overflow: "hidden",
            transition: "opacity 120ms ease",
          }}
        >
          <TopMenuBar
            editMode={editMode}
            onEditModeChange={setEditMode}
            onGoHome={onGoHome}
            onOpenLocos={() =>
              setLocoDialogOpened(true)
            }
            onOpenBlocks={() =>
              setBlockActionsDialogOpened(true)
            }
            locoPanelCollapsed={locoPanelCollapsed}
            onToggleLocoPanel={() =>
              setLocoPanelCollapsed(
                value => !value
              )
            }
            propertyPanelCollapsed={
              propertyPanelCollapsed
            }
            onTogglePropertyPanel={() =>
              setPropertyPanelCollapsed(
                value => !value
              )
            }
            tool={tool}
            onCursorToolClick={() =>
              setTool({
                mode: "cursor",
                elementType: tool.elementType,
              })
            }
            onOpenElementPicker={() =>
              setPickerOpened(true)
            }
            onSaveLayout={saveLayoutToServer}
            onLoadLayout={loadLayoutFromServer}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onOpenAppSettingsDialog={onOpenAppSettingsDialog}
            onDeleteToolClick={() =>
              setTool({
                mode: "delete",
                elementType: tool.elementType,
              })
            }
            onFitLayout={onFitLayout}
          />
        </Box>
      </AppShell.Header>
    </>
  );
}

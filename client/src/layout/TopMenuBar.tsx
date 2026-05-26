import { Group } from "@mantine/core";
import { useState } from "react";
import type { EditorTool } from "../models/editor/types/EditorTypes";
import DiagnosticsDialog from "../components/diagnostics/DiagnosticsDialog";
import IntegrityCheckDialog from "../components/diagnostics/IntegrityCheckDialog";
import EditorToolbar from "./top-menu/EditorToolbar";
import FullscreenToggleButton from "./top-menu/FullscreenToggleButton";
import MainMenuActions from "./top-menu/MainMenuActions";
import QuickHelpDialog from "./top-menu/QuickHelpDialog";
import RightToolbarActions from "./top-menu/RightToolbarActions";

export function getWsColor(status: string) {
  switch (status) {
    case "connected":
      return "green";
    case "connecting":
    case "reconnecting":
      return "yellow";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

type TopMenuBarProps = {
  editMode: boolean;
  onEditModeChange: (value: boolean) => void;
  onGoHome: () => void;
  onOpenLocos: () => void;
  onOpenBlocks: () => void;
  onOpenSignalLogic: () => void;
  locoPanelCollapsed: boolean;
  onToggleLocoPanel: () => void;
  propertyPanelCollapsed: boolean;
  onTogglePropertyPanel: () => void;
  tool: EditorTool;
  onCursorToolClick: () => void;
  onOpenElementPicker: () => void;
  onSaveLayout: () => void;
  onLoadLayout: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenAppSettingsDialog: () => void;
  onDeleteToolClick: () => void;
  onFitLayout: () => void;
};

export default function TopMenuBar({
  editMode,
  onEditModeChange,
  onGoHome,
  onOpenLocos,
  onOpenBlocks,
  onOpenSignalLogic,
  locoPanelCollapsed,
  onToggleLocoPanel,
  propertyPanelCollapsed,
  onTogglePropertyPanel,
  tool,
  onCursorToolClick,
  onOpenElementPicker,
  onSaveLayout,
  onLoadLayout,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenAppSettingsDialog,
  onDeleteToolClick,
  onFitLayout,
}: TopMenuBarProps) {
  const [helpOpened, setHelpOpened] = useState(false);
  const [diagnosticsOpened, setDiagnosticsOpened] = useState(false);
  const [integrityCheckOpened, setIntegrityCheckOpened] = useState(false);

  return (
    <>
      <Group ml={32} h="100%" px="md" justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <FullscreenToggleButton />

          <MainMenuActions
            onGoHome={onGoHome}
            onOpenLocos={onOpenLocos}
            onOpenBlocks={onOpenBlocks}
            onOpenSignalLogic={onOpenSignalLogic}
            onOpenDiagnostics={() => setDiagnosticsOpened(true)}
            onOpenIntegrityCheck={() => setIntegrityCheckOpened(true)}
            onSaveLayout={onSaveLayout}
            onLoadLayout={onLoadLayout}
            onOpenAppSettingsDialog={onOpenAppSettingsDialog}
            onOpenHelp={() => setHelpOpened(true)}
          />

          <EditorToolbar
            editMode={editMode}
            onEditModeChange={onEditModeChange}
            tool={tool}
            onCursorToolClick={onCursorToolClick}
            onOpenElementPicker={onOpenElementPicker}
            onDeleteToolClick={onDeleteToolClick}
            onFitLayout={onFitLayout}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
          />
        </Group>

        <RightToolbarActions
          locoPanelCollapsed={locoPanelCollapsed}
          onToggleLocoPanel={onToggleLocoPanel}
          propertyPanelCollapsed={propertyPanelCollapsed}
          onTogglePropertyPanel={onTogglePropertyPanel}
        />
      </Group>

      <QuickHelpDialog
        opened={helpOpened}
        onClose={() => setHelpOpened(false)}
      />

      <DiagnosticsDialog
        opened={diagnosticsOpened}
        onClose={() => setDiagnosticsOpened(false)}
      />

      <IntegrityCheckDialog
        opened={integrityCheckOpened}
        onClose={() => setIntegrityCheckOpened(false)}
      />
    </>
  );
}

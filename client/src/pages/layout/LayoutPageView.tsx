// client/src/pages/layout/LayoutPageView.tsx

import { AppShell } from "@mantine/core";
import type { Dispatch, SetStateAction } from "react";
import type { Loco } from "../../../../common/src/types";
import type { CommandCenter } from "../../api/commandCentersApi";
import type { RightPanelMode } from "../../hooks/layout/useLayoutPageUiState";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { LayoutView } from "../../models/editor/core/LayoutView";
import type { EditorTool } from "../../models/editor/types/EditorTypes";
import StatusBar from "../../layout/StatusBar";
import LayoutPageDialogs from "./view/LayoutPageDialogs";
import LayoutPageHeader from "./view/LayoutPageHeader";
import LayoutPageWorkspace from "./view/LayoutPageWorkspace";
import { FOOTER_HEIGHT, HEADER_HEIGHT } from "./view/layoutPageViewConstants";

type BooleanSetter = Dispatch<SetStateAction<boolean>>;
type NumberSetter = Dispatch<SetStateAction<number>>;
type LayoutSetter = Dispatch<SetStateAction<LayoutView>>;
type EditorToolSetter = Dispatch<SetStateAction<EditorTool>>;
type RightPanelModeSetter = Dispatch<SetStateAction<RightPanelMode>>;

export type LayoutPageViewProps = {
  onGoHome: () => void;
  toolbarOpened: boolean;
  setToolbarOpened: BooleanSetter;
  canvasBusy: boolean;
  canvasBusyText: string;
  setCanvasBusy: BooleanSetter;
  setCanvasBusyText: Dispatch<SetStateAction<string>>;
  commandCenterOpened?: boolean;
  setCommandCenterOpened?: BooleanSetter;
  commandCenter?: CommandCenter;
  onCommandCenterSaved?: (commandCenter: CommandCenter) => void;
  locoDialogOpened: boolean;
  setLocoDialogOpened: BooleanSetter;
  blockActionsDialogOpened: boolean;
  setBlockActionsDialogOpened: BooleanSetter;
  requestedBlockActionsBlockId: string | null;
  onRequestedBlockActionsBlockIdConsumed: () => void;
  onOpenBlockActionsForBlock: (blockId: string) => void;
  signalLogicDialogOpened: boolean;
  setSignalLogicDialogOpened: BooleanSetter;
  requestedSignalLogicAddress: number | null;
  onRequestedSignalLogicAddressConsumed: () => void;
  onOpenSignalLogicForSignal: (signalAddress: number) => void;
  onLocosSaved: () => Promise<void>;
  pickerOpened: boolean;
  setPickerOpened: BooleanSetter;
  appSettingsDialogOpened: boolean;
  setAppSettingsDialogOpened: BooleanSetter;
  editMode: boolean;
  setEditMode: BooleanSetter;
  locoPanelCollapsed: boolean;
  setLocoPanelCollapsed: BooleanSetter;
  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: BooleanSetter;
  rightPanelMode: RightPanelMode;
  setRightPanelMode: RightPanelModeSetter;
  tool: EditorTool;
  setTool: EditorToolSetter;
  saveLayoutToServer: () => Promise<void>;
  loadLayoutFromServer: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  onOpenAppSettingsDialog: () => void;
  onFitLayout: () => void;
  locos: Loco[];
  layout: LayoutView;
  onLayoutChange: LayoutSetter;
  onBeforeLayoutChange: () => void;
  selectedElement: BaseElementView | null;
  onSelectedElementChange: (element: BaseElementView | null) => void;
  invalidateCounter: number;
  setInvalidateCounter: NumberSetter;
  fitCounter: number;
  turnoutSelection: boolean;
  setTurnoutSelection: BooleanSetter;
  onUpdateSelectedElement: (element: BaseElementView | null) => void;
  routesString: string;
};

export function LayoutPageView(props: LayoutPageViewProps) {
  const {
    onGoHome, toolbarOpened, setToolbarOpened, canvasBusy, canvasBusyText,
    setCanvasBusy, setCanvasBusyText, locoDialogOpened, setLocoDialogOpened,
    blockActionsDialogOpened, setBlockActionsDialogOpened,
    requestedBlockActionsBlockId, onRequestedBlockActionsBlockIdConsumed,
    onOpenBlockActionsForBlock, signalLogicDialogOpened, setSignalLogicDialogOpened,
    requestedSignalLogicAddress, onRequestedSignalLogicAddressConsumed,
    onOpenSignalLogicForSignal, onLocosSaved, pickerOpened, setPickerOpened,
    appSettingsDialogOpened, setAppSettingsDialogOpened,
    editMode, setEditMode, locoPanelCollapsed, setLocoPanelCollapsed,
    propertyPanelCollapsed, setPropertyPanelCollapsed, rightPanelMode,
    setRightPanelMode, tool, setTool, saveLayoutToServer,
    loadLayoutFromServer, canUndo, canRedo, undo, redo,
    onOpenAppSettingsDialog, onFitLayout, locos, layout, onLayoutChange,
    onBeforeLayoutChange, selectedElement, onSelectedElementChange,
    invalidateCounter, setInvalidateCounter, fitCounter, turnoutSelection,
    setTurnoutSelection, onUpdateSelectedElement, routesString,
  } = props;

  return (
    <>
      <LayoutPageDialogs
        canvasBusy={canvasBusy}
        canvasBusyText={canvasBusyText}
        locoDialogOpened={locoDialogOpened}
        setLocoDialogOpened={setLocoDialogOpened}
        onLocosSaved={onLocosSaved}
        blockActionsDialogOpened={blockActionsDialogOpened}
        setBlockActionsDialogOpened={setBlockActionsDialogOpened}
        requestedBlockActionsBlockId={requestedBlockActionsBlockId}
        onRequestedBlockActionsBlockIdConsumed={onRequestedBlockActionsBlockIdConsumed}
        signalLogicDialogOpened={signalLogicDialogOpened}
        setSignalLogicDialogOpened={setSignalLogicDialogOpened}
        requestedSignalLogicAddress={requestedSignalLogicAddress}
        onRequestedSignalLogicAddressConsumed={onRequestedSignalLogicAddressConsumed}
        pickerOpened={pickerOpened}
        setPickerOpened={setPickerOpened}
        appSettingsDialogOpened={appSettingsDialogOpened}
        setAppSettingsDialogOpened={setAppSettingsDialogOpened}
        layout={layout}
        setTool={setTool}
      />

      <AppShell
        header={{ height: toolbarOpened ? HEADER_HEIGHT : 0 }}
        footer={{ height: FOOTER_HEIGHT }}
        padding="xs"
      >
        <LayoutPageHeader
          onGoHome={onGoHome}
          toolbarOpened={toolbarOpened}
          setToolbarOpened={setToolbarOpened}
          editMode={editMode}
          setEditMode={setEditMode}
          locoPanelCollapsed={locoPanelCollapsed}
          setLocoPanelCollapsed={setLocoPanelCollapsed}
          propertyPanelCollapsed={propertyPanelCollapsed}
          setPropertyPanelCollapsed={setPropertyPanelCollapsed}
          tool={tool}
          setTool={setTool}
          setLocoDialogOpened={setLocoDialogOpened}
          setBlockActionsDialogOpened={setBlockActionsDialogOpened}
          setSignalLogicDialogOpened={setSignalLogicDialogOpened}
          setPickerOpened={setPickerOpened}
          saveLayoutToServer={saveLayoutToServer}
          loadLayoutFromServer={loadLayoutFromServer}
          canUndo={canUndo}
          canRedo={canRedo}
          undo={undo}
          redo={redo}
          onOpenAppSettingsDialog={onOpenAppSettingsDialog}
          onFitLayout={onFitLayout}
        />

        <LayoutPageWorkspace
          toolbarOpened={toolbarOpened}
          locoPanelCollapsed={locoPanelCollapsed}
          setLocoPanelCollapsed={setLocoPanelCollapsed}
          propertyPanelCollapsed={propertyPanelCollapsed}
          setPropertyPanelCollapsed={setPropertyPanelCollapsed}
          rightPanelMode={rightPanelMode}
          locos={locos}
          editMode={editMode}
          tool={tool}
          layout={layout}
          onLayoutChange={onLayoutChange}
          onBeforeLayoutChange={onBeforeLayoutChange}
          selectedElement={selectedElement}
          onSelectedElementChange={onSelectedElementChange}
          invalidateCounter={invalidateCounter}
          setInvalidateCounter={setInvalidateCounter}
          fitCounter={fitCounter}
          turnoutSelection={turnoutSelection}
          setTurnoutSelection={setTurnoutSelection}
          onUpdateSelectedElement={onUpdateSelectedElement}
          onOpenBlockActionsForBlock={onOpenBlockActionsForBlock}
          onOpenSignalLogicForSignal={onOpenSignalLogicForSignal}
          routesString={routesString}
          setCanvasBusy={setCanvasBusy}
          setCanvasBusyText={setCanvasBusyText}
        />

        <AppShell.Footer>
          <StatusBar
            rightPanelMode={rightPanelMode}
            setRightPanelMode={setRightPanelMode}
            onOpenSignalLogicDialog={() => setSignalLogicDialogOpened(true)}
          />
        </AppShell.Footer>
      </AppShell>
    </>
  );
}

export default LayoutPageView;
// client/src/pages/layout/LayoutPageView.tsx

import { AppShell } from "@mantine/core";

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  Loco,
} from "../../../../common/src/types";

import type {
  CommandCenter,
} from "../../api/commandCentersApi";

import type {
  BaseElement,
} from "../../models/editor/core/BaseElement";

import type {
  Layout,
} from "../../models/editor/core/Layout";

import type {
  EditorTool,
} from "../../models/editor/types/EditorTypes";

import StatusBar from "../../layout/StatusBar";
import LayoutPageDialogs from "./view/LayoutPageDialogs";
import LayoutPageHeader from "./view/LayoutPageHeader";
import LayoutPageWorkspace from "./view/LayoutPageWorkspace";
import {
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
} from "./view/layoutPageViewConstants";

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

type NumberSetter =
  Dispatch<SetStateAction<number>>;

type LayoutSetter =
  Dispatch<SetStateAction<Layout>>;

type EditorToolSetter =
  Dispatch<SetStateAction<EditorTool>>;

export type LayoutPageViewProps = {
  onGoHome: () => void;

  toolbarOpened: boolean;
  setToolbarOpened: BooleanSetter;

  canvasBusy: boolean;
  canvasBusyText: string;
  setCanvasBusy: BooleanSetter;
  setCanvasBusyText: Dispatch<SetStateAction<string>>;

  commandCenterOpened: boolean;
  setCommandCenterOpened: BooleanSetter;
  commandCenter: CommandCenter;
  onCommandCenterSaved: (
    commandCenter: CommandCenter
  ) => void;

  locoDialogOpened: boolean;
  setLocoDialogOpened: BooleanSetter;
  onLocosSaved: () => Promise<void>;

  pickerOpened: boolean;
  setPickerOpened: BooleanSetter;

  settingsDialogOpened: boolean;
  setSettingsDialogOpened: BooleanSetter;

  editMode: boolean;
  setEditMode: BooleanSetter;

  locoPanelCollapsed: boolean;
  setLocoPanelCollapsed: BooleanSetter;

  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: BooleanSetter;

  tool: EditorTool;
  setTool: EditorToolSetter;

  saveLayoutToServer: () => Promise<void>;
  loadLayoutFromServer: () => Promise<void>;

  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  onSettingsClick: () => void;
  onFitLayout: () => void;

  locos: Loco[];
  layout: Layout;
  onLayoutChange: LayoutSetter;
  onBeforeLayoutChange: () => void;

  selectedElement: BaseElement | null;
  onSelectedElementChange: (
    element: BaseElement | null
  ) => void;

  invalidateCounter: number;
  setInvalidateCounter: NumberSetter;
  fitCounter: number;

  turnoutSelection: boolean;
  setTurnoutSelection: BooleanSetter;

  onUpdateSelectedElement: (
    element: BaseElement | null
  ) => void;

  routesString: string;
};

export function LayoutPageView({
  onGoHome,

  toolbarOpened,
  setToolbarOpened,

  canvasBusy,
  canvasBusyText,
  setCanvasBusy,
  setCanvasBusyText,

  commandCenterOpened,
  setCommandCenterOpened,
  commandCenter,
  onCommandCenterSaved,

  locoDialogOpened,
  setLocoDialogOpened,
  onLocosSaved,

  pickerOpened,
  setPickerOpened,

  settingsDialogOpened,
  setSettingsDialogOpened,

  editMode,
  setEditMode,

  locoPanelCollapsed,
  setLocoPanelCollapsed,

  propertyPanelCollapsed,
  setPropertyPanelCollapsed,

  tool,
  setTool,

  saveLayoutToServer,
  loadLayoutFromServer,

  canUndo,
  canRedo,
  undo,
  redo,

  onSettingsClick,
  onFitLayout,

  locos,
  layout,
  onLayoutChange,
  onBeforeLayoutChange,

  selectedElement,
  onSelectedElementChange,

  invalidateCounter,
  setInvalidateCounter,
  fitCounter,

  turnoutSelection,
  setTurnoutSelection,

  onUpdateSelectedElement,
  routesString,
}: LayoutPageViewProps) {
  return (
    <>
      <LayoutPageDialogs
        canvasBusy={canvasBusy}
        canvasBusyText={canvasBusyText}
        commandCenterOpened={commandCenterOpened}
        setCommandCenterOpened={setCommandCenterOpened}
        commandCenter={commandCenter}
        onCommandCenterSaved={onCommandCenterSaved}
        locoDialogOpened={locoDialogOpened}
        setLocoDialogOpened={setLocoDialogOpened}
        onLocosSaved={onLocosSaved}
        pickerOpened={pickerOpened}
        setPickerOpened={setPickerOpened}
        settingsDialogOpened={settingsDialogOpened}
        setSettingsDialogOpened={setSettingsDialogOpened}
        setTool={setTool}
      />

      <AppShell
        header={{
          height: toolbarOpened
            ? HEADER_HEIGHT
            : 0,
        }}
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
          setPickerOpened={setPickerOpened}
          saveLayoutToServer={saveLayoutToServer}
          loadLayoutFromServer={loadLayoutFromServer}
          canUndo={canUndo}
          canRedo={canRedo}
          undo={undo}
          redo={redo}
          onSettingsClick={onSettingsClick}
          onFitLayout={onFitLayout}
          setCommandCenterOpened={setCommandCenterOpened}
        />

        <LayoutPageWorkspace
          toolbarOpened={toolbarOpened}
          locoPanelCollapsed={locoPanelCollapsed}
          setLocoPanelCollapsed={setLocoPanelCollapsed}
          propertyPanelCollapsed={propertyPanelCollapsed}
          setPropertyPanelCollapsed={setPropertyPanelCollapsed}
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
          routesString={routesString}
          setCanvasBusy={setCanvasBusy}
          setCanvasBusyText={setCanvasBusyText}
        />

        <AppShell.Footer>
          <StatusBar />
        </AppShell.Footer>
      </AppShell>
    </>
  );
}

export default LayoutPageView;

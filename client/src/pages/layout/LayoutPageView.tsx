// client/src/pages/layout/LayoutPageView.tsx

import {
  ActionIcon,
  AppShell,
  Box,
  Card,
  Group,
  Stack,
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

import CommandCenterDialog from "../../components/CommandCenterDialog";
import ElementPickerDialog from "../../components/editor/ElementPickerDialog";
import FullscreenLoader from "../../components/FullscreenLoader";
import LocoDialog from "../../components/LocoDialog";
import PanelHandle from "../../components/PanelHandle";
import SettingDialog from "../../components/SettingsDialog";
import TrackCanvas from "../../components/TrackCanvas";
import LocoPanel from "../../layout/LocoPanel";
import RightPropertyPanel from "../../layout/PropertyPanel";
import StatusBar from "../../layout/StatusBar";
import TopMenuBar from "../../layout/TopMenuBar";

const HEADER_HEIGHT = 50;
const FOOTER_HEIGHT = 40;
const LOCO_PANEL_WIDTH = 380;
const PROPERTY_PANEL_WIDTH = 320;

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
      <FullscreenLoader
        visible={canvasBusy}
        text={canvasBusyText}
      />

      <CommandCenterDialog
        opened={commandCenterOpened}
        onClose={() => setCommandCenterOpened(false)}
        onSave={onCommandCenterSaved}
        commandCenter={commandCenter}
      />

      <LocoDialog
        opened={locoDialogOpened}
        onClose={() => setLocoDialogOpened(false)}
        onSaved={onLocosSaved}
      />

      <ElementPickerDialog
        opened={pickerOpened}
        onClose={() => setPickerOpened(false)}
        onPick={elementType => {
          setTool({
            mode: "draw",
            elementType,
          });
        }}
      />

      <SettingDialog
        opened={settingsDialogOpened}
        onClose={() => setSettingsDialogOpened(false)}
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
        <ActionIcon
          variant="filled"
          size="md"
          radius="xl"
          color="blue"
          onClick={() => setToolbarOpened(value => !value)}
          onMouseDown={event => event.preventDefault()}
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
              onOpenLocos={() => setLocoDialogOpened(true)}
              locoPanelCollapsed={locoPanelCollapsed}
              onToggleLocoPanel={() =>
                setLocoPanelCollapsed(value => !value)
              }
              propertyPanelCollapsed={propertyPanelCollapsed}
              onTogglePropertyPanel={() =>
                setPropertyPanelCollapsed(value => !value)
              }
              tool={tool}
              onCursorToolClick={() =>
                setTool({
                  mode: "cursor",
                  elementType: tool.elementType,
                })
              }
              onOpenElementPicker={() => setPickerOpened(true)}
              onSaveLayout={saveLayoutToServer}
              onLoadLayout={loadLayoutFromServer}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onSettingsClick={onSettingsClick}
              onDeleteToolClick={() =>
                setTool({
                  mode: "delete",
                  elementType: tool.elementType,
                })
              }
              onFitLayout={onFitLayout}
              onOpenCommandCenterDialog={() =>
                setCommandCenterOpened(true)
              }
            />
          </Box>
        </AppShell.Header>

        <AppShell.Main>
          <Stack
            gap="xs"
            h={`calc(100vh - ${
              toolbarOpened
                ? HEADER_HEIGHT
                : 0
            }px - ${FOOTER_HEIGHT}px - 20px)`}
          >
            <Group
              gap="xs"
              wrap="nowrap"
              align="stretch"
              style={{
                flex: 1,
                minHeight: 0,
              }}
            >
              <Box
                style={{
                  width: locoPanelCollapsed
                    ? 0
                    : LOCO_PANEL_WIDTH,
                  transition: "width 0.2s ease",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <LocoPanel locos={locos} />
              </Box>

              <Box
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: "relative",
                }}
                h="100%"
              >
                <PanelHandle
                  side="left"
                  collapsed={locoPanelCollapsed}
                  onToggle={() =>
                    setLocoPanelCollapsed(value => !value)
                  }
                  style={{ left: 1 }}
                />

                <PanelHandle
                  side="right"
                  collapsed={propertyPanelCollapsed}
                  onToggle={() =>
                    setPropertyPanelCollapsed(value => !value)
                  }
                  style={{ right: 1 }}
                />

                <Card
                  withBorder
                  radius="sm"
                  p="xs"
                  h="100%"
                >
                  <Box
                    h="100%"
                    style={{
                      borderRadius: 2,
                      overflow: "hidden",
                      border:
                        "1px solid var(--mantine-color-dark-4)",
                    }}
                  >
                    <TrackCanvas
                      editMode={editMode}
                      tool={tool}
                      layout={layout}
                      onLayoutChange={onLayoutChange}
                      onBeforeLayoutChange={
                        onBeforeLayoutChange
                      }
                      selectedElement={selectedElement}
                      onSelectedElementChange={
                        onSelectedElementChange
                      }
                      invalidateCounter={invalidateCounter}
                      onInvalidate={() =>
                        setInvalidateCounter(value => value + 1)
                      }
                      fitCounter={fitCounter}
                      turnoutSelectionMode={
                        turnoutSelection
                      }
                      setBusy={(busy, text) => {
                        setCanvasBusy(busy);

                        if (text) {
                          setCanvasBusyText(text);
                        }
                      }}
                      locos={locos}
                    />
                  </Box>
                </Card>
              </Box>

              <Box
                style={{
                  width: propertyPanelCollapsed
                    ? 0
                    : PROPERTY_PANEL_WIDTH,
                  transition: "width 0.2s ease",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {!propertyPanelCollapsed && (
                  <Card
                    withBorder
                    radius="xs"
                    p="xs"
                    h="100%"
                  >
                    <RightPropertyPanel
                      selectedElement={selectedElement}
                      invalidate={invalidateCounter}
                      onUpdateSelectedElement={
                        onUpdateSelectedElement
                      }
                      editMode={editMode}
                      opened={!propertyPanelCollapsed}
                      turnoutSelectionMode={
                        turnoutSelection
                      }
                      setTurnoutSelectionMode={
                        setTurnoutSelection
                      }
                      layout={layout}
                      onLayoutChange={onLayoutChange}
                      routes={routesString}
                      setBusy={(busy, text) => {
                        setCanvasBusy(busy);

                        if (text) {
                          setCanvasBusyText(text);
                        }
                      }}
                    />
                  </Card>
                )}
              </Box>
            </Group>
          </Stack>
        </AppShell.Main>

        <AppShell.Footer>
          <StatusBar />
        </AppShell.Footer>
      </AppShell>
    </>
  );
}

export default LayoutPageView;

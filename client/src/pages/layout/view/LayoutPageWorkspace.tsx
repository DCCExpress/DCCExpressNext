import {
  AppShell,
  Box,
  Card,
  Group,
  Stack,
} from "@mantine/core";

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  Loco,
} from "../../../../../common/src/types";

import type {
  RightPanelMode,
} from "../../../hooks/layout/useLayoutPageUiState";

import type {
  BaseElementView,
} from "../../../models/editor/core/BaseElementView";

import type {
  LayoutView,
} from "../../../models/editor/core/LayoutView";

import type {
  EditorTool,
} from "../../../models/editor/types/EditorTypes";

import PanelHandle from "../../../components/PanelHandle";
import TrackCanvas from "../../../components/TrackCanvas";
import LocoPanel from "../../../layout/LocoPanel";
import RightPropertyPanel from "../../../layout/PropertyPanel";

import {
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  LOCO_PANEL_WIDTH,
  PROPERTY_PANEL_WIDTH,
} from "./layoutPageViewConstants";

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

type NumberSetter =
  Dispatch<SetStateAction<number>>;

type LayoutSetter =
  Dispatch<SetStateAction<LayoutView>>;

type LayoutPageWorkspaceProps = {
  toolbarOpened: boolean;

  locoPanelCollapsed: boolean;
  setLocoPanelCollapsed: BooleanSetter;

  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: BooleanSetter;

  rightPanelMode: RightPanelMode;

  locos: Loco[];

  editMode: boolean;
  tool: EditorTool;

  layout: LayoutView;
  onLayoutChange: LayoutSetter;
  onBeforeLayoutChange: () => void;

  selectedElement: BaseElementView | null;
  onSelectedElementChange: (
    element: BaseElementView | null
  ) => void;

  invalidateCounter: number;
  setInvalidateCounter: NumberSetter;
  fitCounter: number;

  turnoutSelection: boolean;
  setTurnoutSelection: BooleanSetter;

  onUpdateSelectedElement: (
    element: BaseElementView | null
  ) => void;

  onOpenBlockActionsForBlock: (blockId: string) => void;
  onOpenSignalLogicForSignal: (signalAddress: number) => void;

  routesString: string;

  setCanvasBusy: BooleanSetter;
  setCanvasBusyText: Dispatch<SetStateAction<string>>;
};

const RIGHT_LOCO_STORAGE_KEY =
  "dcc-express.loco-panel.right.selected-loco-id";

export default function LayoutPageWorkspace({
  toolbarOpened,

  locoPanelCollapsed,
  setLocoPanelCollapsed,

  propertyPanelCollapsed,
  setPropertyPanelCollapsed,

  rightPanelMode,

  locos,

  editMode,
  tool,

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
  onOpenBlockActionsForBlock,
  onOpenSignalLogicForSignal,

  routesString,

  setCanvasBusy,
  setCanvasBusyText,
}: LayoutPageWorkspaceProps) {
  const setBusy = (
    busy: boolean,
    text?: string
  ) => {
    setCanvasBusy(busy);

    if (text) {
      setCanvasBusyText(text);
    }
  };

  return (
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
                setLocoPanelCollapsed(
                  value => !value
                )
              }
              style={{ left: 1 }}
            />

            <PanelHandle
              side="right"
              collapsed={propertyPanelCollapsed}
              onToggle={() =>
                setPropertyPanelCollapsed(
                  value => !value
                )
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
                  selectedElement={
                    selectedElement
                  }
                  onSelectedElementChange={
                    onSelectedElementChange
                  }
                  invalidateCounter={
                    invalidateCounter
                  }
                  onInvalidate={() =>
                    setInvalidateCounter(
                      value => value + 1
                    )
                  }
                  fitCounter={fitCounter}
                  turnoutSelectionMode={
                    turnoutSelection
                  }
                  setBusy={setBusy}
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
              rightPanelMode === "loco" ? (
                <LocoPanel
                  locos={locos}
                  selectedLocoStorageKey={
                    RIGHT_LOCO_STORAGE_KEY
                  }
                />
              ) : (
                <Card
                  withBorder
                  radius="xs"
                  p="xs"
                  h="100%"
                >
                  <RightPropertyPanel
                    selectedElement={
                      selectedElement
                    }
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
                    setBusy={setBusy}
                    onOpenBlockActionsForBlock={
                      onOpenBlockActionsForBlock
                    }
                    onOpenSignalLogicForSignal={
                      onOpenSignalLogicForSignal
                    }
                  />
                </Card>
              )
            )}
          </Box>
        </Group>
      </Stack>
    </AppShell.Main>
  );
}

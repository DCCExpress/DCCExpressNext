import {
  ActionIcon,
  Box,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconPlayerPlay, IconTrash } from "@tabler/icons-react";

import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { LayoutView } from "../../models/editor/core/LayoutView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import {
  RouteButtonElementView,
  type RouteTurnoutItem,
} from "../../models/editor/elements/RouteButtonElementView";
import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import { useCommandCenter } from "../../context/CommandCenterContext";
import { showWarningMessage } from "../../helpers";
import { executeLegacyRouteButton } from "../../services/routeButtonExecutor";
import type {
  LayoutSetter,
  SelectedElementUpdateHandler,
} from "./propertyPanelTypes";

type RouteTurnoutSelectionPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  layout: LayoutView;
  turnoutSelectionMode: boolean;
  setTurnoutSelectionMode: (on: boolean) => void;
  onLayoutChange: LayoutSetter;
  onUpdateSelectedElement: SelectedElementUpdateHandler;
  setBusy?: (busy: boolean, text?: string) => void;
};

function findElementById(layout: LayoutView, id: string) {
  return layout.getAllElements().find(element => element.id === id) ?? null;
}

function getItems(
  selectedElement: BaseElementView,
  prop: IEditableProperty
): RouteTurnoutItem[] {
  const value = (selectedElement as any)[prop.key];
  return Array.isArray(value) ? (value as RouteTurnoutItem[]) : [];
}

function removeTurnout(
  selectedElement: BaseElementView,
  turnoutId: string,
  onUpdateSelectedElement: SelectedElementUpdateHandler
) {
  const routeButton = selectedElement as RouteButtonElementView;
  routeButton.removeTurnout(turnoutId);
  onUpdateSelectedElement(selectedElement);
}

function getRouteTurnoutLogicalLabel(
  turnout: unknown,
  physicalClosed: boolean
): string {
  const turnoutClosedValue =
    typeof (turnout as any)?.turnoutClosedValue === "boolean"
      ? (turnout as any).turnoutClosedValue as boolean
      : true;

  return physicalClosed === turnoutClosedValue
    ? "C"
    : "T";
}

export default function RouteTurnoutSelectionPropertyEditor({
  prop,
  selectedElement,
  layout,
  turnoutSelectionMode,
  setTurnoutSelectionMode,
  onLayoutChange,
  onUpdateSelectedElement,
  setBusy,
}: RouteTurnoutSelectionPropertyEditorProps) {
  const commandCenter = useCommandCenter();
  const items = getItems(selectedElement, prop);
  const hasTurnouts = items.length > 0;

  const setRouteTurnoutPhysicalClosed = (
    turnoutId: string,
    physicalClosed: boolean
  ): void => {
    const routeItems = getItems(selectedElement, prop);
    const item = routeItems.find(routeItem => routeItem.turnoutId === turnoutId);

    if (!item) {
      return;
    }

    item.closed = physicalClosed;
    onLayoutChange(previous => previous);
  };

  const toggleRouteTurnout = (turnoutId: string): void => {
    const item = items.find(routeItem => routeItem.turnoutId === turnoutId);

    if (!item) {
      return;
    }

    setRouteTurnoutPhysicalClosed(turnoutId, !item.closed);
  };

  const testRouteButton = async (): Promise<void> => {
    if (!(selectedElement instanceof RouteButtonElementView)) {
      return;
    }

    await executeLegacyRouteButton({
      routeButton: selectedElement,
      layout,
      commandCenterLocked: commandCenter.locked,
      busyText: "Route is being tested...",
      onCommandCenterBusy: () => {
        showWarningMessage(
          "Route test",
          "Command center is busy."
        );
      },
      ...(setBusy !== undefined
        ? { setBusy }
        : {}),
    });
  };

  return (
    <Stack gap="xs">
      <Group gap="xs" grow>
        <Button
          size="xs"
          variant={turnoutSelectionMode ? "filled" : "light"}
          onClick={() => setTurnoutSelectionMode(!turnoutSelectionMode)}
        >
          {turnoutSelectionMode ? "Finish selection" : "Add turnouts"}
        </Button>

        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlayerPlay size={14} />}
          disabled={!hasTurnouts}
          onClick={() => {
            void testRouteButton();
          }}
        >
          Test route
        </Button>
      </Group>

      <Text size="xs" c="dimmed">
        {turnoutSelectionMode
          ? "Click turnouts on the layout to add them, then press Finish selection."
          : "Use Add turnouts to pick turnouts from the layout. Click a preview below to change its stored route state only. Test route sends the same turnout commands as clicking the route button."}
      </Text>

      {items.length === 0 ? (
        <Text size="xs" c="dimmed">
          No turnouts selected
        </Text>
      ) : (
        <Stack gap={6}>
          {items.map(item => {
            const turnout = findElementById(layout, item.turnoutId);

            if (!turnout) {
              return (
                <Group
                  key={item.turnoutId}
                  justify="space-between"
                  gap="xs"
                >
                  <Text size="xs" c="red">
                    Missing turnout: {item.turnoutId}
                  </Text>

                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="subtle"
                    onClick={() =>
                      removeTurnout(
                        selectedElement,
                        item.turnoutId,
                        onUpdateSelectedElement
                      )
                    }
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              );
            }

            const previewTurnout = turnout.clone();
            previewTurnout.id = turnout.id;
            previewTurnout.x = 0;
            previewTurnout.y = 0;
            previewTurnout.selected = false;
            previewTurnout.enabled = true;
            (previewTurnout as any).turnoutClosed = item.closed;

            const logicalLabel = getRouteTurnoutLogicalLabel(
              turnout,
              item.closed
            );

            return (
              <Group
                key={item.turnoutId}
                gap="xs"
                wrap="nowrap"
                align="center"
              >
                <Box
                  className="route-turnout-preview-button"
                  onClick={() => {
                    toggleRouteTurnout(item.turnoutId);
                    onUpdateSelectedElement(selectedElement);
                  }}
                >
                  <ElementPreview
                    element={previewTurnout}
                    label={"#" + (previewTurnout as any).turnoutAddress}
                    width={40}
                    height={40}
                  />
                </Box>

                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" fw={500} truncate>
                    {turnout.name || "Turnout"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Route state: {logicalLabel}
                  </Text>
                </Stack>

                <ActionIcon
                  size="sm"
                  color="red"
                  variant="subtle"
                  title="Remove turnout"
                  onClick={event => {
                    event.stopPropagation();
                    removeTurnout(
                      selectedElement,
                      item.turnoutId,
                      onUpdateSelectedElement
                    );
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

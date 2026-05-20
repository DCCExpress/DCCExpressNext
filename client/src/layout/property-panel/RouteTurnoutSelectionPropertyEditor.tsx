import {
  ActionIcon,
  Box,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import type { BaseElement } from "../../models/editor/core/BaseElement";
import type { Layout } from "../../models/editor/core/Layout";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import {
  RouteButtonElementView,
  type RouteTurnoutItem,
} from "../../models/editor/elements/RouteButtonElementView";
import { TrackTurnoutElement } from "../../models/editor/elements/TrackTurnoutElement";
import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import type {
  LayoutSetter,
  SelectedElementUpdateHandler,
} from "./propertyPanelTypes";

type RouteTurnoutSelectionPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElement;
  layout: Layout;
  turnoutSelectionMode: boolean;
  setTurnoutSelectionMode: (on: boolean) => void;
  onLayoutChange: LayoutSetter;
  onUpdateSelectedElement: SelectedElementUpdateHandler;
};

function findElementById(layout: Layout, id: string) {
  return layout.getAllElements().find(element => element.id === id) ?? null;
}

function getItems(
  selectedElement: BaseElement,
  prop: IEditableProperty
): RouteTurnoutItem[] {
  const value = (selectedElement as any)[prop.key];
  return Array.isArray(value) ? (value as RouteTurnoutItem[]) : [];
}

function removeTurnout(
  selectedElement: BaseElement,
  turnoutId: string,
  onUpdateSelectedElement: SelectedElementUpdateHandler
) {
  const routeButton = selectedElement as RouteButtonElementView;
  routeButton.removeTurnout(turnoutId);
  onUpdateSelectedElement(selectedElement);
}

export default function RouteTurnoutSelectionPropertyEditor({
  prop,
  selectedElement,
  layout,
  turnoutSelectionMode,
  setTurnoutSelectionMode,
  onLayoutChange,
  onUpdateSelectedElement,
}: RouteTurnoutSelectionPropertyEditorProps) {
  const items = getItems(selectedElement, prop);

  const setRouteTurnoutClosed = (
    turnoutId: string,
    closed: boolean
  ): void => {
    const routeItems = getItems(selectedElement, prop);
    const item = routeItems.find(routeItem => routeItem.turnoutId === turnoutId);

    if (!item) {
      return;
    }

    item.closed = closed;
    onLayoutChange(previous => previous);
  };

  const toggleRouteTurnout = (turnoutId: string): void => {
    const item = items.find(routeItem => routeItem.turnoutId === turnoutId);

    if (!item) {
      return;
    }

    setRouteTurnoutClosed(turnoutId, !item.closed);
  };

  return (
    <Stack gap="xs">
      <Button
        size="xs"
        variant={turnoutSelectionMode ? "filled" : "light"}
        onClick={() => setTurnoutSelectionMode(!turnoutSelectionMode)}
      >
        {turnoutSelectionMode ? "Finish selection" : "Add turnouts"}
      </Button>

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
                    const elem = layout.getElementById(item.turnoutId);

                    if (elem instanceof TrackTurnoutElement) {
                      elem.toggle();
                      item.closed =
                        elem.turnoutClosed === elem.turnoutClosedValue;
                      onUpdateSelectedElement(selectedElement);
                      return;
                    }

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

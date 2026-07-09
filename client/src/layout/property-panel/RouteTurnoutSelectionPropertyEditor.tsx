import {
  ActionIcon,
  Box,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconPlayerPlay, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      busyText: t("propertyPanel.routeTurnouts.testing"),
      onCommandCenterBusy: () => {
        showWarningMessage(
          t("propertyPanel.routeTurnouts.testTitle"),
          t("propertyPanel.routeTurnouts.commandCenterBusy")
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
          {turnoutSelectionMode
            ? t("propertyPanel.routeTurnouts.finishSelection")
            : t("propertyPanel.routeTurnouts.addTurnouts")}
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
          {t("propertyPanel.routeTurnouts.testRoute")}
        </Button>
      </Group>

      <Text size="xs" c="dimmed">
        {turnoutSelectionMode
          ? t("propertyPanel.routeTurnouts.selectionHintActive")
          : t("propertyPanel.routeTurnouts.selectionHint")}
      </Text>

      {items.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t("propertyPanel.routeTurnouts.noneSelected")}
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
                    {t("propertyPanel.routeTurnouts.missingTurnout", { id: item.turnoutId })}
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
                    {turnout.name || t("propertyPanel.routeTurnouts.turnoutFallback")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t("propertyPanel.routeTurnouts.routeState", { state: logicalLabel })}
                  </Text>
                </Stack>

                <ActionIcon
                  size="sm"
                  color="red"
                  variant="subtle"
                  title={t("propertyPanel.routeTurnouts.removeTurnout")}
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

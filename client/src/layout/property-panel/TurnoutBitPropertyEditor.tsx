import { Box, Group, Stack, Text } from "@mantine/core";

import BitToggleElement from "../../components/editor/BitToggleElement";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import { TrackTurnoutLeftElementView } from "../../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../../models/editor/elements/TrackTurnoutRightElementView";
import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import { wsApi } from "../../services/wsApi";
import { createTurnoutPreview } from "./previewFactories";
import type { PropertyChangeHandler } from "./propertyPanelTypes";

type TurnoutBitPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  onChange: PropertyChangeHandler;
};

function isTurnoutElement(
  element: BaseElementView
): element is TrackTurnoutLeftElementView | TrackTurnoutRightElementView {
  return element instanceof TrackTurnoutLeftElementView || element instanceof TrackTurnoutRightElementView;
}

function getPhysicalValueForLogicalState(
  closedValue: boolean,
  logicalClosed: boolean
): boolean {
  return logicalClosed
    ? closedValue
    : !closedValue;
}

export default function TurnoutBitPropertyEditor({
  prop,
  selectedElement,
  onChange,
}: TurnoutBitPropertyEditorProps) {
  const values = selectedElement as unknown as Record<string, unknown>;
  const propValue = Boolean(values[prop.key]);

  if (!isTurnoutElement(selectedElement)) {
    return (
      <Group justify="space-between" align="center" wrap="nowrap">
        <Text size="sm" fw={500}>{prop.label}</Text>
        <BitToggleElement value={propValue} onChange={value => onChange(prop, value)} />
      </Group>
    );
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Text size="sm" fw={500}>{prop.label}</Text>
        <BitToggleElement value={propValue} onChange={value => onChange(prop, value)} />
      </Group>

      <Group>
        <Box className="route-turnout-preview-button">
          <ElementPreview
            element={createTurnoutPreview(selectedElement, true)}
            label="Closed"
            width={40}
            height={40}
            onClick={() => {
              wsApi.setTurnout(
                selectedElement.turnoutAddress,
                getPhysicalValueForLogicalState(selectedElement.turnoutClosedValue, true)
              );
            }}
          />
        </Box>

        <Box className="route-turnout-preview-button">
          <ElementPreview
            element={createTurnoutPreview(selectedElement, false)}
            label="Opened"
            width={40}
            height={40}
            onClick={() => {
              wsApi.setTurnout(
                selectedElement.turnoutAddress,
                getPhysicalValueForLogicalState(selectedElement.turnoutClosedValue, false)
              );
            }}
          />
        </Box>
      </Group>
    </Stack>
  );
}

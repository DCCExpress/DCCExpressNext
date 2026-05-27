import { Box, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import BitToggleElement from "../../components/editor/BitToggleElement";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";
import { TrackTurnoutLeftElementView } from "../../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../../models/editor/elements/TrackTurnoutRightElementView";
import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import { wsApi } from "../../services/wsApi";
import { createDoubleTurnoutPreview, createTurnoutPreview } from "./previewFactories";
import type { PropertyChangeHandler } from "./propertyPanelTypes";

type TurnoutBitPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  onChange: PropertyChangeHandler;
};

type DoubleTurnoutPositionPreview = {
  label: string;
  firstClosed: boolean;
  secondClosed: boolean;
};

const DOUBLE_TURNOUT_POSITION_PREVIEWS: DoubleTurnoutPositionPreview[] = [
  {
    label: "Open / Open",
    firstClosed: false,
    secondClosed: false,
  },
  {
    label: "Open / Closed",
    firstClosed: false,
    secondClosed: true,
  },
  {
    label: "Closed / Open",
    firstClosed: true,
    secondClosed: false,
  },
  {
    label: "Closed / Closed",
    firstClosed: true,
    secondClosed: true,
  },
];

function isTurnoutElement(
  element: BaseElementView
): element is TrackTurnoutLeftElementView | TrackTurnoutRightElementView {
  return element instanceof TrackTurnoutLeftElementView || element instanceof TrackTurnoutRightElementView;
}

function isDoubleTurnoutClosedValueProperty(
  prop: IEditableProperty
): prop is IEditableProperty & { key: "turnout1ClosedValue" | "turnout2ClosedValue" } {
  return prop.key === "turnout1ClosedValue" || prop.key === "turnout2ClosedValue";
}

function getPhysicalValueForLogicalState(
  closedValue: boolean,
  logicalClosed: boolean
): boolean {
  return logicalClosed
    ? closedValue
    : !closedValue;
}

function setDoubleTurnoutPosition(
  element: TrackTurnoutDoubleElementView,
  firstClosed: boolean,
  secondClosed: boolean
): void {
  wsApi.setTurnout(
    element.turnout1Address,
    getPhysicalValueForLogicalState(
      element.turnout1ClosedValue,
      firstClosed
    )
  );

  wsApi.setTurnout(
    element.turnout2Address,
    getPhysicalValueForLogicalState(
      element.turnout2ClosedValue,
      secondClosed
    )
  );
}

function renderDoubleTurnoutPositionPreviews(
  selectedElement: TrackTurnoutDoubleElementView
) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>Turnout positions</Text>

      <SimpleGrid cols={2} spacing="xs">
        {DOUBLE_TURNOUT_POSITION_PREVIEWS.map(position => (
          <Box
            key={position.label}
            className="route-turnout-preview-button"
          >
            <ElementPreview
              element={createDoubleTurnoutPreview(
                selectedElement,
                position.firstClosed,
                position.secondClosed
              )}
              label={position.label}
              width={46}
              height={46}
              onClick={() => {
                setDoubleTurnoutPosition(
                  selectedElement,
                  position.firstClosed,
                  position.secondClosed
                );
              }}
            />
          </Box>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function renderDoubleTurnoutEditor(
  prop: IEditableProperty,
  selectedElement: TrackTurnoutDoubleElementView,
  propValue: boolean,
  onChange: PropertyChangeHandler
) {
  const showPositionPreviews =
    prop.key === "turnout1ClosedValue";

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Text size="sm" fw={500}>{prop.label}</Text>
        <BitToggleElement value={propValue} onChange={value => onChange(prop, value)} />
      </Group>

      {showPositionPreviews && renderDoubleTurnoutPositionPreviews(selectedElement)}
    </Stack>
  );
}

export default function TurnoutBitPropertyEditor({
  prop,
  selectedElement,
  onChange,
}: TurnoutBitPropertyEditorProps) {
  const values = selectedElement as unknown as Record<string, unknown>;
  const propValue = Boolean(values[prop.key]);

  if (
    selectedElement instanceof TrackTurnoutDoubleElementView &&
    isDoubleTurnoutClosedValueProperty(prop)
  ) {
    return renderDoubleTurnoutEditor(
      prop,
      selectedElement,
      propValue,
      onChange
    );
  }

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

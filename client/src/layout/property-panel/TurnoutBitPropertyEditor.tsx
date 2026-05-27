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

type DoubleTurnoutPosition = {
  label: string;
  firstClosed: boolean;
  secondClosed: boolean;
};

const DOUBLE_TURNOUT_POSITIONS: DoubleTurnoutPosition[] = [
  {
    label: "O-O",
    firstClosed: false,
    secondClosed: false,
  },
  {
    label: "O-C",
    firstClosed: false,
    secondClosed: true,
  },
  {
    label: "C-O",
    firstClosed: true,
    secondClosed: false,
  },
  {
    label: "C-C",
    firstClosed: true,
    secondClosed: true,
  },
];

function isTurnoutElement(
  element: BaseElementView
): element is TrackTurnoutLeftElementView | TrackTurnoutRightElementView {
  return element instanceof TrackTurnoutLeftElementView || element instanceof TrackTurnoutRightElementView;
}

function isDoubleTurnoutElement(
  element: BaseElementView
): element is TrackTurnoutDoubleElementView {
  return element instanceof TrackTurnoutDoubleElementView;
}

function isDoubleTurnoutClosedValueProperty(
  prop: IEditableProperty
): boolean {
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
  selectedElement: TrackTurnoutDoubleElementView,
  position: DoubleTurnoutPosition
): void {
  wsApi.setTurnout(
    selectedElement.turnout1Address,
    getPhysicalValueForLogicalState(
      selectedElement.turnout1ClosedValue,
      position.firstClosed
    )
  );

  wsApi.setTurnout(
    selectedElement.turnout2Address,
    getPhysicalValueForLogicalState(
      selectedElement.turnout2ClosedValue,
      position.secondClosed
    )
  );
}

function renderDoubleTurnoutEditor(
  selectedElement: TrackTurnoutDoubleElementView,
  onChange: PropertyChangeHandler
) {
  const firstClosedValueProperty: IEditableProperty = {
    label: "Turnout 1 Closed Value",
    key: "turnout1ClosedValue",
    type: "bittoggle",
    readonly: false,
    validate: () => true,
  };

  const secondClosedValueProperty: IEditableProperty = {
    label: "Turnout 2 Closed Value",
    key: "turnout2ClosedValue",
    type: "bittoggle",
    readonly: false,
    validate: () => true,
  };

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>Double turnout positions</Text>

      <SimpleGrid cols={2} spacing="xs">
        {DOUBLE_TURNOUT_POSITIONS.map(position => (
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
                  position
                );
              }}
            />
          </Box>
        ))}
      </SimpleGrid>

      <Group justify="space-between" align="center" wrap="nowrap">
        <Text size="sm" fw={500}>Turnout 1 Closed Value</Text>
        <Group gap="xs" wrap="nowrap">
          <BitToggleElement
            value={selectedElement.turnout1ClosedValue}
            onChange={value => onChange(firstClosedValueProperty, value)}
          />
          <BitToggleElement
            value={!selectedElement.turnout1ClosedValue}
            onChange={value => onChange(firstClosedValueProperty, !value)}
          />
        </Group>
      </Group>

      <Group justify="space-between" align="center" wrap="nowrap">
        <Text size="sm" fw={500}>Turnout 2 Closed Value</Text>
        <Group gap="xs" wrap="nowrap">
          <BitToggleElement
            value={selectedElement.turnout2ClosedValue}
            onChange={value => onChange(secondClosedValueProperty, value)}
          />
          <BitToggleElement
            value={!selectedElement.turnout2ClosedValue}
            onChange={value => onChange(secondClosedValueProperty, !value)}
          />
        </Group>
      </Group>
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
    isDoubleTurnoutElement(selectedElement) &&
    isDoubleTurnoutClosedValueProperty(prop)
  ) {
    if (prop.key !== "turnout1ClosedValue") {
      return null;
    }

    return renderDoubleTurnoutEditor(
      selectedElement,
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
      <Text size="sm" fw={500}>{prop.label}</Text>

      <Group justify="space-between" align="center" wrap="nowrap">
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

        <BitToggleElement value={propValue} onChange={value => onChange(prop, value)} />
      </Group>

      <Group justify="space-between" align="center" wrap="nowrap">
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

        <BitToggleElement value={!propValue} onChange={value => onChange(prop, !value)} />
      </Group>
    </Stack>
  );
}

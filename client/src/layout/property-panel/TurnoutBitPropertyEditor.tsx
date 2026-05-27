import { Box, Group, Stack, Text } from "@mantine/core";

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

function getClosedValueFromPhysicalValue(
  physicalValue: boolean,
  logicalClosed: boolean
): boolean {
  return logicalClosed
    ? physicalValue
    : !physicalValue;
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

function createClosedValueProperty(
  label: string,
  key: "turnout1ClosedValue" | "turnout2ClosedValue"
): IEditableProperty {
  return {
    label,
    key,
    type: "bittoggle",
    readonly: false,
    validate: () => true,
  };
}

function renderDoubleTurnoutEditor(
  selectedElement: TrackTurnoutDoubleElementView,
  onChange: PropertyChangeHandler
) {
  const firstClosedValueProperty = createClosedValueProperty(
    "Turnout 1 Closed Value",
    "turnout1ClosedValue"
  );

  const secondClosedValueProperty = createClosedValueProperty(
    "Turnout 2 Closed Value",
    "turnout2ClosedValue"
  );

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>Double turnout positions</Text>

      {DOUBLE_TURNOUT_POSITIONS.map(position => {
        const firstPhysicalValue = getPhysicalValueForLogicalState(
          selectedElement.turnout1ClosedValue,
          position.firstClosed
        );

        const secondPhysicalValue = getPhysicalValueForLogicalState(
          selectedElement.turnout2ClosedValue,
          position.secondClosed
        );

        return (
          <Group
            key={position.label}
            justify="space-between"
            align="center"
            wrap="nowrap"
          >
            <Box className="route-turnout-preview-button">
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

            <Group gap="xs" wrap="nowrap">
              <BitToggleElement
                value={firstPhysicalValue}
                onChange={value => onChange(
                  firstClosedValueProperty,
                  getClosedValueFromPhysicalValue(
                    value,
                    position.firstClosed
                  )
                )}
              />
              <BitToggleElement
                value={secondPhysicalValue}
                onChange={value => onChange(
                  secondClosedValueProperty,
                  getClosedValueFromPhysicalValue(
                    value,
                    position.secondClosed
                  )
                )}
              />
            </Group>
          </Group>
        );
      })}
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

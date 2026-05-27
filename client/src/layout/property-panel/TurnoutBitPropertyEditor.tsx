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

function getDoubleTurnoutAddress(
  element: TrackTurnoutDoubleElementView,
  prop: IEditableProperty
): number {
  return prop.key === "turnout1ClosedValue"
    ? element.turnout1Address
    : element.turnout2Address;
}

function renderDoubleTurnoutEditor(
  prop: IEditableProperty,
  selectedElement: TrackTurnoutDoubleElementView,
  propValue: boolean,
  onChange: PropertyChangeHandler
) {
  const isFirstMotor = prop.key === "turnout1ClosedValue";
  const address = getDoubleTurnoutAddress(selectedElement, prop);

  const closedPreview = createDoubleTurnoutPreview(
    selectedElement,
    isFirstMotor ? true : selectedElement.turnout1ClosedValue,
    isFirstMotor ? selectedElement.turnout2ClosedValue : true
  );

  const openedPreview = createDoubleTurnoutPreview(
    selectedElement,
    isFirstMotor ? false : selectedElement.turnout1ClosedValue,
    isFirstMotor ? selectedElement.turnout2ClosedValue : false
  );

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>{prop.label}</Text>

      <Group>
        <Group>
          <Box className="route-turnout-preview-button">
            <ElementPreview
              element={closedPreview}
              label="Closed"
              width={40}
              height={40}
              onClick={() => {
                wsApi.setTurnout(address, propValue);
              }}
            />
          </Box>

          <BitToggleElement value={propValue} onChange={value => onChange(prop, value)} />
        </Group>

        <Group>
          <Box className="route-turnout-preview-button">
            <ElementPreview
              element={openedPreview}
              label="Opened"
              width={40}
              height={40}
              onClick={() => {
                wsApi.setTurnout(address, !propValue);
              }}
            />
          </Box>

          <BitToggleElement value={!propValue} onChange={value => onChange(prop, !value)} />
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
    <Group>
      <Group>
        <Box className="route-turnout-preview-button">
          <ElementPreview
            element={createTurnoutPreview(selectedElement, true)}
            label="Closed"
            width={40}
            height={40}
            onClick={() => {
              wsApi.setTurnout(selectedElement.turnoutAddress, selectedElement.turnoutClosedValue);
            }}
          />
        </Box>

        <BitToggleElement value={propValue} onChange={value => onChange(prop, value)} />
      </Group>

      <Group>
        <Box className="route-turnout-preview-button">
          <ElementPreview
            element={createTurnoutPreview(selectedElement, false)}
            label="Opened"
            width={40}
            height={40}
            onClick={() => {
              wsApi.setTurnout(selectedElement.turnoutAddress, !selectedElement.turnoutClosedValue);
            }}
          />
        </Box>

        <BitToggleElement value={!propValue} onChange={value => onChange(prop, !value)} />
      </Group>
    </Group>
  );
}

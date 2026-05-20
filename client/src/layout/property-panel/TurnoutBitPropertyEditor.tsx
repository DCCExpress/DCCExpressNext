import { Box, Group } from "@mantine/core";

import BitToggleElement from "../../components/editor/BitToggleElement";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import { TrackTurnoutLeftElementView } from "../../models/editor/elements/TrackTurnoutLeftElementView";
import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import { wsApi } from "../../services/wsApi";
import { createTurnoutPreview } from "./previewFactories";
import type { PropertyChangeHandler } from "./propertyPanelTypes";

type TurnoutBitPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  onChange: PropertyChangeHandler;
};

export default function TurnoutBitPropertyEditor({
  prop,
  selectedElement,
  onChange,
}: TurnoutBitPropertyEditorProps) {
  const propValue = Boolean((selectedElement as any)[prop.key]);

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
              const turnout = selectedElement as TrackTurnoutLeftElementView;
              wsApi.setTurnout(
                turnout.turnoutAddress,
                turnout.turnoutClosedValue
              );
            }}
          />
        </Box>

        <BitToggleElement
          value={propValue}
          onChange={value => onChange(prop, value)}
        />
      </Group>

      <Group>
        <Box className="route-turnout-preview-button">
          <ElementPreview
            element={createTurnoutPreview(selectedElement, false)}
            label="Opened"
            width={40}
            height={40}
            onClick={() => {
              const turnout = selectedElement as TrackTurnoutLeftElementView;
              wsApi.setTurnout(
                turnout.turnoutAddress,
                !turnout.turnoutClosedValue
              );
            }}
          />
        </Box>

        <BitToggleElement
          value={!propValue}
          onChange={value => onChange(prop, !value)}
        />
      </Group>
    </Group>
  );
}

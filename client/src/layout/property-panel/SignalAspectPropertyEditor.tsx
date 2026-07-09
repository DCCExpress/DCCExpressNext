import { Box, Group, NumberInput } from "@mantine/core";
import { useTranslation } from "react-i18next";

import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import { createSignalPreview, type SignalPreviewColor } from "./previewFactories";
import type { SelectedElementUpdateHandler } from "./propertyPanelTypes";

type SignalAspectPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  onUpdateSelectedElement: SelectedElementUpdateHandler;
};

type SignalAspectRow = {
  color: SignalPreviewColor;
  labelKey: string;
  valueKey:
    | "valueGreen"
    | "valueRed"
    | "valueYellow"
    | "valueWhite";
  send: (signal: TrackSignalElementView) => void;
  minAspect?: number;
};

const rows: SignalAspectRow[] = [
  {
    color: 1,
    labelKey: "automation.aspects.green",
    valueKey: "valueGreen",
    send: signal => signal.sendGreen(),
  },
  {
    color: 2,
    labelKey: "automation.aspects.red",
    valueKey: "valueRed",
    send: signal => signal.sendRed(),
  },
  {
    color: 3,
    labelKey: "automation.aspects.yellow",
    valueKey: "valueYellow",
    send: signal => signal.sendYellow(),
    minAspect: 3,
  },
  {
    color: 4,
    labelKey: "automation.aspects.white",
    valueKey: "valueWhite",
    send: signal => signal.sendWhite(),
    minAspect: 4,
  },
];

export default function SignalAspectPropertyEditor({
  selectedElement,
  onUpdateSelectedElement,
}: SignalAspectPropertyEditorProps) {
  const { t } = useTranslation();
  const signal = selectedElement as TrackSignalElementView;

  return (
    <Group>
      {rows
        .filter(row => !row.minAspect || signal.aspect >= row.minAspect)
        .map(row => (
          <Group key={row.valueKey}>
            <Box className="route-turnout-preview-button">
              <ElementPreview
                style={{ width: "50%" }}
                element={createSignalPreview(selectedElement, row.color)}
                label={t(row.labelKey)}
                width={40}
                height={40}
                translateX={-10}
                onClick={() => row.send(signal)}
              />
            </Box>

            <NumberInput
              w="50%"
              value={signal[row.valueKey]}
              onChange={value => {
                signal[row.valueKey] = Number(value) ?? 1;
                onUpdateSelectedElement(signal);
              }}
            />
          </Group>
        ))}
    </Group>
  );
}

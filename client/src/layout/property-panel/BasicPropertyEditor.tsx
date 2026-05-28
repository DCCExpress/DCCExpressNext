import {
  ActionIcon,
  Checkbox,
  ColorSwatch,
  FileButton,
  Group,
  NumberInput,
  Select,
  TextInput,
} from "@mantine/core";
import {
  IconFolderOpen,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";

import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import type { PropertyChangeHandler } from "./propertyPanelTypes";

const DEFAULT_COLORS = [
  "#000000",
  "#ffffff",
  "#868e96",
  "#f11414",
  "#fa5252",
  "#e64980",
  "#be4bdb",
  "#7950f2",
  "#4c6ef5",
  "#228be6",
  "#15aabf",
  "#12b886",
  "#40c057",
  "#82c91e",
  "#fab005",
  "#fd7e14",
];

const BARRIER_TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "half", label: "Half" },
  { value: "full", label: "Full" },
];

type BasicPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  onChange: PropertyChangeHandler;
};

export default function BasicPropertyEditor({
  prop,
  selectedElement,
  onChange,
}: BasicPropertyEditorProps) {
  const value = (selectedElement as any)[prop.key];

  if (prop.type === "select" || prop.key === "barrierType") {
    return (
      <Select
        label={prop.label}
        disabled={prop.readonly === true}
        data={prop.options ?? BARRIER_TYPE_OPTIONS}
        value={String(value ?? "")}
        onChange={nextValue => {
          if (nextValue !== null) {
            onChange(prop, nextValue);
          }
        }}
      />
    );
  }

  if (prop.type === "string") {
    return (
      <TextInput
        label={prop.label}
        readOnly={prop.readonly}
        type="text"
        value={value ?? ""}
        onChange={event => onChange(prop, event.target.value)}
      />
    );
  }

  if (prop.type === "audiofile") {
    return (
      <TextInput
        label="Audio file"
        value={value ?? ""}
        onChange={event => onChange(prop, event.target.value)}
        rightSection={
          <Group gap={2} wrap="nowrap">
            <FileButton
              onChange={file => {
                if (!file) {
                  return;
                }

                onChange(prop, file.name);
              }}
              accept="audio/*"
            >
              {fileButtonProps => (
                <ActionIcon
                  {...fileButtonProps}
                  size="sm"
                  variant="subtle"
                  title="Choose audio file"
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    fileButtonProps.onClick?.();
                  }}
                >
                  <IconFolderOpen size={16} />
                </ActionIcon>
              )}
            </FileButton>

            <ActionIcon
              size="sm"
              variant="subtle"
              title="Test audio"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                prop.callback?.();
              }}
            >
              <IconPlayerPlayFilled size={16} />
            </ActionIcon>
          </Group>
        }
        rightSectionWidth={68}
      />
    );
  }

  if (prop.type === "number") {
    return (
      <NumberInput
        label={prop.label}
        disabled={prop.readonly === true}
        min={prop.min}
        max={prop.max}
        value={value ?? 0}
        onChange={nextValue => onChange(prop, nextValue)}
      />
    );
  }

  if (prop.type === "boolean" || prop.type === "checkbox") {
    return (
      <Checkbox
        label={prop.label}
        disabled={prop.readonly === true}
        checked={Boolean(value)}
        onChange={event => onChange(prop, event.target.checked)}
      />
    );
  }

  if (prop.type === "colorpicker") {
    const selectedColor = String(value ?? "").toLowerCase();

    return (
      <>
        <label>{prop.label}</label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 24px)",
            gap: 8,
            marginTop: 8,
          }}
        >
          {DEFAULT_COLORS.map(color => {
            const isSelected = selectedColor === color.toLowerCase();

            return (
              <div
                key={color}
                onClick={() => {
                  if (!prop.readonly) {
                    onChange(prop, color);
                  }
                }}
                style={{
                  width: 32,
                  padding: 3,
                  border: isSelected
                    ? "2px solid #339af0"
                    : "2px solid transparent",
                  borderRadius: 2,
                  cursor: prop.readonly ? "default" : "pointer",
                }}
              >
                <ColorSwatch color={color} size={22} />
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return null;
}

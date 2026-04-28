import { Popover, SimpleGrid, Box, Text, Stack } from "@mantine/core";
import { useState } from "react";
import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import { TrackSignalElement } from "../../models/editor/elements/TrackSignalElement";

type SignalAspect = "red" | "green" | "yellow" | "white";

type SignalAspectPickerProps = {
  value: SignalAspect;
  onChange: (value: SignalAspect) => void;
};

const aspects: SignalAspect[] = ["red", "green", "yellow", "white"];

  const signal2 = new TrackSignalElement(0, 0);
  signal2.aspect = 2;
  
  const signal3 = new TrackSignalElement(0, 0);
  signal3.aspect = 3;
  const signal4 = new TrackSignalElement(0, 0);
  signal4.aspect = 4;


export function SignalAspectPicker({ value, onChange }: SignalAspectPickerProps) {
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom"
      withArrow
      shadow="md"
      trapFocus={false}
      closeOnClickOutside
      closeOnEscape
      withinPortal
    >
      <Popover.Target>
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setOpened((o) => !o);
          }}
          style={{
            cursor: "pointer",
            display: "inline-block",
          }}
        >
          {/* Ide jöhet a jelenlegi signal preview */}
          <ElementPreview element={signal2} label="Track" width={40} height={40} />
        </Box>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Signal aspect
          </Text>

          <SimpleGrid cols={4} spacing="xs">
            {aspects.map((aspect) => (
              <Box
                key={aspect}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(aspect);
                  setOpened(false);
                }}
                style={{
                  cursor: "pointer",
                  border:
                    value === aspect
                      ? "2px solid var(--mantine-color-blue-6)"
                      : "1px solid var(--mantine-color-gray-4)",
                  borderRadius: 8,
                  padding: 6,
                  textAlign: "center",
                  userSelect: "none",
                  touchAction: "manipulation",
                }}
              >
                <ElementPreview element={signal2} label="Track" width={40} height={40} />
                <Text size="xs" mt={4}>
                  {aspect}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
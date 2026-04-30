import { Badge, Group, Stack, Text, Tooltip } from "@mantine/core";

export type CvBitDefinition = {
  bit: number;
  label: string;
  description?: string;
};

type CvBitEditorProps = {
  value: number;
  bits?: CvBitDefinition[];
  onChange: (value: number) => void;
};

const DEFAULT_BITS: CvBitDefinition[] = [
  { bit: 7, label: "Bit 7" },
  { bit: 6, label: "Bit 6" },
  { bit: 5, label: "Bit 5" },
  { bit: 4, label: "Bit 4" },
  { bit: 3, label: "Bit 3" },
  { bit: 2, label: "Bit 2" },
  { bit: 1, label: "Bit 1" },
  { bit: 0, label: "Bit 0" },
];

export default function CvBitEditor({
  value,
  bits = DEFAULT_BITS,
  onChange,
}: CvBitEditorProps) {
  function toggleBit(bit: number) {
    const mask = 1 << bit;
    const next = (value & mask) !== 0 ? value & ~mask : value | mask;

    onChange(clampByte(next));
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Stack>

        <Group gap={4}>
        {/* <Text size="sm" fw={700}>
          Bit editor
        </Text> */}
          <Badge size="sm" variant="light">
            DEC {value}
          </Badge>

          <Badge size="sm" variant="light" tt="none">
            HEX 0x{value.toString(16).padStart(2, "0")}
          </Badge>

          <Badge size="sm" variant="light">
            BIN {toBinary8(value)}
          </Badge>
        </Group>
        </Stack>
      </Group>

      <Group gap={6} wrap="nowrap" style={{ overflowX: "auto" }}>
        {bits
          .slice()
          .map((item) => {
            const active = (value & (1 << item.bit)) !== 0;

            const badge = (
              <Badge
                key={item.bit}
                size="lg"
                variant={active ? "filled" : "light"}
                color={active ? "orange" : "gray"}
                onClick={() => toggleBit(item.bit)}
                style={{
                  cursor: "pointer",
                  minWidth: 48,
                  userSelect: "none",
                }}
              >
                {item.bit}
              </Badge>
            );

            if (!item.description && !item.label) {
              return badge;
            }

            return (
              <Tooltip
                key={item.bit}
                label={`${item.label}${item.description ? ` - ${item.description}` : ""}`}
                withArrow
              >
                {badge}
              </Tooltip>
            );
          })}
      </Group>
    </Stack>
  );
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function toBinary8(value: number): string {
  return value.toString(2).padStart(8, "0");
}
import { Button, SimpleGrid, Slider } from "@mantine/core";

type LocoSpeedControlsProps = {
  speed: number;
  maxSpeed: number;
  disabled?: boolean;
  onSpeedChange: (speed: number) => void;
  onSpeedPercentChange: (percent: number) => void;
};

const SPEED_PRESETS = [
  5,
  10,
  20,
  40,
  80,
  100,
];

export default function LocoSpeedControls({
  speed,
  maxSpeed,
  disabled = false,
  onSpeedChange,
  onSpeedPercentChange,
}: LocoSpeedControlsProps) {
  return (
    <>
      <div style={{ width: "100%" }}>
        <Slider
          min={0}
          max={maxSpeed}
          value={speed}
          onChange={onSpeedChange}
          label={null}
          disabled={disabled}
        />
      </div>

      <SimpleGrid
        cols={6}
        spacing={2}
        p={0}
        w="100%"
      >
        {SPEED_PRESETS.map(preset => (
          <Button
            key={preset}
            size="xs"
            variant="light"
            disabled={disabled}
            onClick={() =>
              onSpeedPercentChange(preset)
            }
          >
            {preset}
          </Button>
        ))}
      </SimpleGrid>
    </>
  );
}

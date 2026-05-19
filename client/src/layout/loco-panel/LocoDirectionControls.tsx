import { Button, Group } from "@mantine/core";
import {
  IconPlayerStop,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
} from "@tabler/icons-react";
import type {
  Direction,
} from "../../../../common/src/types";

type LocoDirectionControlsProps = {
  speed: number;
  direction: Direction;
  onForward: () => void;
  onReverse: () => void;
  onStop: () => void;
};

export default function LocoDirectionControls({
  speed,
  direction,
  onForward,
  onReverse,
  onStop,
}: LocoDirectionControlsProps) {
  return (
    <Group grow gap={4} w="100%">
      <Button
        size="xs"
        variant={
          direction === "reverse"
            ? "filled"
            : "light"
        }
        leftSection={
          <IconPlayerTrackPrev size={14} />
        }
        onClick={onReverse}
      >
        Hátra
      </Button>

      <Button
        size="xs"
        variant={speed > 0 ? "light" : "filled"}
        color="yellow"
        leftSection={
          <IconPlayerStop size={14} />
        }
        onClick={onStop}
      >
        Stop
      </Button>

      <Button
        size="xs"
        variant={
          direction === "forward"
            ? "filled"
            : "light"
        }
        rightSection={
          <IconPlayerTrackNext size={14} />
        }
        onClick={onForward}
      >
        Előre
      </Button>
    </Group>
  );
}

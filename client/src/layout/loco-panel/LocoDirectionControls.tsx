import { Button, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
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
  disabled?: boolean;
  onForward: () => void;
  onReverse: () => void;
  onStop: () => void;
};

export default function LocoDirectionControls({
  speed,
  direction,
  disabled = false,
  onForward,
  onReverse,
  onStop,
}: LocoDirectionControlsProps) {
  const { t } = useTranslation();

  return (
    <Group grow gap={4} w="100%">
      <Button
        size="xs"
        variant={
          direction === "reverse"
            ? "filled"
            : "light"
        }
        disabled={disabled}
        leftSection={
          <IconPlayerTrackPrev size={14} />
        }
        onClick={onReverse}
      >
        {t("loco.direction.reverse")}
      </Button>

      <Button
        size="xs"
        variant={speed > 0 ? "light" : "filled"}
        color="yellow"
        disabled={disabled}
        leftSection={
          <IconPlayerStop size={14} />
        }
        onClick={onStop}
      >
        {t("loco.direction.stop")}
      </Button>

      <Button
        size="xs"
        variant={
          direction === "forward"
            ? "filled"
            : "light"
        }
        disabled={disabled}
        rightSection={
          <IconPlayerTrackNext size={14} />
        }
        onClick={onForward}
      >
        {t("loco.direction.forward")}
      </Button>
    </Group>
  );
}

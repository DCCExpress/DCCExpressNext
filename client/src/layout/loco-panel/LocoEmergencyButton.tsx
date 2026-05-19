import { Button } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

type LocoEmergencyButtonProps = {
  emergencyStop: boolean;
  onToggle: () => void;
};

export default function LocoEmergencyButton({
  emergencyStop,
  onToggle,
}: LocoEmergencyButtonProps) {
  return (
    <Button
      size="md"
      style={{ width: "100%" }}
      color={emergencyStop ? "red" : "gray"}
      className={emergencyStop ? "blinkBadge" : ""}
      leftSection={
        <IconAlertTriangle size={14} />
      }
      onClick={onToggle}
    >
      Emergency
    </Button>
  );
}

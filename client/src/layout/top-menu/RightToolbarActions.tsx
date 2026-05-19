import {
  ActionIcon,
  Group,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconMoon,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import TrainIcon from "../../icons/TrainIcon";

type RightToolbarActionsProps = {
  locoPanelCollapsed: boolean;
  onToggleLocoPanel: () => void;
  propertyPanelCollapsed: boolean;
  onTogglePropertyPanel: () => void;
};

export default function RightToolbarActions({
  locoPanelCollapsed,
  onToggleLocoPanel,
  propertyPanelCollapsed,
  onTogglePropertyPanel,
}: RightToolbarActionsProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Group gap="sm" wrap="nowrap">
      <ActionIcon
        variant="subtle"
        onClick={() =>
          setColorScheme(colorScheme === "dark" ? "light" : "dark")
        }
        aria-label="Theme toggle"
      >
        {colorScheme === "dark" ? (
          <IconSun size={18} />
        ) : (
          <IconMoon size={18} />
        )}
      </ActionIcon>

      <Tooltip
        label={locoPanelCollapsed ? "Loco panel mutatása" : "Loco panel elrejtése"}
        withArrow
        position="bottom"
      >
        <ActionIcon variant="light" size="lg" onClick={onToggleLocoPanel}>
          <TrainIcon size={24} />
        </ActionIcon>
      </Tooltip>

      <Tooltip
        label={
          propertyPanelCollapsed
            ? "Property panel mutatása"
            : "Property panel elrejtése"
        }
        withArrow
        position="bottom"
      >
        <ActionIcon
          variant={propertyPanelCollapsed ? "light" : "filled"}
          size="sm"
          onClick={onTogglePropertyPanel}
        >
          <IconSettings size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

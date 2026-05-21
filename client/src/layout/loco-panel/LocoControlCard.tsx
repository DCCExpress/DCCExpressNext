import { Badge, Card, Stack, Text, Title, useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type {
  Direction,
  Loco,
  LocoReservation,
} from "../../../../common/src/types";
import LocoImage from "../../components/loco/LocoImage";
import LocoDirectionControls from "./LocoDirectionControls";
import LocoEmergencyButton from "./LocoEmergencyButton";
import LocoSpeedControls from "./LocoSpeedControls";

type LocoControlCardProps = {
  loco: Loco;
  speed: number;
  direction: Direction;
  alive: boolean;
  emergencyStop: boolean;
  reservation?: LocoReservation | null;
  controlsDisabled?: boolean;
  onOpenPicker: () => void;
  onSpeedChange: (speed: number) => void;
  onSpeedPercentChange: (percent: number) => void;
  onForward: () => void;
  onReverse: () => void;
  onStop: () => void;
  onEmergencyToggle: () => void;
};

export default function LocoControlCard({
  loco,
  speed,
  direction,
  alive,
  emergencyStop,
  reservation = null,
  controlsDisabled = false,
  onOpenPicker,
  onSpeedChange,
  onSpeedPercentChange,
  onForward,
  onReverse,
  onStop,
  onEmergencyToggle,
}: LocoControlCardProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const badgeBg =
    colorScheme === "dark"
      ? theme.colors.dark[5]
      : theme.colors.blue[0];

  const badgeBorder =
    colorScheme === "dark"
      ? theme.colors.dark[3]
      : theme.colors.blue[2];

  const badgeText =
    colorScheme === "dark"
      ? theme.colors.blue[1]
      : theme.colors.blue[8];

  return (
    <Card withBorder radius="sm" p="xs">
      <Stack align="center" gap={0}>
        <LocoImage
          image={loco.image}
          name={loco.name}
          width={400}
          height={60}
          clickable
          onClick={onOpenPicker}
        />
      </Stack>

      <Stack gap="xs" align="center">
        <Text fw={700} ta="center">
          #{loco.address}{" "}
          {loco.name || t("loco.unnamed")}
        </Text>

        {(reservation) && (
          <Badge
            color="orange"
            variant="light"
            radius="sm"
            maw="100%"
            style={{
              textTransform: "none",
              whiteSpace: "normal",
              textAlign: "center",
            }}
          >
            Foglalt: {reservation.ownerName ?? reservation.ownerId}
          </Badge>
        )}

        <Badge
          radius={4}
          m={4}
          size="xl"
          w={120}
          h="auto"
          px="md"
          py={6}
          styles={{
            root: {
              backgroundColor: badgeBg,
              border: `1px solid ${badgeBorder}`,
            },
            label: {
              height: "auto",
              lineHeight: 1,
              textTransform: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          }}
        >
          <Title
            order={1}
            fw={700}
            lh={1}
            style={{
              color: badgeText,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {speed}
          </Title>
        </Badge>

        {!alive && (
          <Badge color="red" variant="light">
            {t("common.offline")}
          </Badge>
        )}

        <LocoSpeedControls
          speed={speed}
          maxSpeed={loco.maxSpeed || 100}
          disabled={controlsDisabled}
          onSpeedChange={onSpeedChange}
          onSpeedPercentChange={
            onSpeedPercentChange
          }
        />

        <LocoDirectionControls
          speed={speed}
          direction={direction}
          disabled={controlsDisabled}
          onForward={onForward}
          onReverse={onReverse}
          onStop={onStop}
        />

        <LocoEmergencyButton
          emergencyStop={emergencyStop}
          onToggle={onEmergencyToggle}
        />
      </Stack>
    </Card>
  );
}

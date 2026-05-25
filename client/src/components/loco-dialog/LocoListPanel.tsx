import {
  Button,
  Card,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";

import {
  IconPhoto,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import type { Loco } from "../../../../common/src/types";

type LocoListPanelProps = {
  locos: Loco[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDeleteSelected: () => void;
  hasSelectedLoco: boolean;
  t: (key: string) => string;
};

export default function LocoListPanel({
  locos,
  selectedId,
  onSelect,
  onAdd,
  onDeleteSelected,
  hasSelectedLoco,
  t,
}: LocoListPanelProps) {
  return (
    <Card withBorder p="sm" style={{ width: 320, display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" mb="sm">
        <Text fw={600}>{t("locodialog.mozdonylista")}</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={onAdd}>
          {t("locodialog.newloco")}
        </Button>
      </Group>

      <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="xs">
          {locos.map(loco => (
            <Card
              key={loco.id}
              withBorder
              p="sm"
              onClick={() => onSelect(loco.id)}
              style={{
                cursor: "pointer",
                borderColor: loco.id === selectedId ? "var(--mantine-color-blue-5)" : undefined,
                backgroundColor: loco.id === selectedId ? "var(--mantine-color-default-hover)" : undefined,
              }}
            >
              <Group wrap="nowrap">
                {loco.image ? (
                  <img
                    src={loco.image}
                    alt={loco.name || "Loco"}
                    style={{ height: 42, maxWidth: 110, objectFit: "contain" }}
                  />
                ) : (
                  <IconPhoto size={24} style={{ opacity: 0.5 }} />
                )}

                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text fw={600} truncate>{loco.name || t("locodialog.unknownloco")}</Text>
                  <Text size="sm" c="dimmed">{t("locodialog.locoaddress")}: {loco.address}</Text>
                  <Text size="sm" c="dimmed">{t("locodialog.loco_speed_max")}: {loco.maxSpeed}</Text>
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      </ScrollArea>

      <Divider my="sm" />

      <Button
        variant="light"
        color="red"
        leftSection={<IconTrash size={14} />}
        onClick={onDeleteSelected}
        disabled={!hasSelectedLoco}
      >
        {t("locodialog.delete")}
      </Button>
    </Card>
  );
}

import { Button, Divider, Group, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import AppModal from "./common/AppModal";
import LocoDialogContent from "./loco-dialog/LocoDialogContent";
import { useLocoDialogState } from "./loco-dialog/useLocoDialogState";

type LocoDialogProps = {
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function LocoDialog({ opened, onClose, onSaved }: LocoDialogProps) {
  const { t } = useTranslation();
  const state = useLocoDialogState(opened, onSaved, t);
  const ok = state.message.includes("siker");

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={t("locodialog.locomotives")}
      size="min(1480px, 95vw)"
      centered
      draggable
      styles={{ body: { height: "min(740px, calc(100vh - 120px))", display: "flex", flexDirection: "column", overflow: "hidden" } }}
    >
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
        {state.loading ? (
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <Loader />
            <Text size="sm" c="dimmed">{t("locodialog.loading")}</Text>
          </Stack>
        ) : (
          <LocoDialogContent state={state} t={t} />
        )}

        <Divider />

        <Group justify="space-between">
          <Text size="sm" c={ok ? "green" : "dimmed"}>{state.message || ""}</Text>
          <Group>
            <Button onClick={() => void state.handleSave()} loading={state.saving}>{t("locodialog.save")}</Button>
            <Button variant="light" onClick={onClose}>{t("locodialog.close")}</Button>
          </Group>
        </Group>
      </Stack>
    </AppModal>
  );
}

// client/src/components/app-settings/AppSettingsDialog.tsx

import {
  Alert,
  Button,
  Group,
  LoadingOverlay,
  Stack,
  Tabs,
} from "@mantine/core";

import {
  useEffect,
  useState,
} from "react";

import type {
  AppSettings,
} from "../../../../common/src/appSettings";

import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
} from "../../../../common/src/appSettings";

import {
  loadAppSettingsWs,
  storeAppSettingsWs,
} from "../../api/appSettingsWsApi";

import {
  showErrorMessage,
  showOkMessage,
} from "../../helpers";

import AppModal from "../common/AppModal";
import CommandCenterSettingsTab from "./CommandCenterSettingsTab";
import FastClockSettingsTab from "./FastClockSettingsTab";

type AppSettingsDialogProps = {
  opened: boolean;
  onClose: () => void;
};

export default function AppSettingsDialog({
  opened,
  onClose,
}: AppSettingsDialogProps) {
  const [settings, setSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!opened) {
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    loadAppSettingsWs()
      .then(nextSettings => {
        if (cancelled) {
          return;
        }

        setSettings(normalizeAppSettings(nextSettings));
      })
      .catch(loadError => {
        if (cancelled) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : String(loadError);

        setError(message);
        showErrorMessage(
          "App settings",
          message
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [opened]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      const savedSettings =
        await storeAppSettingsWs(settings);

      setSettings(normalizeAppSettings(savedSettings));

      showOkMessage(
        "App settings",
        "Settings saved."
      );

      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : String(saveError);

      setError(message);
      showErrorMessage(
        "App settings",
        message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="App settings"
      size="lg"
      centered
      draggable
    >
      <Stack gap="md" pos="relative">
        <LoadingOverlay visible={loading || saving} />

        {error && (
          <Alert color="red" title="Settings error">
            {error}
          </Alert>
        )}

        <Tabs defaultValue="fastClock">
          <Tabs.List>
            <Tabs.Tab value="fastClock">
              Fast clock
            </Tabs.Tab>

            <Tabs.Tab value="commandCenter">
              Command center
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="fastClock" pt="md">
            <FastClockSettingsTab
              settings={settings}
              onChange={setSettings}
            />
          </Tabs.Panel>

          <Tabs.Panel value="commandCenter" pt="md">
            <CommandCenterSettingsTab
              commandCenter={settings.commandCenter}
              onChange={commandCenter => {
                setSettings(current => ({
                  ...current,
                  commandCenter,
                }));
              }}
            />
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end">
          <Button
            variant="light"
            color="gray"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              void handleSave();
            }}
            loading={saving}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
}

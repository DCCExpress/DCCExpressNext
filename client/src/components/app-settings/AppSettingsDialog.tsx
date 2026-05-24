// client/src/components/app-settings/AppSettingsDialog.tsx

import {
  Alert,
  Button,
  Group,
  LoadingOverlay,
  Stack,
  Tabs,
} from "@mantine/core";

import i18n from "i18next";

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
import FastClockSettingsTab from "./FastClockSettingsTab";
import GeneralSettingsTab from "./GeneralSettingsTab";
import SystemSettingsTab from "./SystemSettingsTab";

const LANG_KEY = "lang";

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
      const savedSettings = normalizeAppSettings(
        await storeAppSettingsWs(settings)
      );

      setSettings(savedSettings);
      localStorage.setItem(
        LANG_KEY,
        savedSettings.general.language
      );
      await i18n.changeLanguage(
        savedSettings.general.language
      );

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
      size="900px"
      centered
      draggable
    >
      <Stack
        gap="md"
        pos="relative"
        h={680}
        style={{ overflow: "hidden" }}
      >
        <LoadingOverlay visible={loading || saving} />

        {error && (
          <Alert color="red" title="Settings error">
            {error}
          </Alert>
        )}

        <Tabs
          defaultValue="system"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="system">
              System
            </Tabs.Tab>

            <Tabs.Tab value="general">
              General
            </Tabs.Tab>

            <Tabs.Tab value="fastClock">
              Fast clock
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel
            value="system"
            pt="md"
            style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
          >
            <SystemSettingsTab
              commandCenter={settings.commandCenter}
              onCommandCenterChange={commandCenter => {
                setSettings(current => ({
                  ...current,
                  commandCenter,
                }));
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel
            value="general"
            pt="md"
            style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
          >
            <GeneralSettingsTab
              settings={settings.general}
              onChange={general => {
                setSettings(current => ({
                  ...current,
                  general,
                }));
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel
            value="fastClock"
            pt="md"
            style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
          >
            <FastClockSettingsTab
              settings={settings}
              onChange={setSettings}
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

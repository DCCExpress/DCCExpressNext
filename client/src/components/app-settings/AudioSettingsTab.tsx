import { useState } from "react";

import {
  Button,
  Card,
  Group,
  Radio,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import type { AppSettings, AudioSettings } from "../../../../common/src/appSettings";
import {
  getClientIdentity,
  regenerateClientIdentity,
  saveClientFriendlyName,
} from "../../services/clientIdentity";

type AudioSettingsTabProps = {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
};

export default function AudioSettingsTab({
  settings,
  onChange,
}: AudioSettingsTabProps) {
  const [identity, setIdentity] = useState(() => getClientIdentity());

  const patchAudio = (audioPatch: Partial<AudioSettings>): void => {
    onChange({
      ...settings,
      audio: {
        ...settings.audio,
        ...audioPatch,
      },
    });
  };

  const setThisClientAsAudioPlayer = (): void => {
    patchAudio({
      mode: "selectedClient",
      selectedClientId: identity.clientId,
      selectedClientName: identity.friendlyName,
    });
  };

  return (
    <Stack gap="md">
      <Card withBorder p="md">
        <Stack gap="sm">
          <Text fw={600}>This client</Text>

          <TextInput
            label="Friendly name"
            value={identity.friendlyName}
            onChange={event => {
              const next = saveClientFriendlyName(event.currentTarget.value);
              setIdentity(next);

              if (settings.audio.selectedClientId === next.clientId) {
                patchAudio({ selectedClientName: next.friendlyName });
              }
            }}
          />

          <TextInput
            label="Client ID"
            value={identity.clientId}
            readOnly
          />

          <Group>
            <Button
              variant="light"
              onClick={() => {
                const previousClientId = identity.clientId;
                const next = regenerateClientIdentity();
                setIdentity(next);

                if (settings.audio.selectedClientId === previousClientId) {
                  patchAudio({
                    selectedClientId: next.clientId,
                    selectedClientName: next.friendlyName,
                  });
                }
              }}
            >
              Generate new ID
            </Button>

            <Button
              variant="light"
              color="green"
              onClick={setThisClientAsAudioPlayer}
            >
              Set this client as audio player
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder p="md">
        <Stack gap="sm">
          <Text fw={600}>Audio playback</Text>

          <Radio.Group
            label="Playback mode"
            value={settings.audio.mode}
            onChange={value => {
              patchAudio({
                mode: value === "selectedClient" ? "selectedClient" : "allClients",
              });
            }}
          >
            <Stack gap="xs" mt="xs">
              <Radio value="allClients" label="All clients" />
              <Radio value="selectedClient" label="Selected client only" />
            </Stack>
          </Radio.Group>

          <TextInput
            label="Selected audio player"
            value={settings.audio.selectedClientName || settings.audio.selectedClientId || "No selected client"}
            readOnly
          />

          <Text size="sm" c="dimmed">
            Selected client audio uses the saved Client ID. The friendly name is only for humans.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}

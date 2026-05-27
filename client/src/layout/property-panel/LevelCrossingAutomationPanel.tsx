import {
  Button,
  Card,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";

import type {
  LevelCrossingLogic,
  LevelCrossingLogicDocumentDto,
} from "../../../../common/src/levelCrossingLogic";
import {
  createDefaultLevelCrossingLogic,
} from "../../../../common/src/levelCrossingLogic";
import {
  evaluateLevelCrossingRuntimeOnceWs,
  loadLevelCrossingLogicWs,
  saveLevelCrossingLogicWs,
  startLevelCrossingRuntimeWs,
  stopLevelCrossingRuntimeWs,
} from "../../api/levelCrossingWsApi";
import { generateId, showErrorMessage, showOkMessage } from "../../helpers";
import { TrackLevelCrossingElementView } from "../../models/editor/elements/TrackLevelCrossingElementView";

type LevelCrossingAutomationPanelProps = {
  selectedElement: TrackLevelCrossingElementView;
};

function createLogicForElement(
  selectedElement: TrackLevelCrossingElementView
): LevelCrossingLogic {
  const logic = createDefaultLevelCrossingLogic(
    generateId(),
    selectedElement.id
  );

  logic.actions = selectedElement.basicAccessoryAddress > 0
    ? [{
        id: generateId(),
        type: "setAccessory",
        address: selectedElement.basicAccessoryAddress,
        activeWhenClosed: selectedElement.basicAccessoryClosedValue,
      }]
    : [];

  return logic;
}

function upsertLogicForElement(
  document: LevelCrossingLogicDocumentDto,
  selectedElement: TrackLevelCrossingElementView
): LevelCrossingLogicDocumentDto {
  const existingIndex = document.crossings.findIndex(
    logic => logic.levelCrossingElementId === selectedElement.id
  );

  const existing = existingIndex >= 0
    ? document.crossings[existingIndex]
    : undefined;

  const nextLogic = existing ?? createLogicForElement(selectedElement);
  const nextCrossings = [...document.crossings];

  if (existingIndex >= 0) {
    nextCrossings[existingIndex] = nextLogic;
  } else {
    nextCrossings.unshift(nextLogic);
  }

  return {
    ...document,
    crossings: nextCrossings,
  };
}

export default function LevelCrossingAutomationPanel({
  selectedElement,
}: LevelCrossingAutomationPanelProps) {
  const [busy, setBusy] = useState(false);

  const runCommand = async (
    command: () => Promise<void>
  ): Promise<void> => {
    try {
      setBusy(true);
      await command();
    } catch (error) {
      showErrorMessage(
        "Level crossing automation",
        error instanceof Error
          ? error.message
          : String(error)
      );
    } finally {
      setBusy(false);
    }
  };

  const ensureLogic = async (): Promise<void> => {
    const document = await loadLevelCrossingLogicWs();
    const nextDocument = upsertLogicForElement(document, selectedElement);
    await saveLevelCrossingLogicWs(nextDocument);

    showOkMessage(
      "Level crossing automation",
      "Automation entry is ready for this level crossing."
    );
  };

  const startRuntime = async (): Promise<void> => {
    await startLevelCrossingRuntimeWs();
    showOkMessage("Level crossing automation", "Runtime started.");
  };

  const stopRuntime = async (): Promise<void> => {
    await stopLevelCrossingRuntimeWs();
    showOkMessage("Level crossing automation", "Runtime stopped.");
  };

  const evaluateOnce = async (): Promise<void> => {
    await evaluateLevelCrossingRuntimeOnceWs();
    showOkMessage("Level crossing automation", "Runtime evaluated once.");
  };

  return (
    <Card withBorder p="xs" mr={16} mb={12}>
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Level crossing automation
        </Text>

        <Text size="xs" c="dimmed">
          Create or update the server-side automation entry for this crossing.
        </Text>

        <Button
          size="xs"
          variant="light"
          loading={busy}
          onClick={() => void runCommand(ensureLogic)}
        >
          Prepare automation
        </Button>

        <Group gap="xs" grow>
          <Button
            size="xs"
            color="green"
            variant="light"
            loading={busy}
            onClick={() => void runCommand(startRuntime)}
          >
            Start
          </Button>

          <Button
            size="xs"
            color="red"
            variant="light"
            loading={busy}
            onClick={() => void runCommand(stopRuntime)}
          >
            Stop
          </Button>
        </Group>

        <Button
          size="xs"
          color="orange"
          variant="light"
          loading={busy}
          onClick={() => void runCommand(evaluateOnce)}
        >
          Evaluate once
        </Button>
      </Stack>
    </Card>
  );
}

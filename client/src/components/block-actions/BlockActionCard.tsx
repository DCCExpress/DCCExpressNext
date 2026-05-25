import {
  ActionIcon,
  Badge,
  Card,
  FileButton,
  Group,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";

import {
  IconArrowDown,
  IconArrowUp,
  IconFolderOpen,
  IconPlayerPlayFilled,
  IconTrash,
} from "@tabler/icons-react";

import type { BlockAction } from "../../../../common/src/types";
import { audioManager } from "../../services/audioManager";
import {
  BLOCK_ACTION_TYPE_OPTIONS,
  convertBlockActionType,
  getBlockActionSummary,
  type BlockActionType,
} from "./blockActionHelpers";

type BlockActionCardProps = {
  action: BlockAction;
  actionIndex: number;
  actionCount: number;
  onMoveByOffset: (actionId: string, offset: number) => void;
  onUpdateAction: (actionId: string, nextAction: BlockAction) => void;
  onDeleteAction: (actionId: string) => void;
};

export default function BlockActionCard({
  action,
  actionIndex,
  actionCount,
  onMoveByOffset,
  onUpdateAction,
  onDeleteAction,
}: BlockActionCardProps) {
  const updateCurrentAction = (nextAction: BlockAction): void => {
    onUpdateAction(action.id, nextAction);
  };

  return (
    <Card withBorder p="sm">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Badge variant="filled" color="blue" miw={34} ta="center">
              #{actionIndex + 1}
            </Badge>
            <Badge variant="light">{getBlockActionSummary(action)}</Badge>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <ActionIcon color="gray" variant="light" disabled={actionIndex === 0} onClick={() => onMoveByOffset(action.id, -1)}>
              <IconArrowUp size={16} />
            </ActionIcon>

            <ActionIcon color="gray" variant="light" disabled={actionIndex >= actionCount - 1} onClick={() => onMoveByOffset(action.id, 1)}>
              <IconArrowDown size={16} />
            </ActionIcon>

            <ActionIcon color="red" variant="light" onClick={() => onDeleteAction(action.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <Group align="flex-end" wrap="wrap">
          <Select
            label="Action type"
            value={action.type}
            data={BLOCK_ACTION_TYPE_OPTIONS}
            w={210}
            allowDeselect={false}
            onChange={value => {
              if (!value) return;
              updateCurrentAction(convertBlockActionType(action, value as BlockActionType));
            }}
          />

          {action.type === "playAudio" && (
            <TextInput
              label="Audio file"
              value={action.fileName}
              placeholder="station.mp3"
              w={320}
              onChange={event => updateCurrentAction({ ...action, fileName: event.currentTarget.value })}
              rightSection={
                <Group gap={2} wrap="nowrap">
                  <FileButton
                    onChange={file => {
                      if (!file) return;
                      updateCurrentAction({ ...action, fileName: file.name });
                    }}
                    accept="audio/*"
                  >
                    {fileButtonProps => (
                      <ActionIcon
                        {...fileButtonProps}
                        size="sm"
                        variant="subtle"
                        title="Choose audio file"
                        onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          fileButtonProps.onClick?.();
                        }}
                      >
                        <IconFolderOpen size={16} />
                      </ActionIcon>
                    )}
                  </FileButton>

                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    title="Test audio"
                    disabled={!action.fileName.trim()}
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      audioManager.play(action.fileName.trim());
                    }}
                  >
                    <IconPlayerPlayFilled size={16} />
                  </ActionIcon>
                </Group>
              }
              rightSectionWidth={68}
            />
          )}

          {action.type === "wait" && (
            <NumberInput
              label="Wait (ms)"
              value={action.ms}
              min={1}
              step={100}
              w={150}
              onChange={value => updateCurrentAction({ ...action, ms: Number(value) || 1 })}
            />
          )}
        </Group>
      </Stack>
    </Card>
  );
}

import {
  Button,
  Card,
  Group,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";

import { IconPlus } from "@tabler/icons-react";

import type {
  BlockAction,
  BlockActionHook,
} from "../../../../common/src/types";

import AppModal from "../common/AppModal";
import BlockActionCard from "./BlockActionCard";
import {
  BLOCK_ACTION_HOOKS,
  createDefaultBlockAction,
  moveItem,
  type BlockActionType,
} from "./blockActionHelpers";

type BlockActionsDialogProps = {
  opened: boolean;
  blockName: string;
  actions: Partial<Record<BlockActionHook, BlockAction[]>>;
  onChange: (actions: Partial<Record<BlockActionHook, BlockAction[]>>) => void;
  onClose: () => void;
};

export default function BlockActionsDialog({
  opened,
  blockName,
  actions,
  onChange,
  onClose,
}: BlockActionsDialogProps) {
  const getActions = (hook: BlockActionHook): BlockAction[] => actions[hook] ?? [];

  const updateActionsForHook = (
    hook: BlockActionHook,
    nextActions: BlockAction[]
  ): void => {
    onChange({
      ...actions,
      [hook]: nextActions,
    });
  };

  const addAction = (
    hook: BlockActionHook,
    type: BlockActionType
  ): void => {
    updateActionsForHook(
      hook,
      [
        ...getActions(hook),
        createDefaultBlockAction(type),
      ]
    );
  };

  const updateAction = (
    hook: BlockActionHook,
    actionId: string,
    nextAction: BlockAction
  ): void => {
    updateActionsForHook(
      hook,
      getActions(hook).map(action => action.id === actionId ? nextAction : action)
    );
  };

  const deleteAction = (
    hook: BlockActionHook,
    actionId: string
  ): void => {
    updateActionsForHook(
      hook,
      getActions(hook).filter(action => action.id !== actionId)
    );
  };

  const moveActionByOffset = (
    hook: BlockActionHook,
    actionId: string,
    offset: number
  ): void => {
    const currentActions = getActions(hook);
    const fromIndex = currentActions.findIndex(action => action.id === actionId);
    updateActionsForHook(hook, moveItem(currentActions, fromIndex, fromIndex + offset));
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={`Block actions${blockName ? ` - ${blockName}` : ""}`}
      size="min(980px, 95vw)"
      centered
      draggable
      styles={{
        body: {
          height: "min(620px, calc(100vh - 120px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
        <Tabs defaultValue="onTrainEnter" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Tabs.List>
            {BLOCK_ACTION_HOOKS.map(hook => (
              <Tabs.Tab key={hook.value} value={hook.value}>
                {hook.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {BLOCK_ACTION_HOOKS.map(hook => {
            const hookActions = getActions(hook.value);

            return (
              <Tabs.Panel
                key={hook.value}
                value={hook.value}
                pt="md"
                style={{ flex: 1, minHeight: 0 }}
              >
                <Stack gap="sm" h="100%">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                      <Text fw={600}>{hook.label}</Text>
                      <Text size="sm" c="dimmed">{hook.description}</Text>
                    </Stack>

                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={() => addAction(hook.value, "playAudio")}
                      >
                        Audio
                      </Button>

                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={() => addAction(hook.value, "wait")}
                      >
                        Wait
                      </Button>
                    </Group>
                  </Group>

                  <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                    <Stack gap="sm">
                      {hookActions.map((action, actionIndex) => (
                        <BlockActionCard
                          key={action.id}
                          action={action}
                          actionIndex={actionIndex}
                          actionCount={hookActions.length}
                          onMoveByOffset={(actionId, offset) => moveActionByOffset(hook.value, actionId, offset)}
                          onUpdateAction={(actionId, nextAction) => updateAction(hook.value, actionId, nextAction)}
                          onDeleteAction={actionId => deleteAction(hook.value, actionId)}
                        />
                      ))}

                      {hookActions.length === 0 && (
                        <Card withBorder p="md">
                          <Text size="sm" c="dimmed">
                            No block actions yet. Add an audio or wait step.
                          </Text>
                        </Card>
                      )}
                    </Stack>
                  </ScrollArea>
                </Stack>
              </Tabs.Panel>
            );
          })}
        </Tabs>

        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </AppModal>
  );
}

import {
  type DragEvent,
  useState,
} from "react";

import {
  Button,
  Card,
  Group,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";

import {
  IconDeviceFloppy,
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";

import type {
  BlockAction,
  BlockActionHook,
} from "../../../../common/src/types";

import { generateId } from "../../helpers";
import { wsApi } from "../../services/wsApi";
import AppModal from "../common/AppModal";
import BlockActionCard from "./BlockActionCard";
import {
  BLOCK_ACTION_HOOKS,
  createDefaultBlockAction,
  moveItem,
  type BlockActionType,
} from "./blockActionHelpers";

type BlockActionsEditorProps = {
  blockId: string;
  blockName: string;
  actions: Partial<Record<BlockActionHook, BlockAction[]>>;
  onChange: (actions: Partial<Record<BlockActionHook, BlockAction[]>>) => void;
  onClose?: () => void;
};

export function BlockActionsEditor({
  blockId,
  blockName,
  actions,
  onChange,
  onClose,
}: BlockActionsEditorProps) {
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [testingHook, setTestingHook] = useState<BlockActionHook | null>(null);
  const [testMessage, setTestMessage] = useState("");

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

  const moveDraggedActionToIndex = (
    hook: BlockActionHook,
    targetIndex: number
  ): void => {
    if (!draggedActionId) return;

    const currentActions = getActions(hook);
    const fromIndex = currentActions.findIndex(action => action.id === draggedActionId);
    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, currentActions.length - 1));

    if (fromIndex < 0 || fromIndex === boundedTargetIndex) return;

    updateActionsForHook(hook, moveItem(currentActions, fromIndex, boundedTargetIndex));
  };

  const handleActionDragStart = (
    event: DragEvent<HTMLDivElement>,
    actionId: string
  ): void => {
    setDraggedActionId(actionId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", actionId);
  };

  const clearDragState = (): void => {
    setDraggedActionId(null);
  };

  const runActionListTest = (hook: BlockActionHook): void => {
    const hookActions = getActions(hook);

    if (hookActions.length === 0) {
      setTestMessage("Nincs mit tesztelni ebben a listában.");
      return;
    }

    setTestingHook(hook);
    setTestMessage("Teszt indítása a szerveren...");

    const sent = wsApi.send("taskManagerCommand" as any, {
      requestId: generateId(),
      action: "testBlockActionList",
      blockId,
      hook,
      actions: hookActions,
      blockName,
    } as any);

    if (!sent) {
      setTestingHook(null);
      setTestMessage("Nem sikerült elküldeni a teszt parancsot.");
      return;
    }

    window.setTimeout(() => {
      setTestingHook(current => current === hook ? null : current);
      setTestMessage(current => current === "Teszt indítása a szerveren..." ? "Teszt parancs elküldve." : current);
    }, 500);
  };

  return (
    <Stack gap="md" style={{ flex: 1, minHeight: 0, height: "100%" }}>
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
                    {testMessage && testingHook === hook.value && (
                      <Text size="xs" c={testMessage.includes("siker") ? "red" : "dimmed"}>
                        {testMessage}
                      </Text>
                    )}
                  </Stack>

                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      color="green"
                      leftSection={<IconPlayerPlay size={14} />}
                      loading={testingHook === hook.value}
                      disabled={testingHook !== null || hookActions.length === 0}
                      onClick={() => runActionListTest(hook.value)}
                    >
                      Test list
                    </Button>

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
                        draggedActionId={draggedActionId}
                        onDragStart={handleActionDragStart}
                        onDragEnd={clearDragState}
                        onDragOverAction={(event, actionId, targetIndex) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          if (draggedActionId && draggedActionId !== actionId) moveDraggedActionToIndex(hook.value, targetIndex);
                        }}
                        onMoveByOffset={(actionId, offset) => moveActionByOffset(hook.value, actionId, offset)}
                        onUpdateAction={(actionId, nextAction) => updateAction(hook.value, actionId, nextAction)}
                        onDeleteAction={actionId => deleteAction(hook.value, actionId)}
                      />
                    ))}

                    {draggedActionId && hookActions.length > 0 && (
                      <Card
                        withBorder
                        p="sm"
                        onDragOver={event => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          moveDraggedActionToIndex(hook.value, hookActions.length);
                        }}
                        style={{ borderStyle: "dashed", opacity: 0.45 }}
                      >
                        <Text size="sm" c="dimmed" ta="center">Move to end</Text>
                      </Card>
                    )}

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

      {onClose && (
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>Close</Button>
        </Group>
      )}
    </Stack>
  );
}

type BlockActionsDialogProps = BlockActionsEditorProps & {
  opened: boolean;
  onClose: () => void;
  onSave?: () => Promise<void> | void;
};

export default function BlockActionsDialog({
  opened,
  blockId,
  blockName,
  actions,
  onChange,
  onClose,
  onSave,
}: BlockActionsDialogProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    if (!onSave) return;

    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
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
      <Stack h="100%" gap="md">
        <BlockActionsEditor
          blockId={blockId}
          blockName={blockName}
          actions={actions}
          onChange={onChange}
        />

        <Group justify="flex-end">
          {onSave && (
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saving}
              onClick={handleSave}
            >
              Save
            </Button>
          )}
          <Button variant="light" onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </AppModal>
  );
}

import {
  type DragEvent,
  useMemo,
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
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";

import type {
  Loco,
  LocoAction,
  LocoActionHook,
} from "../../../../common/src/types";

import { wsApi } from "../../services/wsApi";
import LocoActionCard from "./LocoActionCard";
import {
  ACTION_HOOKS,
  createDefaultAction,
  getLocoActions,
  moveItem,
  type LocoActionType,
} from "./locoDialogHelpers";

type FunctionOption = {
  value: string;
  label: string;
};

type LocoActionsTabProps = {
  selectedLoco: Loco;
  activeActionHook: LocoActionHook;
  onActiveActionHookChange: (hook: LocoActionHook) => void;
  functionOptions: FunctionOption[];
  onUpdateActionsForHook: (
    hook: LocoActionHook,
    actions: LocoAction[]
  ) => void;
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => window.setTimeout(resolve, Math.max(0, ms)));

export default function LocoActionsTab({
  selectedLoco,
  activeActionHook,
  onActiveActionHookChange,
  functionOptions,
  onUpdateActionsForHook,
}: LocoActionsTabProps) {
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [testingHook, setTestingHook] = useState<LocoActionHook | null>(null);
  const [testMessage, setTestMessage] = useState("");

  const selectedHookInfo = useMemo(
    () => ACTION_HOOKS.find(item => item.value === activeActionHook) ?? ACTION_HOOKS[0]!,
    [activeActionHook]
  );

  const addAction = (
    hook: LocoActionHook,
    type: LocoActionType = "wait"
  ): void => {
    onUpdateActionsForHook(
      hook,
      [
        ...getLocoActions(selectedLoco, hook),
        createDefaultAction(type),
      ]
    );
  };

  const updateAction = (
    hook: LocoActionHook,
    actionId: string,
    nextAction: LocoAction
  ): void => {
    onUpdateActionsForHook(
      hook,
      getLocoActions(selectedLoco, hook).map(action =>
        action.id === actionId
          ? nextAction
          : action
      )
    );
  };

  const deleteAction = (
    hook: LocoActionHook,
    actionId: string
  ): void => {
    onUpdateActionsForHook(
      hook,
      getLocoActions(selectedLoco, hook).filter(action => action.id !== actionId)
    );
  };

  const moveActionByOffset = (
    hook: LocoActionHook,
    actionId: string,
    offset: number
  ): void => {
    const actions = getLocoActions(selectedLoco, hook);
    const fromIndex = actions.findIndex(action => action.id === actionId);
    const toIndex = fromIndex + offset;

    onUpdateActionsForHook(
      hook,
      moveItem(actions, fromIndex, toIndex)
    );
  };

  const moveDraggedActionToIndex = (
    hook: LocoActionHook,
    targetIndex: number
  ): void => {
    if (!draggedActionId) {
      return;
    }

    const actions = getLocoActions(selectedLoco, hook);
    const fromIndex = actions.findIndex(action => action.id === draggedActionId);
    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, actions.length - 1));

    if (fromIndex < 0 || fromIndex === boundedTargetIndex) {
      return;
    }

    onUpdateActionsForHook(
      hook,
      moveItem(actions, fromIndex, boundedTargetIndex)
    );
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

  const runActionListTest = async (hook: LocoActionHook): Promise<void> => {
    const actions = getLocoActions(selectedLoco, hook);

    if (actions.length === 0) {
      setTestMessage("Nincs mit tesztelni ebben a listában.");
      return;
    }

    try {
      setTestingHook(hook);
      setTestMessage(`Teszt fut: ${actions.length} lépés...`);

      for (const action of actions) {
        switch (action.type) {
          case "setFunction":
            await wsApi.setLocoFunction(
              selectedLoco.address,
              action.functionNumber,
              action.active
            );
            break;

          case "momentaryFunction":
            await wsApi.setLocoFunction(
              selectedLoco.address,
              action.functionNumber,
              true
            );
            await sleep(action.ms);
            await wsApi.setLocoFunction(
              selectedLoco.address,
              action.functionNumber,
              false
            );
            break;

          case "wait":
            await sleep(action.ms);
            break;
        }
      }

      setTestMessage("Teszt kész.");
    } catch (error) {
      console.error(error);
      setTestMessage("A teszt közben hiba történt.");
    } finally {
      setTestingHook(null);
    }
  };

  return (
    <Stack h="100%" gap="sm">
      <Tabs
        value={activeActionHook}
        onChange={value => {
          if (value) {
            onActiveActionHookChange(value as LocoActionHook);
          }
        }}
        style={{ minHeight: 0, display: "flex", flexDirection: "column", flex: 1 }}
      >
        <Tabs.List>
          {ACTION_HOOKS.map(hook => (
            <Tabs.Tab key={hook.value} value={hook.value}>
              {hook.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Stack gap="xs" pt="sm">
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text fw={600}>{selectedHookInfo.label}</Text>
              <Text size="sm" c="dimmed">{selectedHookInfo.description}</Text>
              {testMessage && (
                <Text size="xs" c={testMessage.includes("hiba") ? "red" : "dimmed"}>
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
                loading={testingHook === activeActionHook}
                disabled={testingHook !== null || getLocoActions(selectedLoco, activeActionHook).length === 0}
                onClick={() => void runActionListTest(activeActionHook)}
              >
                Test list
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => addAction(activeActionHook, "setFunction")}
              >
                Function
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => addAction(activeActionHook, "momentaryFunction")}
              >
                Momentary
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => addAction(activeActionHook, "wait")}
              >
                Wait
              </Button>
            </Group>
          </Group>
        </Stack>

        {ACTION_HOOKS.map(hook => {
          const actions = getLocoActions(selectedLoco, hook.value);

          return (
            <Tabs.Panel
              key={hook.value}
              value={hook.value}
              pt="sm"
              style={{ flex: 1, minHeight: 0 }}
            >
              <ScrollArea style={{ height: "100%" }}>
                <Stack gap="sm">
                  {actions.map((action, actionIndex) => (
                    <LocoActionCard
                      key={action.id}
                      action={action}
                      hook={hook.value}
                      actionIndex={actionIndex}
                      actionCount={actions.length}
                      draggedActionId={draggedActionId}
                      functionOptions={functionOptions}
                      onDragStart={handleActionDragStart}
                      onDragEnd={clearDragState}
                      onDragOverAction={(event, actionId, targetIndex) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";

                        if (draggedActionId && draggedActionId !== actionId) {
                          moveDraggedActionToIndex(hook.value, targetIndex);
                        }
                      }}
                      onMoveByOffset={(actionId, offset) => moveActionByOffset(hook.value, actionId, offset)}
                      onUpdateAction={(actionId, nextAction) => updateAction(hook.value, actionId, nextAction)}
                      onDeleteAction={actionId => deleteAction(hook.value, actionId)}
                    />
                  ))}

                  {draggedActionId && actions.length > 0 && (
                    <Card
                      withBorder
                      p="sm"
                      onDragOver={event => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        moveDraggedActionToIndex(hook.value, actions.length);
                      }}
                      style={{
                        borderStyle: "dashed",
                        opacity: 0.45,
                      }}
                    >
                      <Text size="sm" c="dimmed" ta="center">
                        Move to end
                      </Text>
                    </Card>
                  )}

                  {actions.length === 0 && (
                    <Card withBorder p="md">
                      <Text size="sm" c="dimmed">
                        No actions yet. Add a function, momentary function or wait step.
                      </Text>
                    </Card>
                  )}
                </Stack>
              </ScrollArea>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Stack>
  );
}

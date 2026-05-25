import {
  type DragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  FileButton,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";

import {
  IconArrowDown,
  IconArrowUp,
  IconGripVertical,
  IconPhoto,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { useTranslation } from "react-i18next";

import type {
  Loco,
  LocoAction,
  LocoActionHook,
  LocoFunction,
} from "../../../common/src/types";

import {
  getLocos,
  saveLocos,
} from "../api/domainApi";
import { generateId } from "../helpers";
import { wsApi } from "../services/wsApi";
import AppModal from "./common/AppModal";

type LocoDialogProps = {
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type LocoActionType = LocoAction["type"];

const ACTION_HOOKS: {
  value: LocoActionHook;
  label: string;
  description: string;
}[] = [
    {
      value: "beforeStart",
      label: "Before start",
      description: "Runs before the task starts the loco.",
    },
    {
      value: "afterStart",
      label: "After start",
      description: "Runs after the loco start command was sent.",
    },
    {
      value: "beforeStop",
      label: "Before stop",
      description: "Runs before a normal task stop.",
    },
    {
      value: "afterStop",
      label: "After stop",
      description: "Runs after the loco stop command was sent.",
    },
  ];

const ACTION_TYPE_OPTIONS: {
  value: LocoActionType;
  label: string;
}[] = [
    {
      value: "setFunction",
      label: "Function ON/OFF",
    },
    {
      value: "momentaryFunction",
      label: "Momentary function",
    },
    {
      value: "wait",
      label: "Wait",
    },
  ];

const createEmptyLocoActions = (): Record<LocoActionHook, LocoAction[]> => ({
  beforeStart: [],
  afterStart: [],
  beforeStop: [],
  afterStop: [],
});

const createEmptyLoco = (): Loco => ({
  id: generateId(),
  name: "",
  address: 3,
  maxSpeed: 100,
  invert: false,
  image: "",
  length: 200,
  functions: [],
  actions: createEmptyLocoActions(),
});

const createDefaultFunction = (
  nextNumber: number
): LocoFunction => ({
  id: generateId(),
  number: nextNumber,
  name: `F${nextNumber}`,
  icon: "💡",
  momentary: false,
});

const createDefaultAction = (
  type: LocoActionType = "wait"
): LocoAction => {
  switch (type) {
    case "setFunction":
      return {
        id: generateId(),
        type,
        functionNumber: 0,
        active: true,
      };

    case "momentaryFunction":
      return {
        id: generateId(),
        type,
        functionNumber: 2,
        ms: 200,
      };

    case "wait":
      return {
        id: generateId(),
        type,
        ms: 500,
      };
  }
};

const convertActionType = (
  action: LocoAction,
  type: LocoActionType
): LocoAction => ({
  ...createDefaultAction(type),
  id: action.id,
});

const getLocoActions = (
  loco: Loco,
  hook: LocoActionHook
): LocoAction[] => loco.actions?.[hook] ?? [];

const getActionSummary = (
  action: LocoAction
): string => {
  switch (action.type) {
    case "setFunction":
      return `F${action.functionNumber} ${action.active ? "ON" : "OFF"}`;

    case "momentaryFunction":
      return `F${action.functionNumber} pulse ${action.ms} ms`;

    case "wait":
      return `Wait ${action.ms} ms`;
  }
};

const moveItem = <T,>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);

  if (item === undefined) {
    return items;
  }

  next.splice(toIndex, 0, item);
  return next;
};

export default function LocoDialog({
  opened,
  onClose,
  onSaved,
}: LocoDialogProps) {
  const { t } = useTranslation();

  const [locos, setLocos] = useState<Loco[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeActionHook, setActiveActionHook] = useState<LocoActionHook>("beforeStart");
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;

    void (async () => {
      try {
        setLoading(true);
        setMessage("");
        const data = await getLocos();
        setLocos(data);
        setSelectedId(data[0]?.id ?? "");
      } catch (error) {
        console.error(error);
        setMessage(t("locodialog.couldnotloadlocos"));
      } finally {
        setLoading(false);
      }
    })();
  }, [opened, t]);

  const selectedLoco = useMemo(
    () => locos.find(loco => loco.id === selectedId) ?? null,
    [locos, selectedId]
  );

  const selectedHookInfo = useMemo(
    () => ACTION_HOOKS.find(item => item.value === activeActionHook) ?? ACTION_HOOKS[0]!,
    [activeActionHook]
  );

  const updateSelectedLoco = (patch: Partial<Loco>): void => {
    if (!selectedLoco) return;

    setLocos(previous =>
      previous.map(loco =>
        loco.id === selectedLoco.id
          ? { ...loco, ...patch }
          : loco
      )
    );
  };

  const addLoco = (): void => {
    const loco = createEmptyLoco();
    setLocos(previous => [...previous, loco]);
    setSelectedId(loco.id);
  };

  const deleteSelectedLoco = (): void => {
    if (!selectedLoco) return;

    const next = locos.filter(loco => loco.id !== selectedLoco.id);
    setLocos(next);
    setSelectedId(next[0]?.id ?? "");
  };

  const addFunction = (): void => {
    if (!selectedLoco) return;

    const maxFn = selectedLoco.functions.reduce(
      (max, fn) => Math.max(max, fn.number),
      -1
    );

    updateSelectedLoco({
      functions: [
        ...selectedLoco.functions,
        createDefaultFunction(maxFn + 1),
      ],
    });
  };

  const updateFunction = (
    fnId: string,
    patch: Partial<LocoFunction>
  ): void => {
    if (!selectedLoco) return;

    updateSelectedLoco({
      functions: selectedLoco.functions.map(fn =>
        fn.id === fnId ? { ...fn, ...patch } : fn
      ),
    });
  };

  const deleteFunction = (fnId: string): void => {
    if (!selectedLoco) return;

    updateSelectedLoco({
      functions: selectedLoco.functions.filter(fn => fn.id !== fnId),
    });
  };

  const updateActionsForHook = (
    hook: LocoActionHook,
    actions: LocoAction[]
  ): void => {
    if (!selectedLoco) return;

    updateSelectedLoco({
      actions: {
        ...createEmptyLocoActions(),
        ...(selectedLoco.actions ?? {}),
        [hook]: actions,
      },
    });
  };

  const addAction = (
    hook: LocoActionHook,
    type: LocoActionType = "wait"
  ): void => {
    if (!selectedLoco) return;

    updateActionsForHook(
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
    if (!selectedLoco) return;

    updateActionsForHook(
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
    if (!selectedLoco) return;

    updateActionsForHook(
      hook,
      getLocoActions(selectedLoco, hook).filter(action => action.id !== actionId)
    );
  };

  const moveActionByOffset = (
    hook: LocoActionHook,
    actionId: string,
    offset: number
  ): void => {
    if (!selectedLoco) return;

    const actions = getLocoActions(selectedLoco, hook);
    const fromIndex = actions.findIndex(action => action.id === actionId);
    const toIndex = fromIndex + offset;

    updateActionsForHook(
      hook,
      moveItem(actions, fromIndex, toIndex)
    );
  };

  const moveDraggedActionToIndex = (
    hook: LocoActionHook,
    targetIndex: number
  ): void => {
    if (!selectedLoco || !draggedActionId) {
      return;
    }

    const actions = getLocoActions(selectedLoco, hook);
    const fromIndex = actions.findIndex(action => action.id === draggedActionId);
    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, actions.length - 1));

    if (fromIndex < 0 || fromIndex === boundedTargetIndex) {
      return;
    }

    updateActionsForHook(
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

  const sendFunctionTest = async (
    fn: LocoFunction,
    active: boolean
  ): Promise<void> => {
    if (!selectedLoco) return;

    try {
      setMessage("");
      await wsApi.setLocoFunction(
        selectedLoco.address,
        fn.number,
        active
      );
      setMessage(`F${fn.number} ${active ? "ON" : "OFF"} elküldve.`);
    } catch (error) {
      console.error(error);
      setMessage(`F${fn.number} parancs nem sikerült.`);
    }
  };

  const setImageFromFile = (file: File | null): void => {
    if (!file || !selectedLoco) return;

    const reader = new FileReader();

    reader.onload = () => {
      updateSelectedLoco({
        image: typeof reader.result === "string" ? reader.result : "",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setMessage("");
      await saveLocos(locos);
      setMessage(t("locodialg.successful"));
      onSaved?.();
    } catch (error) {
      console.error(error);
      setMessage(t("locodialog.couldnotsave"));
    } finally {
      setSaving(false);
    }
  };

  const functionOptions = selectedLoco?.functions.map(fn => ({
    value: String(fn.number),
    label: `${fn.icon ? `${fn.icon} ` : ""}F${fn.number} - ${fn.name}`,
  })) ?? [];

  const renderActionEditor = (
    action: LocoAction,
    hook: LocoActionHook,
    actionIndex: number,
    actionCount: number
  ) => {
    const updateCurrentAction = (nextAction: LocoAction): void => {
      updateAction(hook, action.id, nextAction);
    };

    return (
      <Card
        key={action.id}
        withBorder
        p="sm"
        draggable
        onDragStart={event => handleActionDragStart(event, action.id)}
        onDragEnd={clearDragState}
        onDragOver={event => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";

          if (draggedActionId && draggedActionId !== action.id) {
            moveDraggedActionToIndex(hook, actionIndex);
          }
        }}
        style={{
          opacity: draggedActionId === action.id ? 0.35 : 1,
          transition: "opacity 120ms ease, transform 120ms ease",
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                style={{ cursor: "grab", touchAction: "none" }}
              >
                <IconGripVertical size={18} />
              </ActionIcon>

              <Badge
                variant="filled"
                color={draggedActionId === action.id ? "orange" : "blue"}
                miw={draggedActionId === action.id ? 58 : 34}
                ta="center"
              >
                {draggedActionId === action.id
                  ? `→ #${actionIndex + 1}`
                  : `#${actionIndex + 1}`}
              </Badge>

              <Badge variant="light">{getActionSummary(action)}</Badge>
            </Group>

            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                color="gray"
                variant="light"
                disabled={actionIndex === 0}
                onClick={() => moveActionByOffset(hook, action.id, -1)}
              >
                <IconArrowUp size={16} />
              </ActionIcon>

              <ActionIcon
                color="gray"
                variant="light"
                disabled={actionIndex >= actionCount - 1}
                onClick={() => moveActionByOffset(hook, action.id, 1)}
              >
                <IconArrowDown size={16} />
              </ActionIcon>

              <ActionIcon
                color="red"
                variant="light"
                onClick={() => deleteAction(hook, action.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>

          <Group align="flex-end" wrap="wrap">
            <Select
              label="Action type"
              value={action.type}
              data={ACTION_TYPE_OPTIONS}
              w={210}
              allowDeselect={false}
              onChange={value => {
                if (!value) {
                  return;
                }

                updateCurrentAction(
                  convertActionType(action, value as LocoActionType)
                );
              }}
            />

            {action.type === "setFunction" && (
              <>
                <Select
                  label="Function"
                  value={String(action.functionNumber)}
                  data={functionOptions}
                  w={220}
                  searchable
                  allowDeselect={false}
                  onChange={value => {
                    updateCurrentAction({
                      ...action,
                      functionNumber: Number(value) || 0,
                    });
                  }}
                />

                <Checkbox
                  label="Active"
                  checked={action.active}
                  onChange={event => {
                    updateCurrentAction({
                      ...action,
                      active: event.currentTarget.checked,
                    });
                  }}
                />
              </>
            )}

            {action.type === "momentaryFunction" && (
              <>
                <Select
                  label="Function"
                  value={String(action.functionNumber)}
                  data={functionOptions}
                  w={220}
                  searchable
                  allowDeselect={false}
                  onChange={value => {
                    updateCurrentAction({
                      ...action,
                      functionNumber: Number(value) || 0,
                    });
                  }}
                />

                <NumberInput
                  label="Duration (ms)"
                  value={action.ms}
                  min={1}
                  step={100}
                  w={150}
                  onChange={value => {
                    updateCurrentAction({
                      ...action,
                      ms: Number(value) || 1,
                    });
                  }}
                />
              </>
            )}

            {action.type === "wait" && (
              <NumberInput
                label="Wait (ms)"
                value={action.ms}
                min={1}
                step={100}
                w={150}
                onChange={value => {
                  updateCurrentAction({
                    ...action,
                    ms: Number(value) || 1,
                  });
                }}
              />
            )}
          </Group>
        </Stack>
      </Card>
    );
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={t("locodialog.locomotives")}
      size="min(1480px, 95vw)"
      centered
      draggable
      styles={{
        body: {
          height: "min(740px, calc(100vh - 120px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <Loader />
            <Text size="sm" c="dimmed">{t("locodialog.loading")}</Text>
          </Stack>
        ) : (
          <Group align="stretch" gap="md" wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
            <Card withBorder p="sm" style={{ width: 320, display: "flex", flexDirection: "column" }}>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{t("locodialog.mozdonylista")}</Text>
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLoco}>
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
                      onClick={() => setSelectedId(loco.id)}
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
                onClick={deleteSelectedLoco}
                disabled={!selectedLoco}
              >
                {t("locodialog.delete")}
              </Button>
            </Card>

            <Card withBorder p="md" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              {!selectedLoco ? (
                <Stack align="center" justify="center" h="100%">
                  <Text fw={600}>{t("locodialog.noselectedloco")}.</Text>
                </Stack>
              ) : (
                <Tabs defaultValue="general" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <Tabs.List>
                    <Tabs.Tab value="general">General</Tabs.Tab>
                    <Tabs.Tab value="functions">Functions</Tabs.Tab>
                    <Tabs.Tab value="actions">Actions</Tabs.Tab>
                    <Tabs.Tab value="extended">Extended params</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="general" pt="md" style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea h="100%">
                      <Stack gap="md" maw={520}>
                        {selectedLoco.image && (
                          <img
                            src={selectedLoco.image}
                            alt={selectedLoco.name}
                            style={{ maxHeight: 120, maxWidth: 260, objectFit: "contain" }}
                          />
                        )}

                        <FileButton onChange={setImageFromFile} accept="image/png,image/jpeg,image/webp">
                          {props => (
                            <Button {...props} variant="light" leftSection={<IconPhoto size={16} />}>
                              {t("locodialog.selectimage")}
                            </Button>
                          )}
                        </FileButton>

                        <TextInput
                          label={t("locodialog.loconame")}
                          value={selectedLoco.name}
                          onChange={event => updateSelectedLoco({ name: event.currentTarget.value })}
                        />

                        <NumberInput
                          label={t("locodialog.locoaddress")}
                          value={selectedLoco.address}
                          min={1}
                          onChange={value => updateSelectedLoco({ address: Number(value) || 0 })}
                        />

                        <NumberInput
                          label={t("locodialog.loco_max_speed")}
                          value={selectedLoco.maxSpeed}
                          min={1}
                          max={1000}
                          onChange={value => updateSelectedLoco({ maxSpeed: Number(value) || 0 })}
                        />

                        <Checkbox
                          label={t("locodialog.loco_direction_invert")}
                          checked={selectedLoco.invert}
                          onChange={event => updateSelectedLoco({ invert: event.currentTarget.checked })}
                        />
                      </Stack>
                    </ScrollArea>
                  </Tabs.Panel>

                  <Tabs.Panel value="functions" pt="md" style={{ flex: 1, minHeight: 0 }}>
                    <Stack h="100%">
                      <Group justify="space-between">
                        <Text fw={600}>{t("locodialog.loco_functions")}</Text>
                        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addFunction}>
                          {t("locodialog.new_function")}
                        </Button>
                      </Group>

                      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                        <Stack gap="sm">
                          {selectedLoco.functions.map(fn => (
                            <Card key={fn.id} withBorder p="sm">
                              <Group align="flex-start" wrap="nowrap">
                                <NumberInput label={t("locodialog.function_number")} value={fn.number} min={0} w={110} onChange={value => updateFunction(fn.id, { number: Number(value) || 0 })} />
                                <TextInput label={t("locodialog.functionname")} value={fn.name} style={{ flex: 1 }} onChange={event => updateFunction(fn.id, { name: event.currentTarget.value })} />
                                <TextInput label="Ikon" value={fn.icon} w={90} onChange={event => updateFunction(fn.id, { icon: event.currentTarget.value })} />
                                <Checkbox mt={30} label={t("locodialog.function_momentary")} checked={fn.momentary} onChange={event => updateFunction(fn.id, { momentary: event.currentTarget.checked })} />
                                <Button
                                  mt={24}
                                  size="xs"
                                  variant="light"
                                  onPointerDown={event => {
                                    event.preventDefault();
                                    void sendFunctionTest(fn, true);
                                  }}
                                  onPointerUp={event => {
                                    event.preventDefault();
                                    if (fn.momentary) {
                                      void sendFunctionTest(fn, false);
                                    }
                                  }}
                                  onPointerCancel={event => {
                                    event.preventDefault();
                                    if (fn.momentary) {
                                      void sendFunctionTest(fn, false);
                                    }
                                  }}
                                  onPointerLeave={event => {
                                    if (fn.momentary && event.buttons === 1) {
                                      void sendFunctionTest(fn, false);
                                    }
                                  }}
                                >
                                  {t("locodialog.function_test")}
                                </Button>
                                <ActionIcon mt={28} color="red" variant="light" onClick={() => deleteFunction(fn.id)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Card>
                          ))}

                          {selectedLoco.functions.length === 0 && (
                            <Text size="sm" c="dimmed">{t("locodialog.functions_empty")}</Text>
                          )}
                        </Stack>
                      </ScrollArea>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="actions" pt="md" style={{ flex: 1, minHeight: 0 }}>
                    <Stack h="100%" gap="sm">
                      <Tabs
                        value={activeActionHook}
                        onChange={value => {
                          if (value) {
                            setActiveActionHook(value as LocoActionHook);
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
                            </Stack>

                            <Group gap="xs">
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
                                  {actions.map((action, actionIndex) =>
                                    renderActionEditor(
                                      action,
                                      hook.value,
                                      actionIndex,
                                      actions.length
                                    )
                                  )}

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
                  </Tabs.Panel>

                  <Tabs.Panel value="extended" pt="md">
                    <NumberInput
                      label={t("locodialog.loco_length_mm")}
                      value={selectedLoco.length}
                      min={1}
                      onChange={value => updateSelectedLoco({ length: Number(value) || 0 })}
                    />
                  </Tabs.Panel>
                </Tabs>
              )}
            </Card>
          </Group>
        )}

        <Divider />

        <Group justify="space-between">
          <Text size="sm" c={message.includes("sikerült") ? "green" : "dimmed"}>
            {message || ""}
          </Text>
          <Group>
            <Button onClick={() => void handleSave()} loading={saving}>{t("locodialog.save")}</Button>
            <Button variant="light" onClick={onClose}>{t("locodialog.close")}</Button>
          </Group>
        </Group>
      </Stack>
    </AppModal>
  );
}
import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  LevelCrossingCondition,
  LevelCrossingLogic,
  LevelCrossingLogicDocumentDto,
  LevelCrossingRuntimeStateDto,
} from "../../../../common/src/levelCrossingLogic";
import {
  createDefaultLevelCrossingLogic,
} from "../../../../common/src/levelCrossingLogic";
import {
  loadLevelCrossingLogicWs,
  saveLevelCrossingLogicWs,
  startLevelCrossingRuntimeWs,
  stopLevelCrossingRuntimeWs,
} from "../../api/levelCrossingWsApi";
import { generateId } from "../../helpers";
import type { LayoutView } from "../../models/editor/core/LayoutView";
import { BlockElementView } from "../../models/editor/elements/BlockElementView";
import { TrackLevelCrossingElementView } from "../../models/editor/elements/TrackLevelCrossingElementView";
import AppModal from "../common/AppModal";
import LevelCrossingActionsEditor from "./LevelCrossingActionsEditor";
import LevelCrossingConditionListEditor from "./LevelCrossingConditionListEditor";

type LevelCrossingLogicDialogProps = {
  opened: boolean;
  onClose: () => void;
  layout: LayoutView;
  initialLevelCrossingElementId: string | null;
  onInitialLevelCrossingElementIdConsumed: () => void;
};

type CrossingOption = {
  id: string;
  label: string;
  element: TrackLevelCrossingElementView;
};

type SelectItem = {
  value: string;
  label: string;
};

const DEFAULT_DOCUMENT: LevelCrossingLogicDocumentDto = {
  version: 1,
  enabled: false,
  crossings: [],
};

const DEFAULT_RUNTIME_STATE: LevelCrossingRuntimeStateDto = {
  running: false,
  enabled: false,
  crossings: [],
};

function getCrossingLabel(
  element: TrackLevelCrossingElementView,
  index: number
): string {
  return element.name?.trim() || `Level crossing ${index + 1}`;
}

function getBlockLabel(
  element: BlockElementView,
  index: number
): string {
  return element.name?.trim() || element.label?.trim() || `Block ${index + 1}`;
}

function createLogicForElement(
  element: TrackLevelCrossingElementView
): LevelCrossingLogic {
  return createDefaultLevelCrossingLogic(
    generateId(),
    element.id
  );
}

export default function LevelCrossingLogicDialog({
  opened,
  onClose,
  layout,
  initialLevelCrossingElementId,
  onInitialLevelCrossingElementIdConsumed,
}: LevelCrossingLogicDialogProps) {
  const { t } = useTranslation();

  const [document, setDocument] = useState<LevelCrossingLogicDocumentDto>(DEFAULT_DOCUMENT);
  const [runtimeState, setRuntimeState] = useState<LevelCrossingRuntimeStateDto>(DEFAULT_RUNTIME_STATE);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const labels = {
    title: t("levelCrossingLogic.title", "Level crossing logic"),
    loading: t("levelCrossingLogic.loading", "Loading level crossing logic..."),
    loaded: t("levelCrossingLogic.loaded", "Level crossing logic loaded."),
    saved: t("levelCrossingLogic.saved", "Level crossing logic saved."),
    started: t("levelCrossingLogic.started", "Level crossing automation started."),
    stopped: t("levelCrossingLogic.stopped", "Level crossing automation stopped."),
    enabled: t("common.enabled", "Enabled"),
    runtimeRunning: t("levelCrossingLogic.runtimeRunning", "Runtime running"),
    runtimeStopped: t("levelCrossingLogic.runtimeStopped", "Runtime stopped"),
    save: t("common.save", "Save"),
    start: t("common.start", "Start"),
    stop: t("common.stop", "Stop"),
    crossings: t("levelCrossingLogic.crossings", "Crossings"),
    noCrossings: t("levelCrossingLogic.noCrossings", "No level crossing element on the layout."),
    createEntry: t("levelCrossingLogic.createEntry", "Create entry"),
    entryAlreadyExists: t("levelCrossingLogic.entryAlreadyExists", "Entry already exists for this crossing."),
    selectOrAdd: t("levelCrossingLogic.selectOrAdd", "Select a level crossing and create an entry."),
    editorTab: t("levelCrossingLogic.editorTab", "Editor"),
    previewTab: t("levelCrossingLogic.previewTab", "Preview"),
    enabledLogic: t("levelCrossingLogic.enabled", "Enabled"),
    disabledLogic: t("levelCrossingLogic.disabled", "Disabled"),
    closeDelayMs: t("levelCrossingLogic.closeDelayMs", "Close delay"),
    openDelayMs: t("levelCrossingLogic.openDelayMs", "Open delay"),
    minClosedMs: t("levelCrossingLogic.minClosedMs", "Minimum closed time"),
    closeTriggersTitle: t("levelCrossingLogic.closeTriggersTitle", "Close triggers"),
    closeTriggersDescription: t("levelCrossingLogic.closeTriggersDescription", "The crossing closes when any of these conditions is true."),
    openConditionsTitle: t("levelCrossingLogic.openConditionsTitle", "Open conditions"),
    openConditionsDescription: t("levelCrossingLogic.openConditionsDescription", "The crossing opens when all configured conditions are true."),
    actionsTitle: t("levelCrossingLogic.actionsTitle", "Actions"),
    actionsDescription: t("levelCrossingLogic.actionsDescription", "Commands to execute when the crossing state changes."),
  };

  const conditionLabels = {
    empty: t("levelCrossingLogic.emptyConditions", "No conditions."),
    addSensor: t("levelCrossingLogic.addSensor", "Add sensor"),
    addBlock: t("levelCrossingLogic.addBlock", "Add block"),
    addRoute: t("levelCrossingLogic.addRoute", "Add route"),
    type: t("levelCrossingLogic.type", "Type"),
    sensor: t("levelCrossingLogic.sensor", "Sensor"),
    block: t("levelCrossingLogic.block", "Block"),
    route: t("levelCrossingLogic.route", "Route"),
    sensorAddress: t("levelCrossingLogic.sensorAddress", "Sensor address"),
    blockId: t("levelCrossingLogic.blockId", "Block"),
    fromBlock: t("levelCrossingLogic.fromBlock", "From block"),
    toBlock: t("levelCrossingLogic.toBlock", "To block"),
    anyBlock: t("levelCrossingLogic.anyBlock", "Any block"),
    expectedState: t("levelCrossingLogic.expectedState", "Expected state"),
    sensorActive: t("levelCrossingLogic.sensorActive", "Active"),
    sensorInactive: t("levelCrossingLogic.sensorInactive", "Inactive"),
    blockOccupied: t("levelCrossingLogic.blockOccupied", "Occupied"),
    blockFree: t("levelCrossingLogic.blockFree", "Free"),
    routeReserved: t("levelCrossingLogic.routeReserved", "Reserved"),
    routeNotReserved: t("levelCrossingLogic.routeNotReserved", "Not reserved"),
    delete: t("common.delete", "Delete"),
  };

  const actionLabels = {
    title: labels.actionsTitle,
    description: labels.actionsDescription,
    empty: t("levelCrossingLogic.emptyActions", "No actions."),
    addAccessory: t("levelCrossingLogic.addAccessory", "Add accessory"),
    actionType: t("levelCrossingLogic.actionType", "Action type"),
    accessoryAction: t("levelCrossingLogic.accessoryAction", "Set accessory"),
    accessoryAddress: t("levelCrossingLogic.accessoryAddress", "Accessory address"),
    activeWhenClosed: t("levelCrossingLogic.activeWhenClosed", "Active when closed"),
    active: t("levelCrossingLogic.active", "Active"),
    inactive: t("levelCrossingLogic.inactive", "Inactive"),
    delete: t("common.delete", "Delete"),
  };

  const crossings = useMemo<CrossingOption[]>(() => {
    return layout
      .getAllElements()
      .filter((element): element is TrackLevelCrossingElementView =>
        element instanceof TrackLevelCrossingElementView
      )
      .map((element, index) => ({
        id: element.id,
        label: getCrossingLabel(element, index),
        element,
      }));
  }, [layout]);

  const blockOptions = useMemo<SelectItem[]>(() => {
    return layout
      .getAllElements()
      .filter((element): element is BlockElementView =>
        element instanceof BlockElementView
      )
      .map((element, index) => ({
        value: element.id,
        label: getBlockLabel(element, index),
      }));
  }, [layout]);

  const selectedCrossing = crossings.find(crossing => crossing.id === selectedElementId) ?? crossings[0] ?? null;
  const selectedLogic = selectedCrossing
    ? document.crossings.find(logic => logic.levelCrossingElementId === selectedCrossing.id) ?? null
    : null;

  const selectedLogicCode = useMemo(() => {
    return selectedLogic
      ? JSON.stringify(selectedLogic, null, 2)
      : "";
  }, [selectedLogic]);

  const clearMessages = (): void => {
    setStatusText(null);
    setErrorText(null);
  };

  const loadDocument = async (): Promise<void> => {
    setLoading(true);
    clearMessages();

    try {
      const loadedDocument = await loadLevelCrossingLogicWs();
      setDocument(loadedDocument);
      setRuntimeState(previous => ({
        ...previous,
        enabled: loadedDocument.enabled ?? loadedDocument.autostart ?? false,
      }));
      setSelectedElementId(previous =>
        initialLevelCrossingElementId
          ?? previous
          ?? crossings[0]?.id
          ?? null
      );
      setStatusText(labels.loaded);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) void loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  useEffect(() => {
    if (!opened || !initialLevelCrossingElementId) return;
    setSelectedElementId(initialLevelCrossingElementId);
    onInitialLevelCrossingElementIdConsumed();
  }, [opened, initialLevelCrossingElementId, onInitialLevelCrossingElementIdConsumed]);

  const saveDocument = async (nextDocument = document): Promise<void> => {
    setSaving(true);
    clearMessages();

    try {
      const savedDocument = await saveLevelCrossingLogicWs(nextDocument);
      setDocument(savedDocument);
      setRuntimeState(previous => ({
        ...previous,
        enabled: savedDocument.enabled ?? savedDocument.autostart ?? false,
      }));
      setStatusText(labels.saved);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const ensureSelectedLogic = async (): Promise<void> => {
    if (!selectedCrossing) return;

    const existingIndex = document.crossings.findIndex(
      logic => logic.levelCrossingElementId === selectedCrossing.id
    );

    if (existingIndex >= 0) {
      setStatusText(labels.entryAlreadyExists);
      return;
    }

    const logic = createLogicForElement(selectedCrossing.element);
    const nextDocument = {
      ...document,
      crossings: [logic, ...document.crossings],
    };

    setDocument(nextDocument);
    await saveDocument(nextDocument);
  };

  const updateSelectedLogic = (update: (logic: LevelCrossingLogic) => LevelCrossingLogic): void => {
    if (!selectedLogic) return;

    clearMessages();
    setDocument(previous => ({
      ...previous,
      crossings: previous.crossings.map(logic =>
        logic.id === selectedLogic.id ? update(logic) : logic
      ),
    }));
  };

  const updateCloseTriggers = (closeTriggers: LevelCrossingCondition[]): void => {
    updateSelectedLogic(logic => ({ ...logic, closeTriggers }));
  };

  const updateOpenConditions = (openConditions: LevelCrossingCondition[]): void => {
    updateSelectedLogic(logic => ({ ...logic, openConditions }));
  };

  const setDocumentEnabled = (enabled: boolean): void => {
    clearMessages();
    setDocument(previous => ({ ...previous, enabled }));
    setRuntimeState(previous => ({ ...previous, enabled }));
  };

  const startRuntime = async (): Promise<void> => {
    setRuntimeBusy(true);
    clearMessages();

    try {
      const state = await startLevelCrossingRuntimeWs();
      setRuntimeState(state);
      setStatusText(labels.started);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setRuntimeBusy(false);
    }
  };

  const stopRuntime = async (): Promise<void> => {
    setRuntimeBusy(true);
    clearMessages();

    try {
      const state = await stopLevelCrossingRuntimeWs();
      setRuntimeState(state);
      setStatusText(labels.stopped);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setRuntimeBusy(false);
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={labels.title}
      size={1150}
      centered
      draggable
      styles={{
        content: {
          height: "min(820px, calc(100vh - 48px))",
          maxHeight: "min(820px, calc(100vh - 48px))",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack h="100%" gap="sm">
        {loading && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">{labels.loading}</Text>
          </Group>
        )}

        {errorText && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} py="xs">
            {errorText}
          </Alert>
        )}

        {statusText && !errorText && (
          <Alert color="green" py="xs">
            {statusText}
          </Alert>
        )}

        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Switch
              label={labels.enabled}
              checked={document.enabled ?? document.autostart ?? false}
              onChange={event => setDocumentEnabled(event.currentTarget.checked)}
            />
            <Text size="sm" c={runtimeState.running ? "green" : "dimmed"}>
              {runtimeState.running ? labels.runtimeRunning : labels.runtimeStopped}
            </Text>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              leftSection={<IconDeviceFloppy size={14} />}
              loading={saving}
              onClick={() => void saveDocument()}
            >
              {labels.save}
            </Button>
            <Button
              size="xs"
              color="green"
              variant="light"
              loading={runtimeBusy && !runtimeState.running}
              disabled={runtimeState.running || runtimeBusy}
              onClick={() => void startRuntime()}
            >
              {labels.start}
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              loading={runtimeBusy && runtimeState.running}
              disabled={!runtimeState.running || runtimeBusy}
              onClick={() => void stopRuntime()}
            >
              {labels.stop}
            </Button>
          </Group>
        </Group>

        <Tabs defaultValue="editor" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Tabs.List>
            <Tabs.Tab value="editor">{labels.editorTab}</Tabs.Tab>
            <Tabs.Tab value="preview">{labels.previewTab}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="editor" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Group align="stretch" wrap="nowrap">
                <Card withBorder w={280} p="sm" style={{ flex: "0 0 280px" }}>
                  <Group justify="space-between" mb="sm">
                    <Title order={5}>{labels.crossings}</Title>
                    <Button
                      size="compact-xs"
                      variant="light"
                      leftSection={<IconPlus size={12} />}
                      disabled={!selectedCrossing}
                      onClick={() => void ensureSelectedLogic()}
                    >
                      {labels.createEntry}
                    </Button>
                  </Group>

                  <Stack gap="xs">
                    {crossings.length === 0 && (
                      <Text size="sm" c="dimmed">{labels.noCrossings}</Text>
                    )}

                    {crossings.map(crossing => {
                      const hasEntry = document.crossings.some(logic => logic.levelCrossingElementId === crossing.id);
                      const selected = selectedCrossing?.id === crossing.id;

                      return (
                        <Button
                          key={crossing.id}
                          variant={selected ? "filled" : "light"}
                          justify="space-between"
                          onClick={() => setSelectedElementId(crossing.id)}
                        >
                          <span>{crossing.label}</span>
                          <Text size="xs" c={selected ? "white" : hasEntry ? "green" : "dimmed"}>
                            {hasEntry ? labels.configured : labels.notConfigured}
                          </Text>
                        </Button>
                      );
                    })}
                  </Stack>
                </Card>

                <Stack flex={1} gap="sm" style={{ minWidth: 0 }}>
                  {!selectedLogic ? (
                    <Card withBorder p="lg">
                      <Text c="dimmed">{labels.selectOrAdd}</Text>
                    </Card>
                  ) : (
                    <>
                      <Card withBorder p="sm">
                        <Group align="flex-end" grow>
                          <Switch
                            label={labels.enabledLogic}
                            checked={selectedLogic.enabled}
                            onChange={event => updateSelectedLogic(logic => ({
                              ...logic,
                              enabled: event.currentTarget.checked,
                            }))}
                          />
                          <NumberInput
                            label={labels.closeDelayMs}
                            value={selectedLogic.closeDelayMs}
                            min={0}
                            step={100}
                            suffix=" ms"
                            onChange={value => updateSelectedLogic(logic => ({
                              ...logic,
                              closeDelayMs: Number(value ?? 0),
                            }))}
                          />
                          <NumberInput
                            label={labels.openDelayMs}
                            value={selectedLogic.openDelayMs}
                            min={0}
                            step={100}
                            suffix=" ms"
                            onChange={value => updateSelectedLogic(logic => ({
                              ...logic,
                              openDelayMs: Number(value ?? 0),
                            }))}
                          />
                          <NumberInput
                            label={labels.minClosedMs}
                            value={selectedLogic.minClosedMs}
                            min={0}
                            step={100}
                            suffix=" ms"
                            onChange={value => updateSelectedLogic(logic => ({
                              ...logic,
                              minClosedMs: Number(value ?? 0),
                            }))}
                          />
                        </Group>
                      </Card>

                      <LevelCrossingConditionListEditor
                        title={labels.closeTriggersTitle}
                        description={labels.closeTriggersDescription}
                        conditions={selectedLogic.closeTriggers}
                        onChange={updateCloseTriggers}
                        blockOptions={blockOptions}
                        labels={conditionLabels}
                      />

                      <LevelCrossingConditionListEditor
                        title={labels.openConditionsTitle}
                        description={labels.openConditionsDescription}
                        conditions={selectedLogic.openConditions}
                        onChange={updateOpenConditions}
                        blockOptions={blockOptions}
                        labels={conditionLabels}
                      />

                      <LevelCrossingActionsEditor
                        actions={selectedLogic.actions}
                        onChange={actions => updateSelectedLogic(logic => ({ ...logic, actions }))}
                        labels={actionLabels}
                      />
                    </>
                  )}
                </Stack>
              </Group>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Card withBorder p="sm">
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {selectedLogicCode || labels.selectOrAdd}
                </pre>
              </Card>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </AppModal>
  );
}

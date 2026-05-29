import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
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
  IconRefresh,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  LevelCrossingAction,
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
  return element.name?.trim() || `Block ${index + 1}`;
}

function createLogicForElement(
  element: TrackLevelCrossingElementView
): LevelCrossingLogic {
  return createDefaultLevelCrossingLogic(generateId(), element.id);
}

function getConditionBadgeColor(condition: LevelCrossingCondition): string {
  switch (condition.type) {
    case "sensor": return "blue";
    case "block": return "grape";
    case "route": return "cyan";
    default: return "gray";
  }
}

function getActionBadgeColor(action: LevelCrossingAction): string {
  switch (action.type) {
    case "setAccessory": return "orange";
    case "setElementState": return "teal";
    default: return "gray";
  }
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
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const labels = {
    title: t("levelCrossingLogic.title", "Level crossing logic"),
    loading: t("levelCrossingLogic.loading", "Loading level crossing logic..."),
    loaded: t("levelCrossingLogic.loaded", "Level crossing logic loaded."),
    saved: t("levelCrossingLogic.saved", "Level crossing logic saved."),
    savedAndStarted: t("levelCrossingLogic.savedAndStarted", "Level crossing logic saved and started."),
    savedAndStopped: t("levelCrossingLogic.savedAndStopped", "Level crossing logic saved and stopped."),
    enabled: t("common.enabled", "Enabled"),
    runtimeRunning: t("levelCrossingLogic.runtimeRunning", "Runtime running"),
    runtimeStopped: t("levelCrossingLogic.runtimeStopped", "Runtime stopped"),
    save: t("common.save", "Save"),
    reload: t("common.reload", "Reload"),
    storedOnServer: t("levelCrossingLogic.savePath", "Stored on server"),
    crossings: t("levelCrossingLogic.crossings", "Crossings"),
    noCrossings: t("levelCrossingLogic.noCrossings", "No level crossing element on the layout."),
    createEntry: t("levelCrossingLogic.createEntry", "Create entry"),
    entryAlreadyExists: t("levelCrossingLogic.entryAlreadyExists", "Entry already exists for this crossing."),
    selectOrAdd: t("levelCrossingLogic.selectOrAdd", "Select a level crossing and create an entry."),
    configured: t("levelCrossingLogic.configured", "Configured"),
    notConfigured: t("levelCrossingLogic.notConfigured", "Not configured"),
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
    emptyPreview: t("levelCrossingLogic.emptyPreview", "No level crossing logic entries."),
    noConditions: t("levelCrossingLogic.emptyConditions", "No conditions."),
    noActions: t("levelCrossingLogic.emptyActions", "No actions."),
    delays: t("levelCrossingLogic.delays", "Delays"),
    and: t("levelCrossingLogic.and", "AND"),
    or: t("levelCrossingLogic.or", "OR"),
    anyBlock: t("levelCrossingLogic.anyBlock", "Any block"),
    unknownBlock: t("levelCrossingLogic.unknownBlock", "Unknown block"),
    unknownCrossing: t("levelCrossingLogic.unknownCrossing", "Unknown crossing"),
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

  const crossings = useMemo<CrossingOption[]>(() => layout
    .getAllElements()
    .filter((element): element is TrackLevelCrossingElementView => element instanceof TrackLevelCrossingElementView)
    .map((element, index) => ({ id: element.id, label: getCrossingLabel(element, index), element })), [layout]);

  const blockOptions = useMemo<SelectItem[]>(() => layout
    .getAllElements()
    .filter((element): element is BlockElementView => element instanceof BlockElementView)
    .map((element, index) => ({ value: element.id, label: getBlockLabel(element, index) })), [layout]);

  const selectedCrossing = crossings.find(crossing => crossing.id === selectedElementId) ?? crossings[0] ?? null;
  const selectedLogic = selectedCrossing
    ? document.crossings.find(logic => logic.levelCrossingElementId === selectedCrossing.id) ?? null
    : null;

  const getBlockName = (blockId?: string): string => {
    if (!blockId) return labels.anyBlock;
    return blockOptions.find(block => block.value === blockId)?.label ?? labels.unknownBlock;
  };

  const getCrossingName = (elementId: string): string =>
    crossings.find(crossing => crossing.id === elementId)?.label ?? labels.unknownCrossing;

  const formatCondition = (condition: LevelCrossingCondition): string => {
    const negated = condition.operator === "isNot" ? "NOT " : "";

    switch (condition.type) {
      case "sensor":
        return `${negated}Sensor #${condition.sensorAddress} ${condition.active ? conditionLabels.sensorActive : conditionLabels.sensorInactive}`;
      case "block":
        return `${negated}${getBlockName(condition.blockId)} ${condition.occupied ? conditionLabels.blockOccupied : conditionLabels.blockFree}`;
      case "route":
        return `${negated}${getBlockName(condition.fromBlockId)} → ${getBlockName(condition.toBlockId)} ${condition.reserved ? conditionLabels.routeReserved : conditionLabels.routeNotReserved}`;
    }
  };

  const formatAction = (action: LevelCrossingAction): string => {
    switch (action.type) {
      case "setAccessory":
        return `Accessory #${action.address}: ${action.activeWhenClosed ? actionLabels.activeWhenClosed : actionLabels.inactive}`;
      case "setElementState":
        return `Element state: closed=${action.closedState}, open=${action.openState}`;
    }
  };

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
      setRuntimeState(previous => ({ ...previous, enabled: loadedDocument.enabled }));
      setSelectedElementId(previous => initialLevelCrossingElementId ?? previous ?? crossings[0]?.id ?? null);
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
        enabled: savedDocument.enabled,
        running: savedDocument.enabled,
      }));
      setStatusText(savedDocument.enabled ? labels.savedAndStarted : labels.savedAndStopped);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const ensureSelectedLogic = async (): Promise<void> => {
    if (!selectedCrossing) return;

    if (document.crossings.some(logic => logic.levelCrossingElementId === selectedCrossing.id)) {
      setStatusText(labels.entryAlreadyExists);
      return;
    }

    const logic = createLogicForElement(selectedCrossing.element);
    const nextDocument = { ...document, crossings: [logic, ...document.crossings] };

    setDocument(nextDocument);
    await saveDocument(nextDocument);
  };

  const updateSelectedLogic = (update: (logic: LevelCrossingLogic) => LevelCrossingLogic): void => {
    if (!selectedLogic) return;

    clearMessages();
    setDocument(previous => ({
      ...previous,
      crossings: previous.crossings.map(logic => logic.id === selectedLogic.id ? update(logic) : logic),
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

  const renderConditionGroup = (
    title: string,
    conditions: LevelCrossingCondition[],
    joinLabel: string
  ) => (
    <Stack gap={4}>
      <Text size="xs" fw={700} c="dimmed">{title}</Text>
      {conditions.length === 0 ? (
        <Badge variant="light" color="gray">{labels.noConditions}</Badge>
      ) : (
        <Group gap="xs" wrap="wrap">
          {conditions.map((condition, index) => (
            <Group key={condition.id} gap={4} wrap="nowrap">
              {index > 0 && <Text size="xs" c="dimmed" fw={700}>{joinLabel}</Text>}
              <Badge variant="light" color={getConditionBadgeColor(condition)}>
                {formatCondition(condition)}
              </Badge>
            </Group>
          ))}
        </Group>
      )}
    </Stack>
  );

  return (
    <AppModal opened={opened} onClose={onClose} title={labels.title} size={1150} centered draggable styles={{ content: { height: "min(820px, calc(100vh - 48px))", maxHeight: "min(820px, calc(100vh - 48px))", display: "flex", flexDirection: "column" }, body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } }}>
      <Stack h="100%" gap="sm">
        {loading && <Group gap="xs"><Loader size="xs" /><Text size="sm" c="dimmed">{labels.loading}</Text></Group>}
        {errorText && <Alert color="red" icon={<IconAlertTriangle size={16} />} py="xs">{errorText}</Alert>}
        {statusText && !errorText && <Alert color="green" py="xs">{statusText}</Alert>}

        <Tabs defaultValue="editor" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Tabs.List style={{ flex: "0 0 auto" }}><Tabs.Tab value="editor">{labels.editorTab}</Tabs.Tab><Tabs.Tab value="preview">{labels.previewTab}</Tabs.Tab></Tabs.List>
          <Tabs.Panel value="editor" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Group align="stretch" wrap="nowrap">
                <Card withBorder w={280} p="sm" style={{ flex: "0 0 280px" }}>
                  <Group justify="space-between" mb="sm"><Title order={5}>{labels.crossings}</Title><Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />} disabled={!selectedCrossing} onClick={() => void ensureSelectedLogic()}>{labels.createEntry}</Button></Group>
                  <Stack gap="xs">
                    {crossings.length === 0 && <Text size="sm" c="dimmed">{labels.noCrossings}</Text>}
                    {crossings.map(crossing => {
                      const hasEntry = document.crossings.some(logic => logic.levelCrossingElementId === crossing.id);
                      const selected = selectedCrossing?.id === crossing.id;
                      return <Button key={crossing.id} variant={selected ? "filled" : "light"} justify="space-between" onClick={() => setSelectedElementId(crossing.id)}><span>{crossing.label}</span><Text size="xs" c={selected ? "white" : hasEntry ? "green" : "dimmed"}>{hasEntry ? labels.configured : labels.notConfigured}</Text></Button>;
                    })}
                  </Stack>
                </Card>

                <Stack flex={1} gap="sm" style={{ minWidth: 0 }}>
                  {!selectedLogic ? <Card withBorder p="lg"><Text c="dimmed">{labels.selectOrAdd}</Text></Card> : <>
                    <Card withBorder p="sm"><Group align="flex-end" grow><Switch label={labels.enabledLogic} checked={selectedLogic.enabled} onChange={event => updateSelectedLogic(logic => ({ ...logic, enabled: event.currentTarget.checked }))} /><NumberInput label={labels.closeDelayMs} value={selectedLogic.closeDelayMs} min={0} step={100} suffix=" ms" onChange={value => updateSelectedLogic(logic => ({ ...logic, closeDelayMs: Number(value ?? 0) }))} /><NumberInput label={labels.openDelayMs} value={selectedLogic.openDelayMs} min={0} step={100} suffix=" ms" onChange={value => updateSelectedLogic(logic => ({ ...logic, openDelayMs: Number(value ?? 0) }))} /><NumberInput label={labels.minClosedMs} value={selectedLogic.minClosedMs} min={0} step={100} suffix=" ms" onChange={value => updateSelectedLogic(logic => ({ ...logic, minClosedMs: Number(value ?? 0) }))} /></Group></Card>
                    <LevelCrossingConditionListEditor title={labels.closeTriggersTitle} description={labels.closeTriggersDescription} conditions={selectedLogic.closeTriggers} onChange={updateCloseTriggers} blockOptions={blockOptions} labels={conditionLabels} />
                    <LevelCrossingConditionListEditor title={labels.openConditionsTitle} description={labels.openConditionsDescription} conditions={selectedLogic.openConditions} onChange={updateOpenConditions} blockOptions={blockOptions} labels={conditionLabels} />
                    <LevelCrossingActionsEditor actions={selectedLogic.actions} onChange={actions => updateSelectedLogic(logic => ({ ...logic, actions }))} labels={actionLabels} />
                  </>}
                </Stack>
              </Group>
            </ScrollArea>
          </Tabs.Panel>
          <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Stack pb="md">
                {document.crossings.length === 0 && (
                  <Card withBorder>
                    <Text size="sm" c="dimmed">{labels.emptyPreview}</Text>
                  </Card>
                )}
                {document.crossings.map(logic => (
                  <Card key={logic.id} withBorder>
                    <Group justify="space-between" mb="sm" align="center">
                      <Title order={5}>{getCrossingName(logic.levelCrossingElementId)}</Title>
                      <Group gap="xs">
                        <Badge color={logic.enabled ? "green" : "gray"} variant="light">
                          {logic.enabled ? labels.enabledLogic : labels.disabledLogic}
                        </Badge>
                        <Badge color="blue" variant="light">
                          {`${labels.closeDelayMs}: ${logic.closeDelayMs} ms`}
                        </Badge>
                        <Badge color="blue" variant="light">
                          {`${labels.openDelayMs}: ${logic.openDelayMs} ms`}
                        </Badge>
                        <Badge color="blue" variant="light">
                          {`${labels.minClosedMs}: ${logic.minClosedMs} ms`}
                        </Badge>
                      </Group>
                    </Group>

                    <Stack gap="sm">
                      <Card withBorder p="xs" radius="md">
                        {renderConditionGroup(labels.closeTriggersTitle, logic.closeTriggers, labels.or)}
                      </Card>
                      <Card withBorder p="xs" radius="md">
                        {renderConditionGroup(labels.openConditionsTitle, logic.openConditions, labels.and)}
                      </Card>
                      <Card withBorder p="xs" radius="md">
                        <Stack gap={4}>
                          <Text size="xs" fw={700} c="dimmed">{labels.actionsTitle}</Text>
                          {logic.actions.length === 0 ? (
                            <Badge variant="light" color="gray">{labels.noActions}</Badge>
                          ) : (
                            <Group gap="xs" wrap="wrap">
                              {logic.actions.map(action => (
                                <Badge key={action.id} variant="light" color={getActionBadgeColor(action)}>
                                  {formatAction(action)}
                                </Badge>
                              ))}
                            </Group>
                          )}
                        </Stack>
                      </Card>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>

        <Divider />

        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm" c="dimmed">{labels.storedOnServer}</Text>
            <Text size="sm" c={runtimeState.running ? "green" : "dimmed"}>{runtimeState.running ? labels.runtimeRunning : labels.runtimeStopped}</Text>
          </Group>

          <Group>
            <Checkbox
              checked={document.enabled}
              label={labels.enabled}
              onChange={event => setDocumentEnabled(event.currentTarget.checked)}
            />
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void loadDocument()} loading={loading}>
              {labels.reload}
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveDocument()} loading={saving}>
              {labels.save}
            </Button>
          </Group>
        </Group>
      </Stack>
    </AppModal>
  );
}

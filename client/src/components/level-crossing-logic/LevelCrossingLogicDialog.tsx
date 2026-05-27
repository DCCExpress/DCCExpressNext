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
import { TrackLevelCrossingElementView } from "../../models/editor/elements/TrackLevelCrossingElementView";
import AppModal from "../common/AppModal";

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

const DEFAULT_RUNTIME_STATE: LevelCrossingRuntimeStateDto = {
  running: false,
  autostart: false,
  crossings: [],
};

const LABELS = {
  en: {
    title: "Level crossing logic",
    loading: "Loading level crossing logic...",
    loaded: "Level crossing logic loaded.",
    saved: "Level crossing logic saved.",
    started: "Level crossing automation started.",
    stopped: "Level crossing automation stopped.",
    autostart: "Autostart",
    runtimeRunning: "Runtime running",
    runtimeStopped: "Runtime stopped",
    save: "Save",
    start: "Start",
    stop: "Stop",
    crossings: "Level crossings",
    noCrossings: "No level crossing element on the layout.",
    configured: "Configured",
    notConfigured: "Not configured",
    selectOrAdd: "Select a level crossing from the list.",
    noEntryForSelected: "There is no automation entry for this level crossing yet.",
    createEntry: "Create automation entry",
    entryAlreadyExists: "Automation entry already exists for this level crossing.",
    enabled: "Enabled",
    closeDelayMs: "Close delay (ms)",
    openDelayMs: "Open delay (ms)",
    minClosedMs: "Minimum closed time (ms)",
    summary: "Automation summary",
    closeTriggersCount: (count: number) => `Close triggers: ${count}`,
    openConditionsCount: (count: number) => `Open conditions: ${count}`,
    actionsCount: (count: number) => `Actions: ${count}`,
  },
  hu: {
    title: "Sorompólogika",
    loading: "Sorompólogika betöltése...",
    loaded: "Sorompólogika betöltve.",
    saved: "Sorompólogika mentve.",
    started: "Sorompó automatika elindítva.",
    stopped: "Sorompó automatika leállítva.",
    autostart: "Automatikus indítás",
    runtimeRunning: "Runtime fut",
    runtimeStopped: "Runtime áll",
    save: "Mentés",
    start: "Indítás",
    stop: "Leállítás",
    crossings: "Sorompók",
    noCrossings: "Nincs sorompó elem a pályán.",
    configured: "Beállítva",
    notConfigured: "Nincs beállítva",
    selectOrAdd: "Válassz egy sorompót a listából.",
    noEntryForSelected: "Ehhez a sorompóhoz még nincs automatika bejegyzés.",
    createEntry: "Automatika bejegyzés létrehozása",
    entryAlreadyExists: "Ehhez a sorompóhoz már van automatika bejegyzés.",
    enabled: "Engedélyezve",
    closeDelayMs: "Zárási késleltetés (ms)",
    openDelayMs: "Nyitási késleltetés (ms)",
    minClosedMs: "Minimális zárva tartás (ms)",
    summary: "Automatika összefoglaló",
    closeTriggersCount: (count: number) => `Zárási feltételek: ${count}`,
    openConditionsCount: (count: number) => `Nyitási feltételek: ${count}`,
    actionsCount: (count: number) => `Műveletek: ${count}`,
  },
  de: {
    title: "Bahnübergang-Logik",
    loading: "Bahnübergang-Logik wird geladen...",
    loaded: "Bahnübergang-Logik geladen.",
    saved: "Bahnübergang-Logik gespeichert.",
    started: "Bahnübergang-Automatik gestartet.",
    stopped: "Bahnübergang-Automatik gestoppt.",
    autostart: "Autostart",
    runtimeRunning: "Runtime läuft",
    runtimeStopped: "Runtime gestoppt",
    save: "Speichern",
    start: "Starten",
    stop: "Stoppen",
    crossings: "Bahnübergänge",
    noCrossings: "Kein Bahnübergangselement im Gleisplan.",
    configured: "Konfiguriert",
    notConfigured: "Nicht konfiguriert",
    selectOrAdd: "Wähle einen Bahnübergang aus der Liste.",
    noEntryForSelected: "Für diesen Bahnübergang gibt es noch keinen Automatik-Eintrag.",
    createEntry: "Automatik-Eintrag erstellen",
    entryAlreadyExists: "Für diesen Bahnübergang existiert bereits ein Automatik-Eintrag.",
    enabled: "Aktiviert",
    closeDelayMs: "Schließverzögerung (ms)",
    openDelayMs: "Öffnungsverzögerung (ms)",
    minClosedMs: "Mindest-Schließzeit (ms)",
    summary: "Automatik-Zusammenfassung",
    closeTriggersCount: (count: number) => `Schließauslöser: ${count}`,
    openConditionsCount: (count: number) => `Öffnungsbedingungen: ${count}`,
    actionsCount: (count: number) => `Aktionen: ${count}`,
  },
} as const;

function getLabels(language: string) {
  if (language.startsWith("hu")) return LABELS.hu;
  if (language.startsWith("de")) return LABELS.de;
  return LABELS.en;
}

function createLogicForElement(
  element: TrackLevelCrossingElementView
): LevelCrossingLogic {
  const logic = createDefaultLevelCrossingLogic(
    generateId(),
    element.id
  );

  logic.actions = element.basicAccessoryAddress > 0
    ? [{
        id: generateId(),
        type: "setAccessory",
        address: element.basicAccessoryAddress,
        activeWhenClosed: element.basicAccessoryClosedValue,
      }]
    : [];

  return logic;
}

function getCrossingLabel(
  element: TrackLevelCrossingElementView,
  index: number
): string {
  const name = element.name?.trim();
  return name || `#${index + 1} (${element.x}, ${element.y})`;
}

export default function LevelCrossingLogicDialog({
  opened,
  onClose,
  layout,
  initialLevelCrossingElementId,
  onInitialLevelCrossingElementIdConsumed,
}: LevelCrossingLogicDialogProps) {
  const { i18n } = useTranslation();
  const labels = getLabels(i18n.language);

  const [document, setDocument] = useState<LevelCrossingLogicDocumentDto>({
    version: 1,
    autostart: false,
    crossings: [],
  });
  const [runtimeState, setRuntimeState] = useState(DEFAULT_RUNTIME_STATE);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

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

  const selectedCrossing = crossings.find(crossing => crossing.id === selectedElementId) ?? crossings[0] ?? null;
  const selectedLogic = selectedCrossing
    ? document.crossings.find(logic => logic.levelCrossingElementId === selectedCrossing.id) ?? null
    : null;

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
        autostart: loadedDocument.autostart,
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

  const setAutostart = (autostart: boolean): void => {
    clearMessages();
    setDocument(previous => ({ ...previous, autostart }));
    setRuntimeState(previous => ({ ...previous, autostart }));
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
      size={1050}
      centered
      draggable
      styles={{
        content: {
          height: "min(760px, calc(100vh - 48px))",
          maxHeight: "min(760px, calc(100vh - 48px))",
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
      <Stack h="100%" gap="xs">
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
              label={labels.autostart}
              checked={document.autostart}
              onChange={event => setAutostart(event.currentTarget.checked)}
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
              loading={runtimeBusy}
              onClick={() => void startRuntime()}
            >
              {labels.start}
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              loading={runtimeBusy}
              onClick={() => void stopRuntime()}
            >
              {labels.stop}
            </Button>
          </Group>
        </Group>

        <Group align="stretch" wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
          <Card withBorder w={280} p="sm" style={{ flex: "0 0 280px" }}>
            <Group justify="space-between" mb="sm">
              <Title order={5}>{labels.crossings}</Title>
            </Group>

            <ScrollArea h="100%" type="auto" offsetScrollbars>
              <Stack gap="xs">
                {crossings.length === 0 && (
                  <Text size="sm" c="dimmed">
                    {labels.noCrossings}
                  </Text>
                )}

                {crossings.map(crossing => {
                  const selected = crossing.id === selectedCrossing?.id;
                  const hasLogic = document.crossings.some(
                    logic => logic.levelCrossingElementId === crossing.id
                  );

                  return (
                    <Button
                      key={crossing.id}
                      variant={selected ? "filled" : "light"}
                      justify="space-between"
                      h="auto"
                      py={6}
                      onClick={() => setSelectedElementId(crossing.id)}
                    >
                      <Stack gap={0} align="flex-start" style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate="end">
                          {crossing.label}
                        </Text>
                        <Text size="xs" c={selected ? "white" : "dimmed"}>
                          {hasLogic ? labels.configured : labels.notConfigured}
                        </Text>
                      </Stack>
                    </Button>
                  );
                })}
              </Stack>
            </ScrollArea>
          </Card>

          <Card withBorder p="md" style={{ flex: 1, minWidth: 0 }}>
            {!selectedCrossing ? (
              <Text c="dimmed">{labels.selectOrAdd}</Text>
            ) : !selectedLogic ? (
              <Stack gap="sm">
                <Title order={5}>{selectedCrossing.label}</Title>
                <Text c="dimmed">{labels.noEntryForSelected}</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => void ensureSelectedLogic()}
                >
                  {labels.createEntry}
                </Button>
              </Stack>
            ) : (
              <Stack gap="md">
                <Title order={5}>{selectedCrossing.label}</Title>

                <Switch
                  label={labels.enabled}
                  checked={selectedLogic.enabled}
                  onChange={event => updateSelectedLogic(logic => ({
                    ...logic,
                    enabled: event.currentTarget.checked,
                  }))}
                />

                <Group grow>
                  <NumberInput
                    label={labels.closeDelayMs}
                    value={selectedLogic.closeDelayMs}
                    min={0}
                    step={100}
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
                    onChange={value => updateSelectedLogic(logic => ({
                      ...logic,
                      minClosedMs: Number(value ?? 0),
                    }))}
                  />
                </Group>

                <Card withBorder p="sm">
                  <Text size="sm" fw={600}>{labels.summary}</Text>
                  <Text size="sm" c="dimmed">
                    {labels.closeTriggersCount(selectedLogic.closeTriggers.length)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {labels.openConditionsCount(selectedLogic.openConditions.length)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {labels.actionsCount(selectedLogic.actions.length)}
                  </Text>
                </Card>
              </Stack>
            )}
          </Card>
        </Group>
      </Stack>
    </AppModal>
  );
}

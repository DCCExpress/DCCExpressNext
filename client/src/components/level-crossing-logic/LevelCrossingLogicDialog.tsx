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

type Labels = {
  title: string;
  loading: string;
  loaded: string;
  saved: string;
  started: string;
  stopped: string;
  autostart: string;
  runtimeRunning: string;
  runtimeStopped: string;
  save: string;
  start: string;
  stop: string;
  crossings: string;
  noCrossings: string;
  configured: string;
  notConfigured: string;
  selectOrAdd: string;
  noEntryForSelected: string;
  createEntry: string;
  entryAlreadyExists: string;
  editorTab: string;
  previewTab: string;
  codeTab: string;
  enabled: string;
  disabled: string;
  closeDelayMs: string;
  openDelayMs: string;
  minClosedMs: string;
  timing: string;
  closeTriggersTitle: string;
  closeTriggersDescription: string;
  openConditionsTitle: string;
  openConditionsDescription: string;
  actionsTitle: string;
  actionsDescription: string;
  emptyConditions: string;
  addSensor: string;
  addBlock: string;
  addRoute: string;
  type: string;
  sensor: string;
  block: string;
  route: string;
  sensorAddress: string;
  blockId: string;
  fromBlock: string;
  toBlock: string;
  anyBlock: string;
  expectedState: string;
  sensorActive: string;
  sensorInactive: string;
  blockOccupied: string;
  blockFree: string;
  routeReserved: string;
  routeNotReserved: string;
  delete: string;
  emptyActions: string;
  addAccessory: string;
  actionType: string;
  accessoryAction: string;
  accessoryAddress: string;
  activeWhenClosed: string;
  active: string;
  inactive: string;
  previewTitle: string;
  previewCloseRule: string;
  previewOpenRule: string;
  previewTiming: string;
  previewActions: string;
  previewNoCloseTriggers: string;
  previewNoOpenConditions: string;
  previewAnyCloseTrigger: string;
  previewAllOpenConditions: string;
  previewNoActions: string;
  conditionSensor: (address: number, active: boolean) => string;
  conditionBlock: (block: string, occupied: boolean) => string;
  conditionRoute: (from: string, to: string, reserved: boolean) => string;
  actionAccessory: (address: number, active: boolean) => string;
  delaySummary: (closeDelay: number, openDelay: number, minClosed: number) => string;
};

const DEFAULT_RUNTIME_STATE: LevelCrossingRuntimeStateDto = {
  running: false,
  autostart: false,
  crossings: [],
};

const EN_LABELS: Labels = {
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
  editorTab: "Editor",
  previewTab: "Preview",
  codeTab: "Code",
  enabled: "Enabled",
  disabled: "Disabled",
  closeDelayMs: "Close delay (ms)",
  openDelayMs: "Open delay (ms)",
  minClosedMs: "Minimum closed time (ms)",
  timing: "Timing",
  closeTriggersTitle: "Close triggers",
  closeTriggersDescription: "The crossing closes when any of these conditions is true.",
  openConditionsTitle: "Additional open conditions",
  openConditionsDescription: "Optional. If empty, the crossing opens when no close trigger is active. If configured, every condition here must also be true.",
  actionsTitle: "Actions",
  actionsDescription: "Actions executed when the crossing changes state.",
  emptyConditions: "No conditions configured.",
  addSensor: "Sensor",
  addBlock: "Block",
  addRoute: "Route",
  type: "Type",
  sensor: "Sensor",
  block: "Block",
  route: "Route reservation",
  sensorAddress: "Sensor address",
  blockId: "Block",
  fromBlock: "From block",
  toBlock: "To block",
  anyBlock: "Any",
  expectedState: "Expected state",
  sensorActive: "Active",
  sensorInactive: "Inactive",
  blockOccupied: "Occupied",
  blockFree: "Free",
  routeReserved: "Reserved",
  routeNotReserved: "Not reserved",
  delete: "Delete",
  emptyActions: "No actions configured.",
  addAccessory: "Accessory",
  actionType: "Action type",
  accessoryAction: "Set accessory",
  accessoryAddress: "Accessory address",
  activeWhenClosed: "When closed",
  active: "Active",
  inactive: "Inactive",
  previewTitle: "Logic preview",
  previewCloseRule: "Close rule",
  previewOpenRule: "Open rule",
  previewTiming: "Timing",
  previewActions: "Actions",
  previewNoCloseTriggers: "No close triggers configured, so this crossing will never close automatically.",
  previewNoOpenConditions: "No additional open conditions. The crossing opens when none of the close triggers are active.",
  previewAnyCloseTrigger: "Close if any of these is true:",
  previewAllOpenConditions: "Open only if all of these are true:",
  previewNoActions: "No actions configured.",
  conditionSensor: (address, active) => `Sensor ${address} is ${active ? "active" : "inactive"}`,
  conditionBlock: (block, occupied) => `Block ${block} is ${occupied ? "occupied" : "free"}`,
  conditionRoute: (from, to, reserved) => `Route ${from} → ${to} is ${reserved ? "reserved" : "not reserved"}`,
  actionAccessory: (address, active) => `Set accessory ${address} to ${active ? "active" : "inactive"} when closed`,
  delaySummary: (closeDelay, openDelay, minClosed) => `Close delay: ${closeDelay} ms, open delay: ${openDelay} ms, minimum closed time: ${minClosed} ms`,
};

const HU_LABELS: Labels = {
  ...EN_LABELS,
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
  editorTab: "Szerkesztő",
  previewTab: "Előnézet",
  codeTab: "Kód",
  enabled: "Engedélyezve",
  disabled: "Letiltva",
  closeDelayMs: "Zárási késleltetés (ms)",
  openDelayMs: "Nyitási késleltetés (ms)",
  minClosedMs: "Minimális zárva tartás (ms)",
  timing: "Időzítés",
  closeTriggersTitle: "Zárási feltételek",
  closeTriggersDescription: "A sorompó lezár, ha ezek közül bármelyik feltétel igaz.",
  openConditionsTitle: "További nyitási feltételek",
  openConditionsDescription: "Opcionális. Ha üres, a sorompó akkor nyit, amikor már egyik zárási feltétel sem aktív. Ha meg van adva, itt minden feltételnek igaznak kell lennie.",
  actionsTitle: "Műveletek",
  actionsDescription: "Állapotváltáskor végrehajtott műveletek.",
  emptyConditions: "Nincs feltétel beállítva.",
  addSensor: "Szenzor",
  addBlock: "Blokk",
  addRoute: "Útvonal",
  type: "Típus",
  sensor: "Szenzor",
  block: "Blokk",
  route: "Útvonalfoglalás",
  sensorAddress: "Szenzor címe",
  blockId: "Blokk",
  fromBlock: "Induló blokk",
  toBlock: "Cél blokk",
  anyBlock: "Bármelyik",
  expectedState: "Elvárt állapot",
  sensorActive: "Aktív",
  sensorInactive: "Inaktív",
  blockOccupied: "Foglalt",
  blockFree: "Szabad",
  routeReserved: "Foglalt útvonal",
  routeNotReserved: "Nincs foglalva",
  delete: "Törlés",
  emptyActions: "Nincs művelet beállítva.",
  addAccessory: "Accessory",
  actionType: "Művelet típusa",
  accessoryAction: "Accessory állítás",
  accessoryAddress: "Accessory cím",
  activeWhenClosed: "Zárt állapotban",
  active: "Aktív",
  inactive: "Inaktív",
  previewTitle: "Logika előnézet",
  previewCloseRule: "Zárási szabály",
  previewOpenRule: "Nyitási szabály",
  previewTiming: "Időzítés",
  previewActions: "Műveletek",
  previewNoCloseTriggers: "Nincs zárási feltétel, ezért ez a sorompó automatikusan sosem fog lezárni.",
  previewNoOpenConditions: "Nincs további nyitási feltétel. A sorompó akkor nyit, amikor már egyik zárási feltétel sem aktív.",
  previewAnyCloseTrigger: "Zár, ha ezek közül bármelyik igaz:",
  previewAllOpenConditions: "Csak akkor nyit, ha ezek mind igazak:",
  previewNoActions: "Nincs művelet beállítva.",
  conditionSensor: (address, active) => `${address}. szenzor ${active ? "aktív" : "inaktív"}`,
  conditionBlock: (block, occupied) => `${block} blokk ${occupied ? "foglalt" : "szabad"}`,
  conditionRoute: (from, to, reserved) => `${from} → ${to} útvonal ${reserved ? "foglalt" : "nincs foglalva"}`,
  actionAccessory: (address, active) => `${address}. accessory ${active ? "aktív" : "inaktív"} zárt állapotban`,
  delaySummary: (closeDelay, openDelay, minClosed) => `Zárási késleltetés: ${closeDelay} ms, nyitási késleltetés: ${openDelay} ms, minimális zárva tartás: ${minClosed} ms`,
};

const DE_LABELS: Labels = {
  ...EN_LABELS,
  title: "Bahnübergang-Logik",
  loading: "Bahnübergang-Logik wird geladen...",
  loaded: "Bahnübergang-Logik geladen.",
  saved: "Bahnübergang-Logik gespeichert.",
  started: "Bahnübergang-Automatik gestartet.",
  stopped: "Bahnübergang-Automatik gestoppt.",
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
  previewTab: "Vorschau",
  enabled: "Aktiviert",
  disabled: "Deaktiviert",
  closeDelayMs: "Schließverzögerung (ms)",
  openDelayMs: "Öffnungsverzögerung (ms)",
  minClosedMs: "Mindest-Schließzeit (ms)",
  timing: "Zeitsteuerung",
  closeTriggersTitle: "Schließauslöser",
  closeTriggersDescription: "Der Bahnübergang schließt, wenn eine dieser Bedingungen wahr ist.",
  openConditionsTitle: "Zusätzliche Öffnungsbedingungen",
  openConditionsDescription: "Optional. Wenn leer, öffnet der Bahnübergang, sobald kein Schließauslöser aktiv ist. Wenn konfiguriert, müssen alle Bedingungen hier wahr sein.",
  actionsDescription: "Aktionen, die bei Zustandsänderungen ausgeführt werden.",
  emptyConditions: "Keine Bedingungen konfiguriert.",
  addBlock: "Block",
  route: "Routenreservierung",
  sensorAddress: "Sensoradresse",
  fromBlock: "Von Block",
  toBlock: "Nach Block",
  anyBlock: "Beliebig",
  expectedState: "Erwarteter Zustand",
  sensorActive: "Aktiv",
  sensorInactive: "Inaktiv",
  blockOccupied: "Belegt",
  blockFree: "Frei",
  routeReserved: "Reserviert",
  routeNotReserved: "Nicht reserviert",
  delete: "Löschen",
  emptyActions: "Keine Aktionen konfiguriert.",
  addAccessory: "Zubehör",
  actionType: "Aktionstyp",
  accessoryAction: "Zubehör schalten",
  accessoryAddress: "Zubehöradresse",
  activeWhenClosed: "Wenn geschlossen",
  previewTitle: "Logik-Vorschau",
  previewCloseRule: "Schließregel",
  previewOpenRule: "Öffnungsregel",
  previewTiming: "Zeitsteuerung",
  previewNoCloseTriggers: "Keine Schließauslöser konfiguriert, daher schließt dieser Bahnübergang nicht automatisch.",
  previewNoOpenConditions: "Keine zusätzlichen Öffnungsbedingungen. Der Bahnübergang öffnet, wenn kein Schließauslöser aktiv ist.",
  previewAnyCloseTrigger: "Schließt, wenn eine dieser Bedingungen wahr ist:",
  previewAllOpenConditions: "Öffnet nur, wenn alle Bedingungen wahr sind:",
  previewNoActions: "Keine Aktionen konfiguriert.",
  conditionSensor: (address, active) => `Sensor ${address} ist ${active ? "aktiv" : "inaktiv"}`,
  conditionBlock: (block, occupied) => `Block ${block} ist ${occupied ? "belegt" : "frei"}`,
  conditionRoute: (from, to, reserved) => `Route ${from} → ${to} ist ${reserved ? "reserviert" : "nicht reserviert"}`,
  actionAccessory: (address, active) => `Zubehör ${address} auf ${active ? "aktiv" : "inaktiv"} setzen, wenn geschlossen`,
  delaySummary: (closeDelay, openDelay, minClosed) => `Schließverzögerung: ${closeDelay} ms, Öffnungsverzögerung: ${openDelay} ms, Mindest-Schließzeit: ${minClosed} ms`,
};

function getLabels(language: string): Labels {
  if (language.startsWith("hu")) return HU_LABELS;
  if (language.startsWith("de")) return DE_LABELS;
  return EN_LABELS;
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

function getBlockLabel(
  element: BlockElementView,
  index: number
): string {
  const name = element.name?.trim();
  const text = element.text?.trim();
  return name || text || `Block #${index + 1} (${element.x}, ${element.y})`;
}

function getBlockDisplayName(
  blockId: string | undefined,
  blockLabelById: Map<string, string>,
  fallback: string
): string {
  if (!blockId) {
    return fallback;
  }

  return blockLabelById.get(blockId) ?? blockId;
}

function describeCondition(
  condition: LevelCrossingCondition,
  blockLabelById: Map<string, string>,
  labels: Labels
): string {
  if (condition.type === "sensor") {
    return labels.conditionSensor(condition.sensorAddress, condition.active);
  }

  if (condition.type === "block") {
    return labels.conditionBlock(
      getBlockDisplayName(condition.blockId, blockLabelById, condition.blockId),
      condition.occupied
    );
  }

  return labels.conditionRoute(
    getBlockDisplayName(condition.fromBlockId, blockLabelById, labels.anyBlock),
    getBlockDisplayName(condition.toBlockId, blockLabelById, labels.anyBlock),
    condition.reserved
  );
}

function describeAction(
  action: LevelCrossingAction,
  labels: Labels
): string {
  if (action.type === "setAccessory") {
    return labels.actionAccessory(action.address, action.activeWhenClosed);
  }

  return `${action.type}`;
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

  const blockLabelById = useMemo(() => {
    return new Map(blockOptions.map(option => [option.value, option.label]));
  }, [blockOptions]);

  const selectedCrossing = crossings.find(crossing => crossing.id === selectedElementId) ?? crossings[0] ?? null;
  const selectedLogic = selectedCrossing
    ? document.crossings.find(logic => logic.levelCrossingElementId === selectedCrossing.id) ?? null
    : null;

  const selectedLogicCode = useMemo(() => {
    return selectedLogic
      ? JSON.stringify(selectedLogic, null, 2)
      : "";
  }, [selectedLogic]);

  const conditionLabels = {
    empty: labels.emptyConditions,
    addSensor: labels.addSensor,
    addBlock: labels.addBlock,
    addRoute: labels.addRoute,
    type: labels.type,
    sensor: labels.sensor,
    block: labels.block,
    route: labels.route,
    sensorAddress: labels.sensorAddress,
    blockId: labels.blockId,
    fromBlock: labels.fromBlock,
    toBlock: labels.toBlock,
    anyBlock: labels.anyBlock,
    expectedState: labels.expectedState,
    sensorActive: labels.sensorActive,
    sensorInactive: labels.sensorInactive,
    blockOccupied: labels.blockOccupied,
    blockFree: labels.blockFree,
    routeReserved: labels.routeReserved,
    routeNotReserved: labels.routeNotReserved,
    delete: labels.delete,
  };

  const actionLabels = {
    title: labels.actionsTitle,
    description: labels.actionsDescription,
    empty: labels.emptyActions,
    addAccessory: labels.addAccessory,
    actionType: labels.actionType,
    accessoryAction: labels.accessoryAction,
    accessoryAddress: labels.accessoryAddress,
    activeWhenClosed: labels.activeWhenClosed,
    active: labels.active,
    inactive: labels.inactive,
    delete: labels.delete,
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

  const updateCloseTriggers = (closeTriggers: LevelCrossingCondition[]): void => {
    updateSelectedLogic(logic => ({ ...logic, closeTriggers }));
  };

  const updateOpenConditions = (openConditions: LevelCrossingCondition[]): void => {
    updateSelectedLogic(logic => ({ ...logic, openConditions }));
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

  const renderEditorPanel = () => {
    if (!selectedCrossing || !selectedLogic) return null;

    return (
      <ScrollArea h="100%" type="auto" offsetScrollbars>
        <Stack gap="md" pr="xs">
          <Title order={5}>{selectedCrossing.label}</Title>

          <Switch
            label={labels.enabled}
            checked={selectedLogic.enabled}
            onChange={event => updateSelectedLogic(logic => ({
              ...logic,
              enabled: event.currentTarget.checked,
            }))}
          />

          <Card withBorder p="sm">
            <Stack gap="xs">
              <Text size="sm" fw={600}>{labels.timing}</Text>
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
            </Stack>
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
            onChange={actions => updateSelectedLogic(logic => ({
              ...logic,
              actions,
            }))}
            labels={actionLabels}
          />
        </Stack>
      </ScrollArea>
    );
  };

  const renderPreviewPanel = () => {
    if (!selectedLogic) return null;

    return (
      <ScrollArea h="100%" type="auto" offsetScrollbars>
        <Stack gap="md" pr="xs">
          <Title order={5}>{labels.previewTitle}</Title>

          <Card withBorder p="sm">
            <Stack gap="xs">
              <Text size="sm" fw={600}>{labels.enabled}</Text>
              <Text size="sm" c={selectedLogic.enabled ? "green" : "dimmed"}>
                {selectedLogic.enabled ? labels.enabled : labels.disabled}
              </Text>
            </Stack>
          </Card>

          <Card withBorder p="sm">
            <Stack gap="xs">
              <Text size="sm" fw={600}>{labels.previewTiming}</Text>
              <Text size="sm" c="dimmed">
                {labels.delaySummary(
                  selectedLogic.closeDelayMs,
                  selectedLogic.openDelayMs,
                  selectedLogic.minClosedMs
                )}
              </Text>
            </Stack>
          </Card>

          <Card withBorder p="sm">
            <Stack gap="xs">
              <Text size="sm" fw={600}>{labels.previewCloseRule}</Text>
              {selectedLogic.closeTriggers.length === 0 ? (
                <Text size="sm" c="orange">{labels.previewNoCloseTriggers}</Text>
              ) : (
                <>
                  <Text size="sm" c="dimmed">{labels.previewAnyCloseTrigger}</Text>
                  <Stack gap={4} pl="sm">
                    {selectedLogic.closeTriggers.map(condition => (
                      <Text key={condition.id} size="sm">
                        • {describeCondition(condition, blockLabelById, labels)}
                      </Text>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          </Card>

          <Card withBorder p="sm">
            <Stack gap="xs">
              <Text size="sm" fw={600}>{labels.previewOpenRule}</Text>
              {selectedLogic.openConditions.length === 0 ? (
                <Text size="sm" c="dimmed">{labels.previewNoOpenConditions}</Text>
              ) : (
                <>
                  <Text size="sm" c="dimmed">{labels.previewAllOpenConditions}</Text>
                  <Stack gap={4} pl="sm">
                    {selectedLogic.openConditions.map(condition => (
                      <Text key={condition.id} size="sm">
                        • {describeCondition(condition, blockLabelById, labels)}
                      </Text>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          </Card>

          <Card withBorder p="sm">
            <Stack gap="xs">
              <Text size="sm" fw={600}>{labels.previewActions}</Text>
              {selectedLogic.actions.length === 0 ? (
                <Text size="sm" c="dimmed">{labels.previewNoActions}</Text>
              ) : (
                <Stack gap={4} pl="sm">
                  {selectedLogic.actions.map(action => (
                    <Text key={action.id} size="sm">
                      • {describeAction(action, labels)}
                    </Text>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>
        </Stack>
      </ScrollArea>
    );
  };

  const renderCodePanel = () => (
    <ScrollArea h="100%" type="auto" offsetScrollbars>
      <Stack gap="xs" pr="xs">
        <Title order={5}>{labels.codeTab}</Title>
        <pre
          style={{
            margin: 0,
            padding: 12,
            borderRadius: 8,
            overflow: "auto",
            background: "var(--mantine-color-dark-7)",
            color: "var(--mantine-color-gray-0)",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          <code>{selectedLogicCode}</code>
        </pre>
      </Stack>
    </ScrollArea>
  );

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={labels.title}
      size={1200}
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
          <Card withBorder w={280} p="sm" style={{ flex: "0 0 280px", minHeight: 0 }}>
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

          <Card
            withBorder
            p="md"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {!selectedCrossing ? (
              <Text c="dimmed">{labels.selectOrAdd}</Text>
            ) : !selectedLogic ? (
              <ScrollArea h="100%" type="auto" offsetScrollbars>
                <Stack gap="sm" pr="xs">
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
              </ScrollArea>
            ) : (
              <Tabs
                defaultValue="editor"
                keepMounted={false}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Tabs.List mb="sm" style={{ flex: "0 0 auto" }}>
                  <Tabs.Tab value="editor">{labels.editorTab}</Tabs.Tab>
                  <Tabs.Tab value="preview">{labels.previewTab}</Tabs.Tab>
                  <Tabs.Tab value="code">{labels.codeTab}</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="editor" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  {renderEditorPanel()}
                </Tabs.Panel>

                <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  {renderPreviewPanel()}
                </Tabs.Panel>

                <Tabs.Panel value="code" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  {renderCodePanel()}
                </Tabs.Panel>
              </Tabs>
            )}
          </Card>
        </Group>
      </Stack>
    </AppModal>
  );
}

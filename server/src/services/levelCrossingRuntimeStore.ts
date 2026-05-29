import type {
  LevelCrossingConditionValue,
  LevelCrossingLogic,
  LevelCrossingLogicDocumentDto,
  LevelCrossingRuntimeState,
  LevelCrossingRuntimeStateDto,
} from "../../../common/src/levelCrossingLogic.js";

import type {
  AutomationRuntimeModule,
} from "./automationRuntimeService.js";

import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  log,
  logError,
} from "../utility.js";

import {
  broadcastAll,
} from "../ws/wsServer.js";

import {
  routeGraphRuntimeStore,
} from "./routeGraphRuntimeStore.js";

import {
  LevelCrossingRuntimeService,
} from "./levelCrossingRuntimeService.js";

import {
  levelCrossingLogicStore,
} from "./levelCrossingLogicStore.js";

function normalizeRouteBlockKey(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : undefined;
}

function routeBlockMatches(
  requested: string | undefined,
  reservationId: string | undefined,
  reservationName: string | undefined
): boolean {
  if (requested === undefined) {
    return true;
  }

  return requested === reservationId || requested === reservationName;
}

function getSensorActive(sensorAddress: number): LevelCrossingConditionValue {
  const commandCenter = CommandCenter.getActive();

  if (!commandCenter) {
    return "unknown";
  }

  const sensor = commandCenter
    .getSensors()
    .find(item => item.address === sensorAddress);

  return sensor === undefined
    ? "unknown"
    : Boolean(sensor.active);
}

function getBlockOccupied(blockId: string): LevelCrossingConditionValue {
  const commandCenter = CommandCenter.getActive();

  if (!commandCenter) {
    return "unknown";
  }

  const block = commandCenter.getBlockState(blockId);

  return block === null
    ? "unknown"
    : block.locoId !== null && block.locoId !== undefined && String(block.locoId).trim().length > 0;
}

function getRouteReserved(
  fromBlockId?: string,
  toBlockId?: string
): LevelCrossingConditionValue {
  const reservations = routeGraphRuntimeStore.getActiveReservations();
  const requestedFrom = normalizeRouteBlockKey(fromBlockId);
  const requestedTo = normalizeRouteBlockKey(toBlockId);

  if (requestedFrom === undefined && requestedTo === undefined) {
    return reservations.length > 0;
  }

  const matches = reservations.some(reservation => {
    const fromMatches = routeBlockMatches(
      requestedFrom,
      reservation.fromBlockId,
      reservation.fromBlockName
    );
    const toMatches = routeBlockMatches(
      requestedTo,
      reservation.toBlockId,
      reservation.toBlockName
    );

    return fromMatches && toMatches;
  });

  return matches;
}

function getAccessoryActive(address: number): LevelCrossingConditionValue {
  const commandCenter = CommandCenter.getActive();

  if (!commandCenter) {
    return "unknown";
  }

  const accessory = commandCenter
    .getAccessories()
    .find(item => item.address === address);

  return accessory === undefined
    ? "unknown"
    : Boolean(accessory.active);
}

async function setCrossingState(
  logic: LevelCrossingLogic,
  state: LevelCrossingRuntimeState
): Promise<void> {
  log(
    `[LevelCrossingAutomation] ${logic.levelCrossingElementId || logic.id} -> ${state}`
  );
}

async function setElementState(
  logic: LevelCrossingLogic,
  state: LevelCrossingRuntimeState
): Promise<void> {
  broadcastAll({
    type: "levelCrossingElementStateChanged",
    data: {
      levelCrossingElementId: logic.levelCrossingElementId,
      state,
    },
  } as TypedServerWsMessage);
}

async function setAccessory(
  address: number,
  active: boolean,
  logic: LevelCrossingLogic
): Promise<void> {
  const commandCenter = CommandCenter.getActive();

  if (!commandCenter) {
    logError(
      `[LevelCrossingAutomation] Cannot set accessory #${address}: no command center.`,
      logic.id
    );
    return;
  }

  const success = await commandCenter.setBasicAccessory(address, active);

  if (!success) {
    logError(
      `[LevelCrossingAutomation] Failed to set accessory #${address} to ${active ? "active" : "inactive"}.`,
      logic.id
    );
    return;
  }

  commandCenter.setKnownBasicAccessoryState(address, active);
}

const serverRuntimeDataProvider = {
  getSensorActive,
  getBlockOccupied,
  getRouteReserved,
  getAccessoryActive,
};

const serverRuntimeActionSink = {
  setCrossingState,
  setElementState,
  setAccessory,
};

class LevelCrossingRuntimeStore implements AutomationRuntimeModule {
  readonly id = "levelCrossing";
  readonly name = "Level crossings";

  private readonly service = new LevelCrossingRuntimeService(
    serverRuntimeDataProvider,
    serverRuntimeActionSink
  );
  private initialized = false;

  async isEnabled(): Promise<boolean> {
    await this.initialize();
    return levelCrossingLogicStore.getDocument().enabled;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await levelCrossingLogicStore.initialize();
    this.service.setDocument(levelCrossingLogicStore.getDocument());
    this.initialized = true;
  }

  async loadDocument(): Promise<LevelCrossingLogicDocumentDto> {
    await this.initialize();
    const document = levelCrossingLogicStore.getDocument();
    this.service.setDocument(document);
    return document;
  }

  async saveDocument(input: LevelCrossingLogicDocumentDto): Promise<LevelCrossingLogicDocumentDto> {
    await this.initialize();
    const document = await levelCrossingLogicStore.saveDocument(input);
    this.service.setDocument(document);
    return document;
  }

  async start(): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();
    const document = await levelCrossingLogicStore.setEnabled(true);
    this.service.setDocument(document);
    this.service.start();
    return this.snapshot();
  }

  async stop(): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();
    const document = await levelCrossingLogicStore.setEnabled(false);
    this.service.setDocument(document);
    this.service.stop();
    return this.snapshot();
  }

  async restoreEnabledState(): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();
    const document = levelCrossingLogicStore.getDocument();
    this.service.setDocument(document);

    if (document.enabled) {
      this.service.start();
    } else {
      this.service.stop();
    }

    return this.snapshot();
  }

  async snapshot(): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();
    const serviceSnapshot = this.service.snapshot() as LevelCrossingRuntimeStateDto & { autostart?: boolean };

    return {
      ...serviceSnapshot,
      enabled: levelCrossingLogicStore.getDocument().enabled,
    };
  }

  async evaluateOnce(nowMs = Date.now()): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();

    if (!(await this.isEnabled())) {
      const snapshot = await this.snapshot();
      this.broadcastState(snapshot);
      return snapshot;
    }

    const snapshot = await this.service.evaluateOnce(nowMs);
    this.broadcastState(snapshot);
    return snapshot;
  }

  private broadcastState(snapshot: LevelCrossingRuntimeStateDto): void {
    broadcastAll({
      type: "levelCrossingStateChanged",
      data: snapshot,
    });
  }
}

export const levelCrossingRuntimeStore = new LevelCrossingRuntimeStore();

import type {
  LevelCrossingConditionValue,
  LevelCrossingLogic,
  LevelCrossingLogicDocumentDto,
  LevelCrossingRuntimeState,
  LevelCrossingRuntimeStateDto,
} from "../../../common/src/levelCrossingLogic.js";

import {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  log,
  logError,
} from "../utility.js";

import {
  routeGraphRuntimeStore,
} from "./routeGraphRuntimeStore.js";

import {
  LevelCrossingRuntimeService,
} from "./levelCrossingRuntimeService.js";

import {
  levelCrossingLogicStore,
} from "./levelCrossingLogicStore.js";

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

  if (fromBlockId === undefined && toBlockId === undefined) {
    return reservations.length > 0;
  }

  const matches = reservations.some(reservation => {
    const fromMatches = fromBlockId === undefined
      || reservation.fromBlockName === fromBlockId;
    const toMatches = toBlockId === undefined
      || reservation.toBlockName === toBlockId;

    return fromMatches && toMatches;
  });

  return matches;
}

async function setCrossingState(
  logic: LevelCrossingLogic,
  state: LevelCrossingRuntimeState
): Promise<void> {
  log(
    `[LevelCrossingRuntime] ${logic.levelCrossingElementId || logic.id} -> ${state}`
  );
}

async function setAccessory(
  address: number,
  active: boolean,
  logic: LevelCrossingLogic
): Promise<void> {
  const commandCenter = CommandCenter.getActive();

  if (!commandCenter) {
    logError(
      `[LevelCrossingRuntime] Cannot set accessory #${address}: no command center.`,
      logic.id
    );
    return;
  }

  const success = await commandCenter.setBasicAccessory(address, active);

  if (!success) {
    logError(
      `[LevelCrossingRuntime] Failed to set accessory #${address} to ${active ? "active" : "inactive"}.`,
      logic.id
    );
  }
}

const serverRuntimeDataProvider = {
  getSensorActive,
  getBlockOccupied,
  getRouteReserved,
};

const serverRuntimeActionSink = {
  setCrossingState,
  setAccessory,
};

class LevelCrossingRuntimeStore {
  private readonly service = new LevelCrossingRuntimeService(
    serverRuntimeDataProvider,
    serverRuntimeActionSink
  );
  private initialized = false;

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
    this.service.start();
    return this.service.snapshot();
  }

  async stop(): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();
    this.service.stop();
    return this.service.snapshot();
  }

  async snapshot(): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();
    return this.service.snapshot();
  }

  async evaluateOnce(): Promise<LevelCrossingRuntimeStateDto> {
    await this.initialize();
    return this.service.evaluateOnce();
  }
}

export const levelCrossingRuntimeStore = new LevelCrossingRuntimeStore();

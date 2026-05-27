import type {
  LevelCrossingConditionValue,
  LevelCrossingLogicDocumentDto,
  LevelCrossingRuntimeStateDto,
} from "../../../common/src/levelCrossingLogic.js";

import {
  LevelCrossingRuntimeService,
} from "./levelCrossingRuntimeService.js";

import {
  levelCrossingLogicStore,
} from "./levelCrossingLogicStore.js";

const unknownDataProvider = {
  getSensorActive: (_sensorAddress: number): LevelCrossingConditionValue => "unknown",
  getBlockOccupied: (_blockId: string): LevelCrossingConditionValue => "unknown",
  getRouteReserved: (_fromBlockId?: string, _toBlockId?: string): LevelCrossingConditionValue => "unknown",
};

class LevelCrossingRuntimeStore {
  private readonly service = new LevelCrossingRuntimeService(unknownDataProvider);
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

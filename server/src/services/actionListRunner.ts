import type {
  BlockAction,
  BlockActionHook,
  Loco,
  LocoAction,
  LocoActionHook,
} from "../../../common/src/types.js";
import type { BlockElement } from "../../../common/src/layout/elements/BlockElement.js";
import type { CommandCenter } from "../commandCenter/CommandCenter.js";

export type ActionListStatusPayload = {
  runKey: string;
  sourceType: string;
  sourceId: string;
  hook: string;
  running: boolean;
  currentIndex: number;
  total: number;
  message?: string;
  error?: string;
};

export type ActionListRunnerCallbacks = {
  status: (payload: ActionListStatusPayload) => void;
};

export type LocoActionListStatusPayload = ActionListStatusPayload & {
  locoId: string;
  locoAddress: number;
  hook: LocoActionHook;
};

export type LocoActionListCallbacks = {
  playAudio: (fileName: string) => void;
  status: (payload: LocoActionListStatusPayload) => void;
};

export type BlockActionListStatusPayload = ActionListStatusPayload & {
  blockId: string;
  blockName: string;
  hook: BlockActionHook;
};

export type BlockActionListCallbacks = {
  playAudio: (fileName: string) => void;
  status: (payload: BlockActionListStatusPayload) => void;
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));

class ActionListRunner {
  private readonly runningKeys = new Set<string>();

  isRunning(key: string): boolean {
    return this.runningKeys.has(key);
  }

  async run<TAction>(params: {
    runKey: string;
    sourceType: string;
    sourceId: string;
    hook: string;
    actions: TAction[];
    callbacks: ActionListRunnerCallbacks;
    executeAction: (action: TAction, index: number) => Promise<void>;
  }): Promise<void> {
    const { runKey, sourceType, sourceId, hook, actions, callbacks, executeAction } = params;

    if (this.runningKeys.has(runKey)) {
      throw new Error(`Action list is already running: ${runKey}`);
    }

    this.runningKeys.add(runKey);

    callbacks.status({ runKey, sourceType, sourceId, hook, running: true, currentIndex: 0, total: actions.length, message: "started" });

    try {
      for (let index = 0; index < actions.length; index++) {
        callbacks.status({ runKey, sourceType, sourceId, hook, running: true, currentIndex: index + 1, total: actions.length });
        await executeAction(actions[index]!, index);
      }

      callbacks.status({ runKey, sourceType, sourceId, hook, running: false, currentIndex: actions.length, total: actions.length, message: "finished" });
    } catch (error) {
      callbacks.status({
        runKey,
        sourceType,
        sourceId,
        hook,
        running: false,
        currentIndex: 0,
        total: actions.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      this.runningKeys.delete(runKey);
    }
  }
}

export const actionListRunner = new ActionListRunner();

function toLocoStatus(payload: ActionListStatusPayload, loco: Loco, hook: LocoActionHook): LocoActionListStatusPayload {
  return { ...payload, locoId: loco.id, locoAddress: loco.address, hook };
}

function toBlockStatus(payload: ActionListStatusPayload, block: BlockElement, hook: BlockActionHook): BlockActionListStatusPayload {
  return { ...payload, blockId: block.id, blockName: block.name, hook };
}

async function runLocoAction(
  loco: Loco,
  action: LocoAction,
  commandCenter: CommandCenter,
  callbacks: LocoActionListCallbacks
): Promise<void> {
  switch (action.type) {
    case "setFunction": {
      const ok = await commandCenter.setLocoFunction(loco.address, action.functionNumber, action.active);
      if (!ok) throw new Error(`Failed to set F${action.functionNumber}`);
      return;
    }

    case "momentaryFunction": {
      const onOk = await commandCenter.setLocoFunction(loco.address, action.functionNumber, true);
      if (!onOk) throw new Error(`Failed to set F${action.functionNumber} on`);
      await sleep(action.ms);
      const offOk = await commandCenter.setLocoFunction(loco.address, action.functionNumber, false);
      if (!offOk) throw new Error(`Failed to set F${action.functionNumber} off`);
      return;
    }

    case "playAudio": {
      const fileName = action.fileName.trim();
      if (fileName) callbacks.playAudio(fileName);
      return;
    }

    case "wait":
      await sleep(action.ms);
      return;
  }
}

async function runBlockAction(
  action: BlockAction,
  callbacks: BlockActionListCallbacks
): Promise<void> {
  switch (action.type) {
    case "playAudio": {
      const fileName = action.fileName.trim();
      if (fileName) callbacks.playAudio(fileName);
      return;
    }

    case "wait":
      await sleep(action.ms);
      return;
  }
}

export async function runLocoActionList(params: {
  loco: Loco;
  hook: LocoActionHook;
  actions: LocoAction[];
  commandCenter: CommandCenter;
  callbacks: LocoActionListCallbacks;
  runKey?: string;
}): Promise<void> {
  const { loco, hook, actions, commandCenter, callbacks } = params;
  const runKey = params.runKey ?? `loco:${loco.id}`;

  await actionListRunner.run<LocoAction>({
    runKey,
    sourceType: "loco",
    sourceId: loco.id,
    hook,
    actions,
    callbacks: { status: payload => callbacks.status(toLocoStatus(payload, loco, hook)) },
    executeAction: action => runLocoAction(loco, action, commandCenter, callbacks),
  });
}

export async function runBlockActionList(params: {
  block: BlockElement;
  hook: BlockActionHook;
  actions: BlockAction[];
  callbacks: BlockActionListCallbacks;
  runKey?: string;
}): Promise<void> {
  const { block, hook, actions, callbacks } = params;
  const runKey = params.runKey ?? `block:${block.id}:${hook}`;

  await actionListRunner.run<BlockAction>({
    runKey,
    sourceType: "block",
    sourceId: block.id,
    hook,
    actions,
    callbacks: { status: payload => callbacks.status(toBlockStatus(payload, block, hook)) },
    executeAction: action => runBlockAction(action, callbacks),
  });
}

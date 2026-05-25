import type { Loco, LocoAction, LocoActionHook } from "../../../common/src/types.js";
import type { CommandCenter } from "../commandCenter/CommandCenter.js";

export type LocoActionRunnerCallbacks = {
  playAudio: (fileName: string) => void;
  status: (payload: LocoActionListStatusPayload) => void;
};

export type LocoActionListStatusPayload = {
  locoId: string;
  locoAddress: number;
  hook: LocoActionHook;
  running: boolean;
  currentIndex: number;
  total: number;
  message?: string;
  error?: string;
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));

class LocoActionRunner {
  private readonly runningKeys = new Set<string>();

  isRunning(key: string): boolean {
    return this.runningKeys.has(key);
  }

  async run(params: {
    loco: Loco;
    hook: LocoActionHook;
    actions: LocoAction[];
    commandCenter: CommandCenter;
    callbacks: LocoActionRunnerCallbacks;
    runKey?: string;
  }): Promise<void> {
    const { loco, hook, actions, commandCenter, callbacks } = params;
    const runKey = params.runKey ?? `loco:${loco.id}`;

    if (this.runningKeys.has(runKey)) {
      throw new Error("Loco action list is already running.");
    }

    this.runningKeys.add(runKey);

    callbacks.status({
      locoId: loco.id,
      locoAddress: loco.address,
      hook,
      running: true,
      currentIndex: 0,
      total: actions.length,
      message: "started",
    });

    try {
      for (let index = 0; index < actions.length; index++) {
        callbacks.status({
          locoId: loco.id,
          locoAddress: loco.address,
          hook,
          running: true,
          currentIndex: index + 1,
          total: actions.length,
        });

        await this.runOne(loco, actions[index]!, commandCenter, callbacks);
      }

      callbacks.status({
        locoId: loco.id,
        locoAddress: loco.address,
        hook,
        running: false,
        currentIndex: actions.length,
        total: actions.length,
        message: "finished",
      });
    } catch (error) {
      callbacks.status({
        locoId: loco.id,
        locoAddress: loco.address,
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

  private async runOne(
    loco: Loco,
    action: LocoAction,
    commandCenter: CommandCenter,
    callbacks: LocoActionRunnerCallbacks
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
}

export const locoActionRunner = new LocoActionRunner();

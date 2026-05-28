import type {
  LevelCrossingResponsePayload,
} from "../../../../common/src/levelCrossingLogic.js";

import {
  automationRuntimeService,
} from "../../services/automationRuntimeService.js";

import {
  levelCrossingLogicStore,
} from "../../services/levelCrossingLogicStore.js";

import {
  levelCrossingRuntimeStore,
} from "../../services/levelCrossingRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendLevelCrossingResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: LevelCrossingResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "levelCrossingResponse",
    data: payload,
  });
}

export const handleLevelCrossingMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "levelCrossingCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        const initializeResult = await levelCrossingLogicStore.initialize();
        const document = await levelCrossingRuntimeStore.loadDocument();
        const runtime = await levelCrossingRuntimeStore.snapshot();

        sendLevelCrossingResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          runtime,
          ...(initializeResult.created
            ? {
                message: "Level crossing logic file did not exist, so an empty one was created.",
              }
            : {}),
        });

        return true;
      }

      case "save": {
        const inputDocument = context.msg.data.document ?? {
          version: 1 as const,
          enabled: false,
          crossings: [],
        };

        const document = await levelCrossingRuntimeStore.saveDocument(inputDocument);
        const runtime = await levelCrossingRuntimeStore.snapshot();

        const payload: LevelCrossingResponsePayload = {
          requestId,
          action,
          ok: true,
          document,
          runtime,
        };

        sendLevelCrossingResponse(context, payload);

        context.broadcast({
          type: "levelCrossingResponse",
          data: payload,
        }, context.ws);

        return true;
      }

      case "start": {
        const runtime = await levelCrossingRuntimeStore.start();
        await automationRuntimeService.start();
        const payload: LevelCrossingResponsePayload = {
          requestId,
          action,
          ok: true,
          runtime,
        };

        sendLevelCrossingResponse(context, payload);
        context.broadcast({
          type: "levelCrossingStateChanged",
          data: runtime,
        }, context.ws);

        return true;
      }

      case "stop": {
        const runtime = await levelCrossingRuntimeStore.stop();
        const payload: LevelCrossingResponsePayload = {
          requestId,
          action,
          ok: true,
          runtime,
        };

        sendLevelCrossingResponse(context, payload);
        context.broadcast({
          type: "levelCrossingStateChanged",
          data: runtime,
        }, context.ws);

        return true;
      }

      case "snapshot": {
        const runtime = await levelCrossingRuntimeStore.snapshot();

        sendLevelCrossingResponse(context, {
          requestId,
          action,
          ok: true,
          runtime,
        });

        return true;
      }

      default: {
        sendLevelCrossingResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown level crossing command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendLevelCrossingResponse(context, {
      requestId,
      action,
      ok: false,
      message: error instanceof Error
        ? error.message
        : String(error),
    });

    return true;
  }
};

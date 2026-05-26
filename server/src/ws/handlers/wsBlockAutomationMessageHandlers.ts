import type {
  BlockAutomationResponsePayload,
} from "../../../../common/src/blockAutomation.js";

import {
  blockAutomationStore,
} from "../../services/blockAutomationStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendBlockAutomationResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: BlockAutomationResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "blockAutomationResponse",
    data: payload,
  });
}

export const handleBlockAutomationMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "blockAutomationCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        const initializeResult = await blockAutomationStore.initialize();
        const document = blockAutomationStore.getDocument();

        sendBlockAutomationResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          created: initializeResult.created,
          ...(initializeResult.created
            ? {
                message: "Block automation file did not exist, so an empty one was created.",
              }
            : {}),
        });

        return true;
      }

      case "save": {
        const inputDocument =
          context.msg.data.document ?? {
            version: 1 as const,
            blocks: {},
          };

        const document = await blockAutomationStore.saveDocument(inputDocument);

        const payload: BlockAutomationResponsePayload = {
          requestId,
          action,
          ok: true,
          document,
          created: false,
        };

        sendBlockAutomationResponse(context, payload);

        context.broadcast({
          type: "blockAutomationResponse",
          data: payload,
        }, context.ws);

        return true;
      }

      case "integrityCheck": {
        const integrity = await blockAutomationStore.checkIntegrity();

        sendBlockAutomationResponse(context, {
          requestId,
          action,
          ok: true,
          integrity,
        });

        return true;
      }

      case "deleteOrphanBlocks": {
        const blockIds = context.msg.data.blockIds ?? [];
        const result = await blockAutomationStore.deleteBlocks(blockIds);

        const payload: BlockAutomationResponsePayload = {
          requestId,
          action,
          ok: true,
          document: result.document,
          integrity: result.integrity,
          deletedBlockIds: result.deletedBlockIds,
        };

        sendBlockAutomationResponse(context, payload);

        context.broadcast({
          type: "blockAutomationResponse",
          data: payload,
        }, context.ws);

        return true;
      }

      default: {
        sendBlockAutomationResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown block automation command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendBlockAutomationResponse(context, {
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

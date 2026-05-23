// server/src/ws/handlers/wsFileMessageHandlers.ts

import type {
  FileResponsePayload,
} from "../../../../common/src/types.js";

import {
  readDataFile,
  readDataJsonFile,
  writeDataFile,
  writeDataJsonFile,
} from "../../services/dataFileStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendFileResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: FileResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "fileResponse",
    data: payload,
  });
}

export const handleFileMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "fileCommand") {
    return false;
  }

  const {
    requestId,
    action,
    fileName,
  } = context.msg.data;

  try {
    switch (action) {
      case "readText": {
        sendFileResponse(context, {
          requestId,
          action,
          ok: true,
          fileName,
          content: await readDataFile(fileName),
        });

        return true;
      }

      case "writeText": {
        await writeDataFile(
          fileName,
          context.msg.data.content ?? ""
        );

        sendFileResponse(context, {
          requestId,
          action,
          ok: true,
          fileName,
        });

        return true;
      }

      case "readJson": {
        sendFileResponse(context, {
          requestId,
          action,
          ok: true,
          fileName,
          data: await readDataJsonFile(fileName),
        });

        return true;
      }

      case "writeJson": {
        await writeDataJsonFile(
          fileName,
          context.msg.data.data
        );

        sendFileResponse(context, {
          requestId,
          action,
          ok: true,
          fileName,
        });

        return true;
      }

      default: {
        sendFileResponse(context, {
          requestId,
          action,
          ok: false,
          fileName,
          message: "Unknown file command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendFileResponse(context, {
      requestId,
      action,
      ok: false,
      fileName,
      message: error instanceof Error
        ? error.message
        : String(error),
    });

    return true;
  }
};

// server/src/ws/handlers/wsEditorEditModeMessageHandlers.ts

import {
  editorEditModeStore,
} from "../../services/editorEditModeStore.js";

import {
  taskRuntimeStore,
} from "../../services/taskRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleEditorEditModeMessage: WsMessageHandler = ({
  ws,
  msg,
  sendToClient,
}) => {
  if (msg.type !== "setEditorEditMode") {
    return false;
  }

  const requestedEditMode =
    msg.data.editMode === true;

  if (
    requestedEditMode &&
    taskRuntimeStore.hasActiveTasks()
  ) {
    sendToClient(ws, {
      type: "editorEditModeRejected",
      data: {
        reason:
          "Nem lehet szerkesztő módba lépni, mert futó, szüneteltetett vagy befejezés alatt álló task van.",
        editingClients:
          editorEditModeStore.getEditingClientIds(),
      },
    });

    return true;
  }

  editorEditModeStore.setClientEditMode(
    msg.uuid,
    requestedEditMode
  );

  return true;
};

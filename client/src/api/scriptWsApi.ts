// client/src/api/scriptWsApi.ts

import type {
  ScriptDocumentCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  ScriptDocumentDto,
  SingleScriptFile,
} from "../../../common/src/types";

import {
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

async function sendScriptDocumentCommand(
  action: ScriptDocumentCommandAction,
  document?: Partial<ScriptDocumentDto>
) {
  const requestId = generateId();

  const response = await wsApi.request(
    "scriptDocumentCommand",
    {
      requestId,
      action,
      ...(document !== undefined
        ? { document }
        : {}),
    },
    "scriptDocumentResponse",
    data => data.requestId === requestId
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "Script document WebSocket command failed."
    );
  }

  return response;
}

export async function getScriptWs(): Promise<ScriptDocumentDto> {
  const response = await sendScriptDocumentCommand("load");

  return response.document ?? {
    content: "",
    autoStart: false,
  };
}

export async function saveScriptWs(
  input: string | SingleScriptFile
): Promise<ScriptDocumentDto> {
  const document =
    typeof input === "string"
      ? { content: input }
      : input;

  const response = await sendScriptDocumentCommand(
    "save",
    document
  );

  return response.document ?? {
    content: document.content ?? "",
    autoStart: document.autoStart === true,
  };
}

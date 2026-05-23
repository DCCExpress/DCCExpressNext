// client/src/api/scriptWsApi.ts

import type {
  ScriptDocumentCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  ScriptDocumentDto,
  SingleScriptFile,
} from "../../../common/src/types";

import {
  requestWsCommand,
} from "./wsRequest";

async function sendScriptDocumentCommand(
  action: ScriptDocumentCommandAction,
  document?: Partial<ScriptDocumentDto>
) {
  return requestWsCommand(
    "scriptDocumentCommand",
    {
      action,
      ...(document !== undefined
        ? { document }
        : {}),
    },
    "scriptDocumentResponse",
    "Script document WebSocket command failed."
  );
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

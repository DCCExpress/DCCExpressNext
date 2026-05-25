// client/src/api/signalLogicWsApi.ts

import type {
  SignalLogicDocumentDto,
  SignalLogicRuntimeStateDto,
  SignalLogicValidationIssue,
} from "../../../common/src/signalLogic";

import {
  requestWsCommand,
} from "./wsRequest";

export type SignalLogicLoadResult = {
  document: SignalLogicDocumentDto;
  issues: SignalLogicValidationIssue[];
  created: boolean;
  state: SignalLogicRuntimeStateDto;
  message?: string;
};

type SignalLogicResponse = {
  document?: SignalLogicDocumentDto;
  issues?: SignalLogicValidationIssue[];
  created?: boolean;
  state?: SignalLogicRuntimeStateDto;
  message?: string;
};

function toSignalLogicLoadResult(
  response: SignalLogicResponse
): SignalLogicLoadResult {
  if (!response.document) {
    throw new Error("Missing signal logic document in response.");
  }

  return {
    document: response.document,
    issues: response.issues ?? [],
    created: response.created ?? false,
    state: response.state ?? {
      running: false,
      autostart: response.document.autostart,
    },
    ...(response.message
      ? { message: response.message }
      : {}),
  };
}

async function requestSignalLogic(
  action: "load" | "save" | "start" | "stop" | "state",
  data: {
    document?: SignalLogicDocumentDto;
  } = {},
  errorMessage = "Signal logic command failed."
): Promise<SignalLogicLoadResult> {
  const response = await requestWsCommand(
    "signalLogicCommand",
    {
      action,
      ...data,
    },
    "signalLogicResponse",
    errorMessage
  );

  return toSignalLogicLoadResult(response);
}

export async function loadSignalLogicRulesWs(): Promise<SignalLogicLoadResult> {
  return requestSignalLogic(
    "load",
    {},
    "Could not load signal logic rules."
  );
}

export async function saveSignalLogicRulesWs(
  document: SignalLogicDocumentDto
): Promise<SignalLogicLoadResult> {
  return requestSignalLogic(
    "save",
    { document },
    "Could not save signal logic rules."
  );
}

export async function getSignalLogicRuntimeStateWs(): Promise<SignalLogicLoadResult> {
  return requestSignalLogic(
    "state",
    {},
    "Could not get signal logic runtime state."
  );
}

export async function startSignalLogicWs(): Promise<SignalLogicLoadResult> {
  return requestSignalLogic(
    "start",
    {},
    "Could not start signal logic."
  );
}

export async function stopSignalLogicWs(): Promise<SignalLogicLoadResult> {
  return requestSignalLogic(
    "stop",
    {},
    "Could not stop signal logic."
  );
}

// client/src/api/signalLogicWsApi.ts

import type {
  SignalLogicDocumentDto,
  SignalLogicValidationIssue,
} from "../../../common/src/signalLogic";

import {
  requestWsCommand,
} from "./wsRequest";

export type SignalLogicLoadResult = {
  document: SignalLogicDocumentDto;
  issues: SignalLogicValidationIssue[];
};

export async function loadSignalLogicRulesWs(): Promise<SignalLogicLoadResult> {
  const response = await requestWsCommand(
    "signalLogicCommand",
    { action: "load" },
    "signalLogicResponse",
    "Could not load signal logic rules."
  );

  if (!response.document) {
    throw new Error("Missing signal logic document in response.");
  }

  return {
    document: response.document,
    issues: response.issues ?? [],
  };
}

export async function saveSignalLogicRulesWs(
  document: SignalLogicDocumentDto
): Promise<SignalLogicLoadResult> {
  const response = await requestWsCommand(
    "signalLogicCommand",
    {
      action: "save",
      document,
    },
    "signalLogicResponse",
    "Could not save signal logic rules."
  );

  if (!response.document) {
    throw new Error("Missing signal logic document in response.");
  }

  return {
    document: response.document,
    issues: response.issues ?? [],
  };
}

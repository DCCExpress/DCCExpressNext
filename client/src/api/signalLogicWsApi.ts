// client/src/api/signalLogicWsApi.ts

import type {
  SignalLogicDocumentDto,
  SignalLogicIntegrityReportDto,
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
  integrity?: SignalLogicIntegrityReportDto;
  deletedSignalAddresses?: number[];
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

async function requestSignalLogicIntegrity(
  action: "integrityCheck" | "deleteOrphanSignals",
  data: {
    signalAddresses?: number[];
  } = {},
  errorMessage = "Signal logic integrity command failed."
): Promise<SignalLogicResponse> {
  return requestWsCommand(
    "signalLogicCommand",
    {
      action,
      ...data,
    },
    "signalLogicResponse",
    errorMessage
  );
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
    "Could not enable signal logic automation module."
  );
}

export async function stopSignalLogicWs(): Promise<SignalLogicLoadResult> {
  return requestSignalLogic(
    "stop",
    {},
    "Could not disable signal logic automation module."
  );
}

export async function checkSignalLogicIntegrityWs(): Promise<SignalLogicIntegrityReportDto> {
  const response = await requestSignalLogicIntegrity(
    "integrityCheck",
    {},
    "Could not check signal logic integrity."
  );

  if (!response.integrity) {
    throw new Error("Signal logic integrity response did not contain a report.");
  }

  return response.integrity;
}

export async function deleteSignalLogicOrphansWs(
  signalAddresses: number[]
): Promise<{
  integrity: SignalLogicIntegrityReportDto;
  deletedSignalAddresses: number[];
}> {
  const response = await requestSignalLogicIntegrity(
    "deleteOrphanSignals",
    { signalAddresses },
    "Could not delete orphan signal logic rule groups."
  );

  if (!response.integrity) {
    throw new Error("Signal logic delete response did not contain an integrity report.");
  }

  return {
    integrity: response.integrity,
    deletedSignalAddresses: response.deletedSignalAddresses ?? [],
  };
}

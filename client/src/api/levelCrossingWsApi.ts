import type {
  LevelCrossingLogicDocumentDto,
  LevelCrossingRuntimeStateDto,
} from "../../../common/src/levelCrossingLogic";

import {
  requestWsCommand,
} from "./wsRequest";

export type LevelCrossingCommandResult = {
  document?: LevelCrossingLogicDocumentDto;
  runtime?: LevelCrossingRuntimeStateDto;
  message?: string;
};

type LevelCrossingResponse = {
  document?: LevelCrossingLogicDocumentDto;
  runtime?: LevelCrossingRuntimeStateDto;
  message?: string;
};

function toLevelCrossingCommandResult(
  response: LevelCrossingResponse
): LevelCrossingCommandResult {
  return {
    ...(response.document === undefined ? {} : { document: response.document }),
    ...(response.runtime === undefined ? {} : { runtime: response.runtime }),
    ...(response.message === undefined ? {} : { message: response.message }),
  };
}

async function requestLevelCrossing(
  action: "load" | "save" | "start" | "stop" | "snapshot",
  data: {
    document?: LevelCrossingLogicDocumentDto;
  } = {},
  errorMessage = "Level crossing command failed."
): Promise<LevelCrossingCommandResult> {
  const response = await requestWsCommand(
    "levelCrossingCommand",
    {
      action,
      ...data,
    },
    "levelCrossingResponse",
    errorMessage
  );

  return toLevelCrossingCommandResult(response);
}

export async function loadLevelCrossingLogicWs(): Promise<LevelCrossingLogicDocumentDto> {
  const result = await requestLevelCrossing(
    "load",
    {},
    "Could not load level crossing logic."
  );

  if (!result.document) {
    throw new Error("Missing level crossing logic document in response.");
  }

  return result.document;
}

export async function saveLevelCrossingLogicWs(
  document: LevelCrossingLogicDocumentDto
): Promise<LevelCrossingLogicDocumentDto> {
  const result = await requestLevelCrossing(
    "save",
    { document },
    "Could not save level crossing logic."
  );

  if (!result.document) {
    throw new Error("Missing saved level crossing logic document in response.");
  }

  return result.document;
}

export async function startLevelCrossingRuntimeWs(): Promise<LevelCrossingRuntimeStateDto> {
  const result = await requestLevelCrossing(
    "start",
    {},
    "Could not start level crossing runtime."
  );

  if (!result.runtime) {
    throw new Error("Missing level crossing runtime state in response.");
  }

  return result.runtime;
}

export async function stopLevelCrossingRuntimeWs(): Promise<LevelCrossingRuntimeStateDto> {
  const result = await requestLevelCrossing(
    "stop",
    {},
    "Could not stop level crossing runtime."
  );

  if (!result.runtime) {
    throw new Error("Missing level crossing runtime state in response.");
  }

  return result.runtime;
}

export async function getLevelCrossingRuntimeSnapshotWs(): Promise<LevelCrossingRuntimeStateDto> {
  const result = await requestLevelCrossing(
    "snapshot",
    {},
    "Could not get level crossing runtime snapshot."
  );

  if (!result.runtime) {
    throw new Error("Missing level crossing runtime state in response.");
  }

  return result.runtime;
}

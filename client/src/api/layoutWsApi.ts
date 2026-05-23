// client/src/api/layoutWsApi.ts

import type {
  LayoutCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  SerializedLayoutDto,
} from "../../../common/src/layout/layoutDto";

import type {
  RouteGraphResponseDto,
} from "../../../common/src/railway/routeGraphDto";

import {
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

async function sendLayoutCommand(
  action: LayoutCommandAction,
  layout?: SerializedLayoutDto
) {
  const requestId = generateId();

  const response = await wsApi.request(
    "layoutCommand",
    {
      requestId,
      action,
      ...(layout !== undefined
        ? { layout }
        : {}),
    },
    "layoutResponse",
    data => data.requestId === requestId
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "Layout WebSocket command failed."
    );
  }

  return response;
}

export async function getLayoutWs(): Promise<SerializedLayoutDto> {
  const response = await sendLayoutCommand("load");

  return response.layout ?? {};
}

export async function saveLayoutWs(
  layout: SerializedLayoutDto
): Promise<void> {
  await sendLayoutCommand("save", layout);
}

export async function refreshLayoutRuntimeWs(
  layout: SerializedLayoutDto
): Promise<void> {
  await sendLayoutCommand("refreshRuntime", layout);
}

export async function getRouteGraphWs(): Promise<RouteGraphResponseDto> {
  const response = await sendLayoutCommand("getRouteGraph");

  if (!response.routeGraph) {
    throw new Error("Layout WebSocket response did not contain a route graph.");
  }

  return response.routeGraph;
}

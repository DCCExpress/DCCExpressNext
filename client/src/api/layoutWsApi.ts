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
  requestWsCommand,
} from "./wsRequest";

async function sendLayoutCommand(
  action: LayoutCommandAction,
  layout?: SerializedLayoutDto
) {
  return requestWsCommand(
    "layoutCommand",
    {
      action,
      ...(layout !== undefined
        ? { layout }
        : {}),
    },
    "layoutResponse",
    "Layout WebSocket command failed."
  );
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

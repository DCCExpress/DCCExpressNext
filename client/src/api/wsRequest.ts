// client/src/api/wsRequest.ts

import type {
  ClientWsMessageType,
  ClientWsPayloadMap,
  ServerWsMessageType,
  ServerWsPayloadMap,
} from "../../../common/src/types";

import {
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

type RequestPayload<T extends ClientWsMessageType> =
  Omit<ClientWsPayloadMap[T], "requestId">;

type ResponsePayload<T extends ServerWsMessageType> =
  ServerWsPayloadMap[T] & {
    requestId: string;
    ok: boolean;
    message?: string;
  };

export async function requestWsCommand<
  TClientType extends ClientWsMessageType,
  TServerType extends ServerWsMessageType
>(
  clientType: TClientType,
  payload: RequestPayload<TClientType>,
  serverType: TServerType,
  fallbackError: string
): Promise<ResponsePayload<TServerType>> {
  const requestId = generateId();

  const response = await wsApi.request(
    clientType,
    {
      requestId,
      ...payload,
    } as ClientWsPayloadMap[TClientType],
    serverType,
    data => (
      typeof data === "object" &&
      data !== null &&
      "requestId" in data &&
      data.requestId === requestId
    )
  ) as ResponsePayload<TServerType>;

  if (!response.ok) {
    throw new Error(
      response.message ?? fallbackError
    );
  }

  return response;
}

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

type RequestWsCommandOptions = {
  timeoutMs?: number;
};

function isMatchingRequestId(
  data: unknown,
  requestId: string
): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "requestId" in data &&
    data.requestId === requestId
  );
}

function wrapWsRequestError(
  error: unknown,
  clientType: ClientWsMessageType,
  serverType: ServerWsMessageType
): Error {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  return new Error(
    `WebSocket command failed (${String(clientType)} -> ${String(serverType)}): ${message}`
  );
}

export async function requestWsCommand<
  TClientType extends ClientWsMessageType,
  TServerType extends ServerWsMessageType
>(
  clientType: TClientType,
  payload: RequestPayload<TClientType>,
  serverType: TServerType,
  fallbackError: string,
  options: RequestWsCommandOptions = {}
): Promise<ResponsePayload<TServerType>> {
  const requestId = generateId();

  let response: ResponsePayload<TServerType>;

  try {
    response = await wsApi.request(
      clientType,
      {
        requestId,
        ...payload,
      } as ClientWsPayloadMap[TClientType],
      serverType,
      data => isMatchingRequestId(
        data,
        requestId
      ),
      options.timeoutMs
    ) as ResponsePayload<TServerType>;
  } catch (error) {
    throw wrapWsRequestError(
      error,
      clientType,
      serverType
    );
  }

  if (!response.ok) {
    throw new Error(
      response.message ?? fallbackError
    );
  }

  return response;
}

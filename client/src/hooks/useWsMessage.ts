// src/hooks/useWsMessage.ts

import { useEffect } from "react";
import { wsClient } from "../services/wsClient";

import type {
  ServerWsMessageType,
  ServerWsPayloadMap,
} from "../../../common/src/types";

export function useWsMessage<
  TType extends ServerWsMessageType
>(
  type: TType,
  handler: (data: ServerWsPayloadMap[TType]) => void
): void {
  useEffect(() => {
    const unsubscribe = wsClient.on(
      type,
      data => {
        handler(data);
      }
    );

    return unsubscribe;
  }, [type, handler]);
}

import { useEffect, useState } from "react";

import type {
  ServerRuntimeStatsSnapshot,
} from "../../../common/src/types";

import {
  wsClient,
} from "../services/wsClient";

export function useServerRuntimeStats(): ServerRuntimeStatsSnapshot | null {
  const [stats, setStats] =
    useState<ServerRuntimeStatsSnapshot | null>(null);

  useEffect(() => {
    const unsubscribe = wsClient.on(
      "serverRuntimeStatsChanged",
      data => {
        setStats(data);
      }
    );

    return unsubscribe;
  }, []);

  return stats;
}

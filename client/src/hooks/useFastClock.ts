// client/src/hooks/useFastClock.ts

import {
  useEffect,
  useState,
} from "react";

import {
  fastClockStore,
  type FastClockViewState,
} from "../services/fastClockStore";

export function useFastClock(): FastClockViewState {
  const [state, setState] =
    useState<FastClockViewState>(() =>
      fastClockStore.getViewState()
    );

  useEffect(() => {
    void fastClockStore.ensureLoaded();

    return fastClockStore.subscribe(setState);
  }, []);

  return state;
}

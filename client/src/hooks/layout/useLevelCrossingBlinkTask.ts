// client/src/hooks/layout/useLevelCrossingBlinkTask.ts

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import {
  TrackLevelCrossingElementView,
} from "../../models/editor/elements/TrackLevelCrossingElementView";

type NumberSetter =
  Dispatch<SetStateAction<number>>;

export type UseLevelCrossingBlinkTaskParams = {
  editMode: boolean;
  layoutRef: MutableRefObject<LayoutView>;
  setInvalidateCounter: NumberSetter;
};

const BLINK_PERIOD_MS = 500;

export function useLevelCrossingBlinkTask({
  editMode,
  layoutRef,
  setInvalidateCounter,
}: UseLevelCrossingBlinkTaskParams): void {
  useEffect(() => {
    if (editMode) {
      return;
    }

    const crossings = layoutRef.current
      .getAllElements()
      .filter((element): element is TrackLevelCrossingElementView =>
        element instanceof TrackLevelCrossingElementView
      );

    if (crossings.length === 0) {
      return;
    }

    const setBlinkState = (value: boolean): boolean => {
      let changed = false;

      for (const crossing of crossings) {
        if (crossing.blinkOn !== value) {
          crossing.blinkOn = value;
          changed = true;
        }
      }

      return changed;
    };

    setBlinkState(true);

    const timer = window.setInterval(() => {
      let changed = false;

      for (const crossing of crossings) {
        if (!crossing.blinkingEnabled || !crossing.lightsEnabled) {
          if (crossing.blinkOn !== true) {
            crossing.blinkOn = true;
            changed = true;
          }

          continue;
        }

        crossing.blinkOn = !crossing.blinkOn;
        changed = true;
      }

      if (changed) {
        setInvalidateCounter(previous => previous + 1);
      }
    }, BLINK_PERIOD_MS);

    return () => {
      window.clearInterval(timer);

      if (setBlinkState(true)) {
        setInvalidateCounter(previous => previous + 1);
      }
    };
  }, [
    editMode,
    layoutRef,
    setInvalidateCounter,
  ]);
}

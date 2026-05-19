// client/src/hooks/layout/useLayoutRouteGraphBinding.ts

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  Layout,
} from "../../models/editor/core/Layout";

import {
  routeGraphStore,
} from "../../services/routeGraphStore";

type NumberSetter =
  Dispatch<SetStateAction<number>>;

export type UseLayoutRouteGraphBindingParams = {
  layoutRef: MutableRefObject<Layout>;
  setInvalidateCounter: NumberSetter;
};

export function useLayoutRouteGraphBinding({
  layoutRef,
  setInvalidateCounter,
}: UseLayoutRouteGraphBindingParams): void {
  useEffect(() => {
    const unsubscribe =
      routeGraphStore.subscribe(() => {
        layoutRef.current.applyRouteGraphRuntime(
          routeGraphStore.getTrackRuntime()
        );

        setInvalidateCounter(prev => prev + 1);
      });

    return () => {
      unsubscribe();
    };
  }, [
    layoutRef,
    setInvalidateCounter,
  ]);
}

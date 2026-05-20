// client/src/hooks/layout/useLayoutEditModeRuntime.ts

import {
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  EditorTool,
} from "../../models/editor/types/EditorTypes";

import type {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import {
  routeGraphStore,
} from "../../services/routeGraphStore";

type EditorToolSetter =
  Dispatch<SetStateAction<EditorTool>>;

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

type NumberSetter =
  Dispatch<SetStateAction<number>>;

export type UseLayoutEditModeRuntimeParams = {
  editMode: boolean;
  layoutRef: MutableRefObject<LayoutView>;
  layoutLoadedRef: MutableRefObject<boolean>;
  refreshServerRuntimeLayout: () => Promise<void>;
  setTool: EditorToolSetter;
  setPickerOpened: BooleanSetter;
  setTurnoutSelection: BooleanSetter;
  setInvalidateCounter: NumberSetter;
};

export function useLayoutEditModeRuntime({
  editMode,
  layoutRef,
  layoutLoadedRef,
  refreshServerRuntimeLayout,
  setTool,
  setPickerOpened,
  setTurnoutSelection,
  setInvalidateCounter,
}: UseLayoutEditModeRuntimeParams): void {
  const previousEditModeRef =
    useRef(editMode);

  useEffect(() => {
    const previousEditMode =
      previousEditModeRef.current;

    previousEditModeRef.current =
      editMode;

    if (!editMode) {
      setTool({
        mode: "cursor",
        elementType: "general",
      });

      setPickerOpened(false);
      setTurnoutSelection(false);

      /**
       * Csak valódi editMode true -> false váltáskor frissítünk.
       * Első rendernél / layout betöltés előtt NEM.
       */
      if (
        previousEditMode === true &&
        layoutLoadedRef.current
      ) {
        void refreshServerRuntimeLayout();
      }

      return;
    }

    /**
     * Szerkesztő módba lépve a korábbi gráf/debug állapot
     * már elavulhat.
     */
    routeGraphStore.clear();
    layoutRef.current.resetRoutes();

    setInvalidateCounter(prev => prev + 1);
  }, [
    editMode,
    layoutLoadedRef,
    layoutRef,
    refreshServerRuntimeLayout,
    setInvalidateCounter,
    setPickerOpened,
    setTool,
    setTurnoutSelection,
  ]);
}

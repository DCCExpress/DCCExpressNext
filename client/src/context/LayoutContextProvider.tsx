import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { LayoutView } from "../models/editor/core/LayoutView";
import { getLayout, saveLayout as saveLayoutApi } from "../api/http";

type LayoutContextValue = {
  layout: LayoutView;
  layoutVersion: number;

  setLayout: (layout: LayoutView) => void;
  refreshLayout: () => void;

  loadLayout: () => Promise<void>;
  saveLayout: () => Promise<void>;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [layout, setLayoutState] = useState<LayoutView>(() => new LayoutView());
  const [layoutVersion, setLayoutVersion] = useState(0);

  const setLayout = (newLayout: LayoutView) => {
    setLayoutState(newLayout);
    setLayoutVersion(v => v + 1);
  };

  const refreshLayout = () => {
    setLayoutVersion(v => v + 1);
  };

  const loadLayout = async () => {
    const data = await getLayout();
    const loadedLayout = LayoutView.fromJSON(data);

    setLayout(loadedLayout);
  };

  const saveLayout = async () => {
    await saveLayoutApi(layout);
  };

  return (
    <LayoutContext.Provider
      value={{
        layout,
        layoutVersion,

        setLayout,
        refreshLayout,

        loadLayout,
        saveLayout,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);

  if (!context) {
    throw new Error(
      "useLayoutContext must be used inside LayoutContextProvider"
    );
  }

  return context;
}
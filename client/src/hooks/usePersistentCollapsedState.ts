// client/src/hooks/usePersistentCollapsedState.ts

import {
  useState,
} from "react";

export function usePersistentCollapsedState(
  storageKey: string,
  defaultCollapsed = false
) {
  const [collapsed, setCollapsed] =
    useState<boolean>(() => {
      const stored =
        window.localStorage.getItem(storageKey);

      if (stored === null) {
        return defaultCollapsed;
      }

      return stored === "true";
    });

  const toggleCollapsed = () => {
    setCollapsed(current => {
      const next =
        !current;

      window.localStorage.setItem(
        storageKey,
        String(next)
      );

      return next;
    });
  };

  return {
    collapsed,
    toggleCollapsed,
  };
}

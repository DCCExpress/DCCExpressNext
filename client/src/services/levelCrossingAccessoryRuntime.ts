import { ELEMENT_TYPES } from "../../../common/src/layout/elementTypes";
import type { AccessoryChangedPayload } from "../../../common/src/types";
import { layoutStore } from "./layoutStore";
import { wsClient } from "./wsClient";

let uninstallRuntime: (() => void) | null = null;

function updateLevelCrossingStates(data: AccessoryChangedPayload): boolean {
  let changed = false;

  for (const element of layoutStore.getElements()) {
    const item = element as any;

    if (item.type !== ELEMENT_TYPES.TRACK_LEVEL_CROSSING) {
      continue;
    }

    if (item.basicAccessoryAddress !== data.address) {
      continue;
    }

    const nextClosed = data.active === Boolean(item.basicAccessoryClosedValue);

    if (item.barrierClosed !== nextClosed) {
      item.barrierClosed = nextClosed;
      changed = true;
    }
  }

  return changed;
}

export function installLevelCrossingAccessoryRuntime(): () => void {
  if (uninstallRuntime) {
    return uninstallRuntime;
  }

  uninstallRuntime = wsClient.on(
    "accessoryChanged",
    (data: AccessoryChangedPayload) => {
      const changed = updateLevelCrossingStates(data);

      if (changed) {
        layoutStore.setLayout(layoutStore.getLayout());
      }
    }
  );

  return () => {
    uninstallRuntime?.();
    uninstallRuntime = null;
  };
}

import type { RouteTurnoutElement } from "../models/editor/core/LayoutView";
// src/services/layoutStore.ts

import { BaseElementView } from "../models/editor/core/BaseElementView";
import { LayoutView } from "../models/editor/core/LayoutView";
import { TrackSignalElementView } from "../models/editor/elements/TrackSignalElementView";
import { TrackTurnoutLeftElementView } from "../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../models/editor/elements/TrackTurnoutRightElementView";
import { TrackTurnoutTwoWayElementView } from "../models/editor/elements/TrackTurnoutTwoWayElementView";
import { BlockElementView } from "../models/editor/elements/BlockElementView";

type LayoutListener = (layout: LayoutView | null) => void;

class LayoutStore {
  private layout: LayoutView | null = null;
  private listeners = new Set<LayoutListener>();

  setLayout(layout: LayoutView | null) {
    this.layout = layout;
    this.emit();
  }

  getLayout(): LayoutView | null {
    return this.layout;
  }

  subscribe(listener: LayoutListener) {
    this.listeners.add(listener);

    // azonnal megkapja az aktuális értéket
    listener(this.layout);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.layout);
    }
  }

  getElements(): BaseElementView[] {
    return this.layout?.getAllElements() ?? [];
  }

  findElementById<T extends BaseElementView = BaseElementView>(id: string): T | undefined {
    return this.getElements().find(e => e.id === id) as T | undefined;
  }

  findTurnoutByAddress(address: number) {
    return this.getElements().find(e => {
      return (
        this.isTurnout(e) &&
        (e as any).turnoutAddress === address
      );
    });
  }

  private isTurnout(e: BaseElementView): boolean {
    return (
      e instanceof TrackTurnoutLeftElementView ||
      e instanceof TrackTurnoutRightElementView ||
      e instanceof TrackTurnoutTwoWayElementView

    );
  }

  clearAllBusy(): void {
    const layout = this.layout;

    if (!layout) {
      return;
    }

    let changed = false;

    for (const elem of layout.getTrackElements()) {
      if (elem.isBusy) {
        elem.isBusy = false;
        changed = true;
      }
    }

    if (changed) {
      this.emit();
    }
  }

  clearRuntimeOverlays(): void {
    const layout = this.layout;

    if (!layout) {
      return;
    }

    let changed = false;

    for (const elem of layout.getTrackElements()) {
      if (elem.isBusy) {
        elem.isBusy = false;
        changed = true;
      }

      if (elem.isTransit) {
        elem.isTransit = false;
        changed = true;
      }
    }

    for (const elem of layout.getAllElements()) {
      if (this.isTurnout(elem)) {
        const turnout = elem as RouteTurnoutElement;

        if (turnout.isBusy) {
          turnout.isBusy = false;
          changed = true;
        }

        if (turnout.isTransit) {
          turnout.isTransit = false;
          changed = true;
        }
      }

      if (elem instanceof BlockElementView && elem.runtimeTransitLocoAddress !== 0) {
        elem.runtimeTransitLocoAddress = 0;
        changed = true;
      }
    }

    if (changed) {
      this.emit();
    }
  }

  setTurnoutsBusyByAddresses(
    turnoutAddresses: number[],
    busy: boolean
  ): boolean {
    let changed = false;

    for (const address of turnoutAddresses) {
      const turnout = this.findTurnoutByAddress(
        address
      ) as RouteTurnoutElement | undefined;

      if (!turnout) {
        continue;
      }

      turnout.isBusy = busy;
      changed = true;
    }

    if (changed) {
      this.emit();
    }

    return changed;
  }

  setTransitSectionsByNames(
    sectionNames: string[]
  ): boolean {
    const layout = this.layout;

    if (!layout) {
      return false;
    }

    const transitSectionNumbers =
      new Set<number>();

    for (const sectionName of sectionNames) {
      const match =
        /^S(\d+)$/u.exec(sectionName);

      if (!match) {
        continue;
      }

      transitSectionNumbers.add(
        Number(match[1])
      );
    }

    let changed = false;

    for (const elem of layout.getTrackElements()) {
      const nextTransit =
        transitSectionNumbers.has(elem.section);

      if (elem.isTransit !== nextTransit) {
        elem.isTransit = nextTransit;
        changed = true;
      }
    }

    if (changed) {
      this.emit();
    }

    return changed;
  }

  setTurnoutsTransitByAddresses(
    turnoutAddresses: number[]
  ): boolean {
    const transitTurnoutAddresses =
      new Set(turnoutAddresses);

    let changed = false;

    for (const elem of this.getElements()) {
      if (!this.isTurnout(elem)) {
        continue;
      }

      const turnout =
        elem as RouteTurnoutElement;

      const turnoutAddress =
        (turnout as any).turnoutAddress;

      if (typeof turnoutAddress !== "number") {
        continue;
      }

      const nextTransit =
        transitTurnoutAddresses.has(turnoutAddress);

      if (turnout.isTransit !== nextTransit) {
        turnout.isTransit = nextTransit;
        changed = true;
      }
    }

    if (changed) {
      this.emit();
    }

    return changed;
  }

  setElementsBusyByIds(
    elementIds: string[],
    busy: boolean
  ): boolean {
    const layout = this.layout;

    if (!layout) {
      return false;
    }

    const idSet = new Set(elementIds);
    let changed = false;

    for (const elem of layout.getTrackElements()) {
      if (!idSet.has(elem.id)) {
        continue;
      }

      elem.isBusy = busy;
      changed = true;
    }

    if (changed) {
      this.emit();
    }

    return changed;
  }
}

export const layoutStore = new LayoutStore();
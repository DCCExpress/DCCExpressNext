// src/services/layoutStore.ts

import { Layout } from "../models/editor/core/Layout";
import { BaseElement } from "../models/editor/core/BaseElement";
import { TrackTurnoutLeftElement } from "../models/editor/elements/TrackTurnoutLeftElement";
import { TrackTurnoutRightElement } from "../models/editor/elements/TrackTurnoutRightElement";
import { TrackTurnoutTwoWayElement } from "../models/editor/elements/TrackTurnoutTwoWayElement";
import { TrackSignalElement } from "../models/editor/elements/TrackSignalElement";
import { TrackTurnoutElement } from "../models/editor/elements/TrackTurnoutElement";
import { TrackStates } from "../models/editor/core/TrackElement";
import { BlockRouteSolution } from "../models/editor/core/Graph";

type LayoutListener = (layout: Layout | null) => void;

class LayoutStore {
  private layout: Layout | null = null;
  private listeners = new Set<LayoutListener>();

  setLayout(layout: Layout | null) {
    this.layout = layout;
    this.emit();
  }

  getLayout(): Layout | null {
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

  getElements(): BaseElement[] {
    return this.layout?.getAllElements() ?? [];
  }

  findElementById<T extends BaseElement = BaseElement>(id: string): T | undefined {
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

  findSignalByAddress(address: number) {
    const elems = this.getElements();
    return elems.find(e => {
      return (e instanceof TrackSignalElement && (e as any).address === address);
    });
  }

  getTurnoutStateByAddress(address: number): boolean | undefined {
    const turnout = this.findTurnoutByAddress(address) as any;

    if (!turnout) return undefined;

    // Nálad itt lehet más mezőnév, ezt igazítsuk a konkrét váltó osztályhoz
    return (turnout as TrackTurnoutElement).isClosed;
  }

  setTurnoutStateByAddress(address: number, closed: boolean): boolean {
    const turnout = this.findTurnoutByAddress(address) as any;

    if (!turnout) return false;

    turnout.closed = closed;
    this.emit();

    return true;
  }

  setSignalGreenByAddress(address: number): boolean {
    const signal = this.findSignalByAddress(address) as TrackSignalElement;
    if (signal) {
      signal.sendGreenIfNotGreen();

    }
    //this.emit();

    return true;
  }

  setSignalYellowByAddress(address: number): boolean {
    const signal = this.findSignalByAddress(address) as TrackSignalElement;
    if (signal) {
      signal.sendYellowIfNotYellow();
    }
    //this.emit();

    return true;
  }

  setSignalRedByAddress(address: number): boolean {
    const signal = this.findSignalByAddress(address) as TrackSignalElement;
    if (signal) {
      signal.sendRedIfNotRed();
    }
    //this.emit();

    return true;
  }

  setSignalWhiteByAddress(address: number): boolean {
    const signal = this.findSignalByAddress(address) as TrackSignalElement;
    if (signal) {
      signal.sendWhiteIfNotWhite();
    }
    //this.emit();

    return true;
  }


  private isTurnout(e: BaseElement): boolean {
    return (
      e instanceof TrackTurnoutLeftElement ||
      e instanceof TrackTurnoutRightElement ||
      e instanceof TrackTurnoutTwoWayElement

    );
  }

  setRouteSegmentsBusy(
    solution: BlockRouteSolution,
    busy: boolean
  ): boolean {
    const layout = this.layout;

    if (!layout) {
      return false;
    }

    const sectionNumbers = new Set<number>();

    for (const node of solution.nodes) {
      const match = /^S(\d+)$/.exec(node.name);

      if (!match) {
        continue;
      }

      sectionNumbers.add(Number(match[1]));
    }

    let changed = false;

    for (const elem of layout.getTrackElements()) {
      if (!sectionNumbers.has(elem.section)) {
        continue;
      }



      // elem.state = busy
      //   ? TrackStates.occupied
      //   : TrackStates.free;

      elem.isBusy = busy;
      changed = true;
    }

    if (changed) {
      this.emit();
    }

    return changed;
  }
  setRouteTurnoutsBusy(
    solution: BlockRouteSolution,
    busy: boolean
  ): boolean {
    let changed = false;

    for (const turnoutState of solution.turnoutStates) {
      const turnout = this.findTurnoutByAddress(
        turnoutState.address
      ) as TrackTurnoutElement | undefined;

      if (!turnout) {
        continue;
      }

      // turnout.state = busy
      //   ? TrackStates.occupied
      //   : TrackStates.free;

      turnout.isBusy = busy;
      changed = true;
    }

    if (changed) {
      this.emit();
    }

    return changed;
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

  setSectionsBusyByNames(
    sectionNames: string[],
    busy: boolean
  ): boolean {
    const layout = this.layout;

    if (!layout) {
      return false;
    }

    const sectionNumbers = new Set<number>();

    for (const name of sectionNames) {
      const match = /^S(\d+)$/.exec(name);

      if (!match) {
        continue;
      }

      sectionNumbers.add(Number(match[1]));
    }

    let changed = false;

    for (const elem of layout.getTrackElements()) {
      if (!sectionNumbers.has(elem.section)) {
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

  setTurnoutsBusyByAddresses(
    turnoutAddresses: number[],
    busy: boolean
  ): boolean {
    let changed = false;

    for (const address of turnoutAddresses) {
      const turnout = this.findTurnoutByAddress(
        address
      ) as TrackTurnoutElement | undefined;

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
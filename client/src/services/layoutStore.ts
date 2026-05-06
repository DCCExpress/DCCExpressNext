// src/services/layoutStore.ts

import { Layout } from "../models/editor/core/Layout";
import { BaseElement } from "../models/editor/core/BaseElement";
import { TrackTurnoutLeftElement } from "../models/editor/elements/TrackTurnoutLeftElement";
import { TrackTurnoutRightElement } from "../models/editor/elements/TrackTurnoutRightElement";
import { TrackTurnoutTwoWayElement } from "../models/editor/elements/TrackTurnoutTwoWayElement";

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

  getTurnoutStateByAddress(address: number): boolean | undefined {
    const turnout = this.findTurnoutByAddress(address) as any;

    if (!turnout) return undefined;

    // Nálad itt lehet más mezőnév, ezt igazítsuk a konkrét váltó osztályhoz
    return turnout.closed;
  }

  setTurnoutStateByAddress(address: number, closed: boolean): boolean {
    const turnout = this.findTurnoutByAddress(address) as any;

    if (!turnout) return false;

    turnout.closed = closed;
    this.emit();

    return true;
  }

  private isTurnout(e: BaseElement): boolean {
    return (
      e instanceof TrackTurnoutLeftElement ||
      e instanceof TrackTurnoutRightElement ||
      e instanceof TrackTurnoutTwoWayElement 
      
    );
  }
}

export const layoutStore = new LayoutStore();
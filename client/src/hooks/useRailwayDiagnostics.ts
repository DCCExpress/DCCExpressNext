import { useEffect, useMemo, useState } from "react";

import type {
  AccessoryChangedPayload,
  SensorChangedPayload,
  TurnoutChangedPayload,
} from "../../../common/src/types";

import { ELEMENT_TYPES } from "../../../common/src/layout/elementTypes";
import { layoutStore } from "../services/layoutStore";
import { wsClient } from "../services/wsClient";

export type DiagnosticSensorItem = {
  address: number;
  on: boolean;
};

export type DiagnosticTurnoutItem = {
  address: number;
  closed: boolean;
};

export type DiagnosticAccessorySource = {
  elementId: string;
  elementType: string;
  elementName: string;
};

export type DiagnosticAccessoryItem = {
  address: number;
  active: boolean;
  sources: DiagnosticAccessorySource[];
  hasConflict: boolean;
};

type ConfiguredRuntimeAddresses = {
  sensors: number[];
  turnouts: number[];
  accessories: Record<number, DiagnosticAccessorySource[]>;
};

function sortByAddress<T extends { address: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.address - b.address);
}

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values.filter(value => Number.isFinite(value))))
    .sort((a, b) => a - b);
}

function getElementName(item: any): string {
  if (typeof item.name === "string" && item.name.trim().length > 0) {
    return item.name.trim();
  }

  if (typeof item.id === "string" && item.id.trim().length > 0) {
    return item.id.trim();
  }

  return "-";
}

function getElementTypeLabel(type: unknown): string {
  if (typeof type !== "string") {
    return "Unknown";
  }

  switch (type) {
    case ELEMENT_TYPES.TRACK_SIGNAL2:
    case ELEMENT_TYPES.TRACK_SIGNAL3:
    case ELEMENT_TYPES.TRACK_SIGNAL4:
      return "Signal";

    case ELEMENT_TYPES.TRACK_TURNOUT_LEFT:
      return "Turnout left";

    case ELEMENT_TYPES.TRACK_TURNOUT_RIGHT:
      return "Turnout right";

    case ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY:
      return "Turnout two-way";

    case ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE:
      return "Turnout double";

    case ELEMENT_TYPES.TRACK_TURNOUT_THREE_WAY:
      return "Turnout three-way";

    case ELEMENT_TYPES.BUTTON:
      return "Button";

    case ELEMENT_TYPES.BUTTON_SCRIPT:
      return "Script button";

    case ELEMENT_TYPES.BUTTON_AUDIO:
      return "Audio button";

    case ELEMENT_TYPES.BUTTON_ROUTE:
      return "Route button";

    case ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED:
      return "Extended route button";

    default:
      return type;
  }
}

function createSource(item: any): DiagnosticAccessorySource {
  return {
    elementId: typeof item.id === "string" ? item.id : "-",
    elementType: getElementTypeLabel(item.type),
    elementName: getElementName(item),
  };
}

function addAccessorySource(
  target: Record<number, DiagnosticAccessorySource[]>,
  address: number,
  source: DiagnosticAccessorySource
): void {
  if (!Number.isFinite(address)) {
    return;
  }

  const current = target[address] ?? [];

  target[address] = [
    ...current,
    source,
  ];
}

function addAddressRange(
  target: Record<number, DiagnosticAccessorySource[]>,
  startAddress: number,
  length: number,
  source: DiagnosticAccessorySource
): void {
  const safeLength = Math.max(0, Math.floor(length));

  for (let offset = 0; offset < safeLength; offset++) {
    addAccessorySource(target, startAddress + offset, source);
  }
}

function isSignalElementType(type: unknown): boolean {
  return (
    type === ELEMENT_TYPES.TRACK_SIGNAL2 ||
    type === ELEMENT_TYPES.TRACK_SIGNAL3 ||
    type === ELEMENT_TYPES.TRACK_SIGNAL4
  );
}

function isTurnoutElementType(type: unknown): boolean {
  return (
    type === ELEMENT_TYPES.TRACK_TURNOUT_LEFT ||
    type === ELEMENT_TYPES.TRACK_TURNOUT_RIGHT ||
    type === ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY ||
    type === ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE ||
    type === ELEMENT_TYPES.TRACK_TURNOUT_THREE_WAY
  );
}

function isButtonAccessoryElementType(type: unknown): boolean {
  return (
    type === ELEMENT_TYPES.BUTTON ||
    type === ELEMENT_TYPES.BUTTON_SCRIPT ||
    type === ELEMENT_TYPES.BUTTON_AUDIO ||
    type === ELEMENT_TYPES.BUTTON_ROUTE ||
    type === ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED
  );
}

function readConfiguredAddresses(): ConfiguredRuntimeAddresses {
  const elements = layoutStore.getElements();

  const sensors: number[] = [];
  const turnouts: number[] = [];
  const accessories: Record<number, DiagnosticAccessorySource[]> = {};

  for (const element of elements) {
    const item = element as any;

    if (
      item.type === ELEMENT_TYPES.TRACK_SENSOR &&
      typeof item.address === "number"
    ) {
      sensors.push(item.address);
    }

    if (
      isTurnoutElementType(item.type) &&
      typeof item.turnoutAddress === "number"
    ) {
      turnouts.push(item.turnoutAddress);
      addAccessorySource(
        accessories,
        item.turnoutAddress,
        createSource(item)
      );
    }

    if (
      isButtonAccessoryElementType(item.type) &&
      typeof item.address === "number"
    ) {
      addAccessorySource(
        accessories,
        item.address,
        createSource(item)
      );
    }

    if (
      isSignalElementType(item.type) &&
      typeof item.address === "number"
    ) {
      addAddressRange(
        accessories,
        item.address,
        typeof item.addressLength === "number"
          ? item.addressLength
          : 1,
        createSource(item)
      );
    }
  }

  return {
    sensors: uniqueSorted(sensors),
    turnouts: uniqueSorted(turnouts),
    accessories,
  };
}

function mergeConfiguredSensors(
  configured: number[],
  runtime: Record<number, DiagnosticSensorItem>
): DiagnosticSensorItem[] {
  const result = new Map<number, DiagnosticSensorItem>();

  for (const address of configured) {
    result.set(address, {
      address,
      on: false,
    });
  }

  for (const item of Object.values(runtime)) {
    result.set(item.address, item);
  }

  return sortByAddress(Array.from(result.values()));
}

function mergeConfiguredTurnouts(
  configured: number[],
  runtime: Record<number, DiagnosticTurnoutItem>
): DiagnosticTurnoutItem[] {
  const result = new Map<number, DiagnosticTurnoutItem>();

  for (const address of configured) {
    result.set(address, {
      address,
      closed: false,
    });
  }

  for (const item of Object.values(runtime)) {
    result.set(item.address, item);
  }

  return sortByAddress(Array.from(result.values()));
}

function mergeConfiguredAccessories(
  configured: Record<number, DiagnosticAccessorySource[]>,
  runtime: Record<number, DiagnosticAccessoryItem>
): DiagnosticAccessoryItem[] {
  const result = new Map<number, DiagnosticAccessoryItem>();

  for (const [addressText, sources] of Object.entries(configured)) {
    const address = Number(addressText);

    if (!Number.isFinite(address)) {
      continue;
    }

    result.set(address, {
      address,
      active: false,
      sources,
      hasConflict: sources.length > 1,
    });
  }

  for (const item of Object.values(runtime)) {
    const sources = result.get(item.address)?.sources ?? item.sources ?? [];

    result.set(item.address, {
      ...item,
      sources,
      hasConflict: sources.length > 1,
    });
  }

  return sortByAddress(Array.from(result.values()));
}

export function useRailwayDiagnostics() {
  const [configuredAddresses, setConfiguredAddresses] =
    useState<ConfiguredRuntimeAddresses>(() => readConfiguredAddresses());

  const [sensors, setSensors] = useState<Record<number, DiagnosticSensorItem>>({});
  const [turnouts, setTurnouts] = useState<Record<number, DiagnosticTurnoutItem>>({});
  const [accessories, setAccessories] = useState<Record<number, DiagnosticAccessoryItem>>({});

  useEffect(() => {
    return layoutStore.subscribe(() => {
      setConfiguredAddresses(readConfiguredAddresses());
    });
  }, []);

  useEffect(() => {
    const unsubscribeSensor = wsClient.on("sensorChanged", (data: SensorChangedPayload) => {
      setSensors(current => ({
        ...current,
        [data.address]: {
          address: data.address,
          on: data.on,
        },
      }));
    });

    const unsubscribeTurnout = wsClient.on("turnoutChanged", (data: TurnoutChangedPayload) => {
      setTurnouts(current => ({
        ...current,
        [data.address]: {
          address: data.address,
          closed: data.closed,
        },
      }));
    });

    const unsubscribeAccessory = wsClient.on("accessoryChanged", (data: AccessoryChangedPayload) => {
      setAccessories(current => ({
        ...current,
        [data.address]: {
          address: data.address,
          active: data.active,
          sources: [],
          hasConflict: false,
        },
      }));
    });

    return () => {
      unsubscribeSensor();
      unsubscribeTurnout();
      unsubscribeAccessory();
    };
  }, []);

  return {
    sensors: useMemo(
      () => mergeConfiguredSensors(configuredAddresses.sensors, sensors),
      [configuredAddresses.sensors, sensors]
    ),
    turnouts: useMemo(
      () => mergeConfiguredTurnouts(configuredAddresses.turnouts, turnouts),
      [configuredAddresses.turnouts, turnouts]
    ),
    accessories: useMemo(
      () => mergeConfiguredAccessories(configuredAddresses.accessories, accessories),
      [configuredAddresses.accessories, accessories]
    ),
  };
}

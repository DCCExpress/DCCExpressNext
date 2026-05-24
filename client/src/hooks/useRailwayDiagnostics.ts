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

export type DiagnosticAccessoryItem = {
  address: number;
  active: boolean;
};

type ConfiguredRuntimeAddresses = {
  sensors: number[];
  turnouts: number[];
  accessories: number[];
};

function sortByAddress<T extends { address: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.address - b.address);
}

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values.filter(value => Number.isFinite(value))))
    .sort((a, b) => a - b);
}

function readConfiguredAddresses(): ConfiguredRuntimeAddresses {
  const elements = layoutStore.getElements();

  const sensors: number[] = [];
  const turnouts: number[] = [];
  const accessories: number[] = [];

  for (const element of elements) {
    const item = element as any;

    if (
      item.type === ELEMENT_TYPES.TRACK_SENSOR &&
      typeof item.address === "number"
    ) {
      sensors.push(item.address);
    }

    if (
      (
        item.type === ELEMENT_TYPES.TRACK_TURNOUT_LEFT ||
        item.type === ELEMENT_TYPES.TRACK_TURNOUT_RIGHT ||
        item.type === ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY ||
        item.type === ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE
      ) &&
      typeof item.turnoutAddress === "number"
    ) {
      turnouts.push(item.turnoutAddress);
    }

    if (
      typeof item.address === "number" &&
      (
        item.type === ELEMENT_TYPES.BUTTON ||
        item.type === ELEMENT_TYPES.BUTTON_SCRIPT ||
        item.type === ELEMENT_TYPES.BUTTON_AUDIO ||
        item.type === ELEMENT_TYPES.BUTTON_ROUTE ||
        item.type === ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED
      )
    ) {
      accessories.push(item.address);
    }
  }

  return {
    sensors: uniqueSorted(sensors),
    turnouts: uniqueSorted(turnouts),
    accessories: uniqueSorted(accessories),
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
  configured: number[],
  runtime: Record<number, DiagnosticAccessoryItem>
): DiagnosticAccessoryItem[] {
  const result = new Map<number, DiagnosticAccessoryItem>();

  for (const address of configured) {
    result.set(address, {
      address,
      active: false,
    });
  }

  for (const item of Object.values(runtime)) {
    result.set(item.address, item);
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

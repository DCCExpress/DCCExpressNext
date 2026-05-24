import { useEffect, useMemo, useState } from "react";

import type {
  AccessoryChangedPayload,
  SensorChangedPayload,
  TurnoutChangedPayload,
} from "../../../common/src/types";

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

function sortByAddress<T extends { address: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.address - b.address);
}

export function useRailwayDiagnostics() {
  const [sensors, setSensors] = useState<Record<number, DiagnosticSensorItem>>({});
  const [turnouts, setTurnouts] = useState<Record<number, DiagnosticTurnoutItem>>({});
  const [accessories, setAccessories] = useState<Record<number, DiagnosticAccessoryItem>>({});

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
    sensors: useMemo(() => sortByAddress(Object.values(sensors)), [sensors]),
    turnouts: useMemo(() => sortByAddress(Object.values(turnouts)), [turnouts]),
    accessories: useMemo(() => sortByAddress(Object.values(accessories)), [accessories]),
  };
}

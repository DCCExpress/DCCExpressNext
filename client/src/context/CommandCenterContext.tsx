import { createContext, useContext, useEffect, useState } from "react";
import { wsClient } from "../services/wsClient";

import type {
  CommandCenterLockChangedPayload,
  WsPowerInfoPayload as PowerInfo,
  Z21SystemStatePayload as Z21SystemState,
} from "../../../common/src/types";

type CommandCenterLockState =
  CommandCenterLockChangedPayload;

type CommandCenterInfoState = {
  alive: boolean;
  type?: string | null;
  name?: string | null;
  ip?: string | null;
  port?: number | null;
  serialPort?: string | null;
  connectionString?: string | null;
};

type CommandCenterContextValue = {
  locked: boolean;
  lockOwner: string | null;
  reason: string | null;

  alive: boolean;
  type: string | null;
  name: string | null;
  ip: string | null;
  port: number | null;
  serialPort: string | null;
  connectionString: string | null;

  powerInfo: PowerInfo | null;
  z21SystemState: Z21SystemState | null;
};

const emptyLockState: CommandCenterLockState = {
  locked: false,
  lockOwner: null,
  reason: null,
};

const emptyCommandCenterInfo: CommandCenterInfoState = {
  alive: false,
  type: null,
  name: null,
  ip: null,
  port: null,
  serialPort: null,
  connectionString: null,
};

const CommandCenterContext = createContext<CommandCenterContextValue>({
  locked: false,
  lockOwner: null,
  reason: null,

  alive: false,
  type: null,
  name: null,
  ip: null,
  port: null,
  serialPort: null,
  connectionString: null,

  powerInfo: null,
  z21SystemState: null,
});

export function CommandCenterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lockState, setLockState] = useState<CommandCenterLockState>(emptyLockState);

  const [commandCenterInfo, setCommandCenterInfo] =
    useState<CommandCenterInfoState>(emptyCommandCenterInfo);

  const [powerInfo, setPowerInfo] = useState<PowerInfo | null>(null);
  const [z21SystemState, setZ21SystemState] =
    useState<Z21SystemState | null>(null);

  useEffect(() => {
    const clearRuntimeState = (): void => {
      setCommandCenterInfo(prev => ({
        ...prev,
        alive: false,
      }));

      setPowerInfo(null);
      setZ21SystemState(null);
      setLockState(emptyLockState);
    };

    const unsubscribeWsStatus = wsClient.subscribeStatus((status) => {
      if (
        status === "disconnected" ||
        status === "reconnecting" ||
        status === "connecting" ||
        status === "error"
      ) {
        clearRuntimeState();
      }
    });

    const unsubscribeLockChanged = wsClient.on(
      "commandCenterLockChanged",
      (data) => {
        setLockState({
          locked: data.locked,
          lockOwner: data.lockOwner ?? null,
          reason: data.reason ?? null,
        });
      }
    );

    const unsubscribeCommandCenterInfo = wsClient.on(
      "commandCenterInfo",
      (data) => {
        if (!data.alive) {
          clearRuntimeState();
          return;
        }

        setCommandCenterInfo((prev) => ({
          alive: true,
          type: data.type ?? prev.type ?? null,
          name: data.name ?? prev.name ?? null,
          ip: data.ip ?? prev.ip ?? null,
          port: data.port ?? prev.port ?? null,
          serialPort: data.serialPort ?? prev.serialPort ?? null,
          connectionString:
            data.connectionString ?? prev.connectionString ?? null,
        }));
      }
    );

    const unsubscribePowerInfo = wsClient.on(
      "powerInfo",
      (data) => {
        setPowerInfo(data);
      }
    );

    const unsubscribeZ21SystemState = wsClient.on(
      "z21SystemState",
      (data) => {
        setZ21SystemState(data);
        setPowerInfo(data.powerInfo);

        setCommandCenterInfo((prev) => ({
          ...prev,
          alive: true,
          type: prev.type ?? "z21",
        }));
      }
    );

    return () => {
      unsubscribeWsStatus();
      unsubscribeLockChanged();
      unsubscribeCommandCenterInfo();
      unsubscribePowerInfo();
      unsubscribeZ21SystemState();
    };
  }, []);

  return (
    <CommandCenterContext.Provider
      value={{
        locked: lockState.locked,
        lockOwner: lockState.lockOwner ?? null,
        reason: lockState.reason ?? null,

        alive: commandCenterInfo.alive,
        type: commandCenterInfo.type ?? null,
        name: commandCenterInfo.name ?? null,
        ip: commandCenterInfo.ip ?? null,
        port: commandCenterInfo.port ?? null,
        serialPort: commandCenterInfo.serialPort ?? null,
        connectionString: commandCenterInfo.connectionString ?? null,

        powerInfo,
        z21SystemState,
      }}
    >
      {children}
    </CommandCenterContext.Provider>
  );
}

export function useCommandCenter() {
  return useContext(CommandCenterContext);
}

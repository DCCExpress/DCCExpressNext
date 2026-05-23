import { Card, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  Direction,
  Loco,
  LocoReservation,
} from "../../../common/src/types";

import LocoPicker from "../components/loco/LocoPicker";
import { useCommandCenter } from "../context/CommandCenterContext";
import { showErrorMessage } from "../helpers";
import { wsApi } from "../services/wsApi";
import { wsClient } from "../services/wsClient";
import LocoControlCard from "./loco-panel/LocoControlCard";
import LocoFunctionGrid from "./loco-panel/LocoFunctionGrid";

type LocoPanelProps = {
  locos?: Loco[];
  selectedLocoStorageKey?: string;
};

const SELECTED_LOCO_STORAGE_KEY =
  "dcc-express.loco-panel.selected-loco-id";

export default function LocoPanel({
  locos = [],
  selectedLocoStorageKey = SELECTED_LOCO_STORAGE_KEY,
}: LocoPanelProps) {
  const { t } = useTranslation();

  const [selectedLocoId, setSelectedLocoId] =
    useState<string>(() => {
      return (
        window.localStorage.getItem(
          selectedLocoStorageKey
        ) ?? ""
      );
    });

  const currentAddressRef =
    useRef<number | null>(null);

  const [pickerOpened, setPickerOpened] =
    useState(false);

  const [speed, setSpeed] =
    useState(0);

  const [direction, setDirection] =
    useState<Direction>("forward");

  const [activeFunctions, setActiveFunctions] =
    useState<Record<number, boolean>>({});

  const [reservation, setReservation] =
    useState<LocoReservation | null>(null);

  const { powerInfo, alive } =
    useCommandCenter();

  const controlsDisabled = !alive;

  const clearRuntimeState = useCallback(() => {
    setSpeed(0);
    setDirection("forward");
    setActiveFunctions({});
    setReservation(null);
  }, []);

  const requestCurrentLocoState = useCallback(() => {
    const address = currentAddressRef.current;

    if (address !== null) {
      wsApi.getLoco(address);
    }
  }, []);

  const selectLocoId = useCallback(
    (id: string) => {
      setSelectedLocoId(id);

      if (id) {
        window.localStorage.setItem(
          selectedLocoStorageKey,
          id
        );
      } else {
        window.localStorage.removeItem(
          selectedLocoStorageKey
        );
      }
    },
    [selectedLocoStorageKey]
  );

  useEffect(() => {
    if (locos.length === 0) {
      if (selectedLocoId) {
        selectLocoId("");
      }

      return;
    }

    if (
      selectedLocoId &&
      locos.some(loco => loco.id === selectedLocoId)
    ) {
      return;
    }

    selectLocoId(locos[0]?.id ?? "");
  }, [locos, selectedLocoId, selectLocoId]);

  const currentLoco = useMemo(() => {
    if (selectedLocoId) {
      const found =
        locos.find(loco => loco.id === selectedLocoId);

      if (found) {
        return found;
      }
    }

    return locos.length > 0
      ? locos[0]
      : null;
  }, [locos, selectedLocoId]);

  useEffect(() => {
    currentAddressRef.current =
      currentLoco?.address ?? null;

    clearRuntimeState();

    if (currentLoco) {
      wsApi.getLoco(currentLoco.address);
    }
  }, [currentLoco, clearRuntimeState]);

  useEffect(() => {
    const unsubscribe =
      wsClient.subscribeStatus(status => {
        if (status === "connected") {
          requestCurrentLocoState();
          return;
        }

        if (
          status === "disconnected" ||
          status === "reconnecting" ||
          status === "error"
        ) {
          clearRuntimeState();
        }
      });

    return unsubscribe;
  }, [
    clearRuntimeState,
    requestCurrentLocoState,
  ]);

  useEffect(() => {
    const unsubscribe =
      wsClient.on("locoState", data => {
        const loco = data.loco;

        if (!loco) {
          showErrorMessage(
            t("loco.stateTitle"),
            t("loco.errors.stateConvertFailed")
          );
          return;
        }

        if (
          loco.address !==
          currentAddressRef.current
        ) {
          return;
        }

        setSpeed(loco.speed);
        setDirection(loco.direction);
        setActiveFunctions(
          loco.functions ?? {}
        );

        setReservation(
          loco.reservation ?? null
        );
      });

    return unsubscribe;
  }, [t]);

  useEffect(() => {
    const unsubscribe =
      wsClient.on("locoReservationChanged", data => {
        if (
          data.locoAddress !==
          currentAddressRef.current
        ) {
          return;
        }

        wsApi.getLoco(data.locoAddress);
      });

    return unsubscribe;
  }, []);

  const handleSelectLoco = (
    loco: Loco
  ) => {
    selectLocoId(loco.id);
    setPickerOpened(false);
    clearRuntimeState();
  };

  const setLocoSpeed = (
    nextSpeed: number
  ) => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    setSpeed(nextSpeed);

    wsApi.setLoco(
      currentLoco.address,
      nextSpeed,
      direction
    );
  };

  const setLocoSpeedByPercent = (
    percent: number
  ) => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    const maxSpeed =
      currentLoco.maxSpeed || 100;

    const nextSpeed =
      Math.max(
        0,
        Math.min(
          Math.round(
            (maxSpeed * percent) / 100
          ),
          maxSpeed
        )
      );

    setLocoSpeed(nextSpeed);
  };

  const handleForward = () => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    setDirection("forward");

    wsApi.setLoco(
      currentLoco.address,
      speed,
      "forward"
    );
  };

  const handleReverse = () => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    setDirection("reverse");

    wsApi.setLoco(
      currentLoco.address,
      speed,
      "reverse"
    );
  };

  const handleStop = () => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    setSpeed(0);

    wsApi.setLoco(
      currentLoco.address,
      0,
      direction
    );
  };

  const handleEmergencyToggle = () => {
    if (!powerInfo || !alive) {
      return;
    }

    if (powerInfo.emergencyStop) {
      wsApi.powerOn();
      return;
    }

    wsApi.emergencyStop();
  };

  return (
    <Card
      withBorder
      radius="sm"
      p="xs"
      h="100%"
      opacity={alive ? 1 : 0.75}
    >
      <div
        style={{
          position: "relative",
          height: "100%",
        }}
      >
        <LocoPicker
          opened={pickerOpened}
          locos={locos}
          selectedLocoId={currentLoco?.id}
          onClose={() => setPickerOpened(false)}
          onSelect={handleSelectLoco}
        />

        <Stack gap="xs" h="100%">
          {!currentLoco ? (
            <Text size="sm" c="dimmed">
              {t("locopanel.nolocos")}
            </Text>
          ) : (
            <>
              <LocoControlCard
                loco={currentLoco}
                speed={speed}
                direction={direction}
                alive={alive}
                emergencyStop={
                  powerInfo?.emergencyStop ?? false
                }
                reservation={reservation}
                controlsDisabled={controlsDisabled}
                onOpenPicker={() =>
                  setPickerOpened(true)
                }
                onSpeedChange={setLocoSpeed}
                onSpeedPercentChange={
                  setLocoSpeedByPercent
                }
                onForward={handleForward}
                onReverse={handleReverse}
                onStop={handleStop}
                onEmergencyToggle={
                  handleEmergencyToggle
                }
              />

              <LocoFunctionGrid
                loco={currentLoco}
                activeFunctions={activeFunctions}
                disabled={controlsDisabled}
                onActiveFunctionsChange={
                  setActiveFunctions
                }
              />
            </>
          )}
        </Stack>
      </div>
    </Card>
  );
}

import { Card, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  Direction,
  Loco,
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
};

const SELECTED_LOCO_STORAGE_KEY =
  "dcc-express.loco-panel.selected-loco-id";

export default function LocoPanel({
  locos = [],
}: LocoPanelProps) {
  const { t } = useTranslation();

  const [selectedLocoId, setSelectedLocoId] =
    useState<string>(() => {
      return (
        window.localStorage.getItem(
          SELECTED_LOCO_STORAGE_KEY
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

  const { powerInfo, alive } =
    useCommandCenter();

  const selectLocoId = useCallback(
    (id: string) => {
      setSelectedLocoId(id);

      if (id) {
        window.localStorage.setItem(
          SELECTED_LOCO_STORAGE_KEY,
          id
        );
      } else {
        window.localStorage.removeItem(
          SELECTED_LOCO_STORAGE_KEY
        );
      }
    },
    []
  );

  useEffect(() => {
    if (locos.length === 0) {
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

    if (currentLoco) {
      wsApi.getLoco(currentLoco.address);
    }
  }, [currentLoco]);

  useEffect(() => {
    const unsubscribe =
      wsClient.on("locoState", data => {
        const loco = data.loco;

        if (!loco) {
          showErrorMessage(
            "LocoState",
            "Nem sikerült a locoState konvertálása!"
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
      });

    return unsubscribe;
  }, []);

  const handleSelectLoco = (
    loco: Loco
  ) => {
    selectLocoId(loco.id);
    setPickerOpened(false);
    setSpeed(0);
    setDirection("forward");
    setActiveFunctions({});
  };

  const setLocoSpeed = (
    nextSpeed: number
  ) => {
    if (!currentLoco) {
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
    if (!currentLoco) {
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
    if (!currentLoco) {
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
    if (!currentLoco) {
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
    if (!currentLoco) {
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
    if (!powerInfo) {
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

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Progress,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBolt,
  IconBoltOff,
  IconRefresh,
  IconTrain,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CommandCenterInfoPayload,
  Direction,
  Loco,
  LocoReservation,
  WsPowerInfoPayload,
} from "../../common/src/types";

import { getDefaultWsUrl } from "./services/defaultWsUrl";
import { wsApi } from "./services/wsApi";
import { wsClient, type WsConnectionStatus } from "./services/wsClient";

const SELECTED_LOCO_STORAGE_KEY = "dcc-express.mobile.selected-loco-id";

type LoadState = "idle" | "loading" | "ready" | "error";

function statusColor(status: WsConnectionStatus): string {
  switch (status) {
    case "connected":
      return "green";
    case "connecting":
    case "reconnecting":
      return "yellow";
    case "error":
      return "red";
    case "disconnected":
    default:
      return "gray";
  }
}

function formatStatus(status: WsConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Error";
    case "disconnected":
    default:
      return "Disconnected";
  }
}

function getFunctionLabel(fnNumber: number, name?: string): string {
  const cleanName = name?.trim();

  if (cleanName) {
    return cleanName;
  }

  return `F${fnNumber}`;
}

function clampSpeed(speed: number, maxSpeed: number): number {
  return Math.max(0, Math.min(Math.round(speed), maxSpeed));
}

export default function App() {
  const [status, setStatus] = useState<WsConnectionStatus>(wsClient.getStatus());
  const [locos, setLocos] = useState<Loco[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [selectedLocoId, setSelectedLocoId] = useState<string>(() => {
    return window.localStorage.getItem(SELECTED_LOCO_STORAGE_KEY) ?? "";
  });
  const [speed, setSpeed] = useState(0);
  const [direction, setDirection] = useState<Direction>("forward");
  const [activeFunctions, setActiveFunctions] = useState<Record<number, boolean>>({});
  const [powerInfo, setPowerInfo] = useState<WsPowerInfoPayload | null>(null);
  const [commandCenter, setCommandCenter] = useState<CommandCenterInfoPayload | null>(null);
  const [reservation, setReservation] = useState<LocoReservation | null>(null);

  const currentAddressRef = useRef<number | null>(null);

  const currentLoco = useMemo(() => {
    if (selectedLocoId) {
      const found = locos.find(loco => loco.id === selectedLocoId);

      if (found) {
        return found;
      }
    }

    return locos[0] ?? null;
  }, [locos, selectedLocoId]);

  const alive = commandCenter?.alive ?? false;
  const maxSpeed = currentLoco?.maxSpeed || 100;
  const speedPercent = maxSpeed > 0 ? Math.round((speed / maxSpeed) * 100) : 0;
  const controlsDisabled = !alive || status !== "connected" || !currentLoco;

  const loadLocos = useCallback(async () => {
    setLoadState("loading");

    try {
      const response = await wsApi.loadLocos();

      if (!response.ok) {
        throw new Error(response.message ?? "Could not load locomotives.");
      }

      const loadedLocos = response.locos ?? [];
      setLocos(loadedLocos);
      setLoadState("ready");

      const savedId = window.localStorage.getItem(SELECTED_LOCO_STORAGE_KEY);
      const nextId = savedId && loadedLocos.some(loco => loco.id === savedId)
        ? savedId
        : loadedLocos[0]?.id ?? "";

      setSelectedLocoId(nextId);

      if (nextId) {
        window.localStorage.setItem(SELECTED_LOCO_STORAGE_KEY, nextId);
      } else {
        window.localStorage.removeItem(SELECTED_LOCO_STORAGE_KEY);
      }
    } catch (error) {
      console.error(error);
      setLoadState("error");
      showNotification({
        color: "red",
        title: "Locomotives",
        message: error instanceof Error ? error.message : "Could not load locomotives.",
      });
    }
  }, []);

  const requestCurrentLocoState = useCallback(() => {
    const address = currentAddressRef.current;

    if (address !== null) {
      wsApi.getLoco(address);
    }
  }, []);

  useEffect(() => {
    const url = getDefaultWsUrl();
    wsApi.connect(url);

    const unsubscribeStatus = wsClient.subscribeStatus(nextStatus => {
      setStatus(nextStatus);

      if (nextStatus === "connected") {
        void loadLocos();
        requestCurrentLocoState();
        return;
      }

      if (
        nextStatus === "disconnected" ||
        nextStatus === "reconnecting" ||
        nextStatus === "error"
      ) {
        setPowerInfo(null);
        setCommandCenter(null);
      }
    });

    return () => {
      unsubscribeStatus();
      wsApi.disconnect();
    };
  }, [loadLocos, requestCurrentLocoState]);

  useEffect(() => {
    const unsubscribeLocoState = wsClient.on("locoState", data => {
      const loco = data.loco;

      if (!loco || loco.address !== currentAddressRef.current) {
        return;
      }

      setSpeed(loco.speed);
      setDirection(loco.direction);
      setActiveFunctions(loco.functions ?? {});
      setReservation(loco.reservation ?? null);
    });

    const unsubscribePower = wsClient.on("powerInfo", data => {
      setPowerInfo(data);
    });

    const unsubscribeCommandCenter = wsClient.on("commandCenterInfo", data => {
      setCommandCenter(data);
    });

    const unsubscribeReservation = wsClient.on("locoReservationChanged", data => {
      if (data.locoAddress === currentAddressRef.current) {
        wsApi.getLoco(data.locoAddress);
      }
    });

    return () => {
      unsubscribeLocoState();
      unsubscribePower();
      unsubscribeCommandCenter();
      unsubscribeReservation();
    };
  }, []);

  useEffect(() => {
    currentAddressRef.current = currentLoco?.address ?? null;
    setSpeed(0);
    setDirection("forward");
    setActiveFunctions({});
    setReservation(null);

    if (currentLoco) {
      wsApi.getLoco(currentLoco.address);
    }
  }, [currentLoco]);

  const selectLoco = (id: string | null) => {
    const nextId = id ?? "";
    setSelectedLocoId(nextId);

    if (nextId) {
      window.localStorage.setItem(SELECTED_LOCO_STORAGE_KEY, nextId);
    } else {
      window.localStorage.removeItem(SELECTED_LOCO_STORAGE_KEY);
    }
  };

  const setLocoSpeed = (nextSpeed: number) => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    const normalized = clampSpeed(nextSpeed, maxSpeed);
    setSpeed(normalized);
    wsApi.setLoco(currentLoco.address, normalized, direction);
  };

  const setLocoDirection = (nextDirection: Direction) => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    setDirection(nextDirection);
    wsApi.setLoco(currentLoco.address, speed, nextDirection);
  };

  const stopLoco = () => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    setSpeed(0);
    wsApi.setLoco(currentLoco.address, 0, direction);
  };

  const toggleEmergencyStop = () => {
    if (!alive || status !== "connected") {
      return;
    }

    if (powerInfo?.emergencyStop) {
      wsApi.powerOn();
      return;
    }

    wsApi.emergencyStop();
  };

  const toggleFunction = (fnNumber: number, nextActive: boolean) => {
    if (!currentLoco || controlsDisabled) {
      return;
    }

    setActiveFunctions(current => ({
      ...current,
      [fnNumber]: nextActive,
    }));

    wsApi.setLocoFunction(currentLoco.address, fnNumber, nextActive);
  };

  const locoOptions = locos.map(loco => ({
    value: loco.id,
    label: `${loco.name} · #${loco.address}`,
  }));

  return (
    <Box className="mobile-shell">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTrain size={28} />
            <div>
              <Title order={3}>DCCExpress Mobile</Title>
              <Text size="xs" c="dimmed">
                Loco control panel
              </Text>
            </div>
          </Group>

          <Badge color={statusColor(status)} variant="light">
            {formatStatus(status)}
          </Badge>
        </Group>

        <Card withBorder radius="lg" p="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed">
                  Command center
                </Text>
                <Text fw={700}>{commandCenter?.name ?? commandCenter?.type ?? "Unknown"}</Text>
              </div>

              <Group gap="xs">
                <Badge color={alive ? "green" : "red"} variant="light">
                  {alive ? "Alive" : "Offline"}
                </Badge>
                <Badge color={powerInfo?.trackVoltageOn ? "green" : "gray"} variant="light">
                  {powerInfo?.trackVoltageOn ? "Power on" : "Power off"}
                </Badge>
              </Group>
            </Group>

            <Group grow>
              <Button
                leftSection={powerInfo?.emergencyStop ? <IconBolt size={18} /> : <IconBoltOff size={18} />}
                color={powerInfo?.emergencyStop ? "green" : "red"}
                variant={powerInfo?.emergencyStop ? "filled" : "light"}
                disabled={!alive || status !== "connected"}
                onClick={toggleEmergencyStop}
              >
                {powerInfo?.emergencyStop ? "Power on" : "Emergency stop"}
              </Button>

              <ActionIcon
                size="lg"
                variant="light"
                aria-label="Reload locomotives"
                disabled={status !== "connected" || loadState === "loading"}
                onClick={() => void loadLocos()}
              >
                {loadState === "loading" ? <Loader size="xs" /> : <IconRefresh size={18} />}
              </ActionIcon>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="md">
          <Stack gap="md">
            <Select
              label="Locomotive"
              placeholder="Select locomotive"
              data={locoOptions}
              value={currentLoco?.id ?? null}
              onChange={selectLoco}
              searchable
              disabled={loadState === "loading" || locos.length === 0}
            />

            {loadState === "loading" && (
              <Center py="xl">
                <Loader />
              </Center>
            )}

            {loadState !== "loading" && !currentLoco && (
              <Text c="dimmed" ta="center" py="xl">
                No locomotives found.
              </Text>
            )}

            {currentLoco && (
              <>
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Title order={2}>{currentLoco.name}</Title>
                    <Text c="dimmed">Address #{currentLoco.address}</Text>
                    {reservation && (
                      <Text size="xs" c="yellow" mt={4}>
                        Reserved by {reservation.ownerName ?? reservation.ownerId}
                      </Text>
                    )}
                  </div>

                  <Badge size="lg" color={direction === "forward" ? "blue" : "grape"}>
                    {direction}
                  </Badge>
                </Group>

                <Center>
                  <Text className="speed-readout">{speed}</Text>
                </Center>

                <Progress value={speedPercent} size="xl" radius="xl" />

                <Slider
                  value={speed}
                  min={0}
                  max={maxSpeed}
                  step={1}
                  label={value => `${value}`}
                  disabled={controlsDisabled}
                  onChange={setLocoSpeed}
                />

                <SimpleGrid cols={3} spacing="sm">
                  <Button
                    size="lg"
                    variant={direction === "reverse" ? "filled" : "light"}
                    leftSection={<IconArrowBackUp size={20} />}
                    disabled={controlsDisabled}
                    onClick={() => setLocoDirection("reverse")}
                  >
                    Reverse
                  </Button>

                  <Button
                    size="lg"
                    color="red"
                    disabled={controlsDisabled}
                    onClick={stopLoco}
                  >
                    Stop
                  </Button>

                  <Button
                    size="lg"
                    variant={direction === "forward" ? "filled" : "light"}
                    rightSection={<IconArrowForwardUp size={20} />}
                    disabled={controlsDisabled}
                    onClick={() => setLocoDirection("forward")}
                  >
                    Forward
                  </Button>
                </SimpleGrid>
              </>
            )}
          </Stack>
        </Card>

        {currentLoco && (
          <Card withBorder radius="lg" p="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={4}>Functions</Title>
                <Badge variant="light">F0-F{Math.max(0, currentLoco.functions.length - 1)}</Badge>
              </Group>

              <SimpleGrid cols={{ base: 3, xs: 4, sm: 5 }} spacing="xs">
                {currentLoco.functions.map(fn => {
                  const active = activeFunctions[fn.number] ?? fn.active ?? false;

                  return (
                    <Button
                      key={fn.id || fn.number}
                      className="function-button"
                      variant={active ? "filled" : "light"}
                      color={active ? "blue" : "gray"}
                      disabled={controlsDisabled}
                      onPointerDown={event => {
                        event.preventDefault();

                        if (fn.momentary) {
                          toggleFunction(fn.number, true);
                          return;
                        }

                        toggleFunction(fn.number, !active);
                      }}
                      onPointerUp={event => {
                        event.preventDefault();

                        if (fn.momentary) {
                          toggleFunction(fn.number, false);
                        }
                      }}
                      onPointerCancel={event => {
                        event.preventDefault();

                        if (fn.momentary) {
                          toggleFunction(fn.number, false);
                        }
                      }}
                      onContextMenu={event => event.preventDefault()}
                    >
                      <Stack gap={0} align="center">
                        <Text size="xs" fw={700}>F{fn.number}</Text>
                        <Text size="xs" lineClamp={1}>{getFunctionLabel(fn.number, fn.name)}</Text>
                      </Stack>
                    </Button>
                  );
                })}
              </SimpleGrid>
            </Stack>
          </Card>
        )}

        <Text size="xs" c="dimmed" ta="center">
          Client UUID: {wsApi.clientUuid}
        </Text>
      </Stack>
    </Box>
  );
}

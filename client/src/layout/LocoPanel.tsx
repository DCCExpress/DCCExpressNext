import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  ScrollArea,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconPlayerStop,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
} from "@tabler/icons-react";

import LocoImage from "../components/loco/LocoImage";
import LocoPicker from "../components/loco/LocoPicker";
import { Loco, LocoState } from "../../../common/src/types";
import { wsApi } from "../services/wsApi";
import { wsClient } from "../services/wsClient";
import { useCommandCenter } from "../context/CommandCenterContext";
import { showErrorMessage } from "../helpers";


// TODO: Ha szerkesztve lett a mozdony újra le kell kérdezni a LocoState-t, 
// hogy a cím és a funkciók is frissüljenek

type Direction = "forward" | "reverse";

type LocoPanelProps = {
  locos?: Loco[];
};

const SPEED_PRESETS = [5, 10, 20, 40, 80, 100];
const SELECTED_LOCO_STORAGE_KEY = "dcc-express.loco-panel.selected-loco-id";

export default function LocoPanel({ locos = [] }: LocoPanelProps) {

  const [selectedLocoId, setSelectedLocoId] = useState<string>(() => {
    return window.localStorage.getItem(SELECTED_LOCO_STORAGE_KEY) ?? "";
  });

  const currentAddressRef = useRef<number | null>(null);
  const [pickerOpened, setPickerOpened] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [direction, setDirection] = useState<Direction>("forward");
  const [activeFunctions, setActiveFunctions] = useState<Record<number, boolean>>({});

  const { powerInfo, alive } = useCommandCenter();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const badgeBg = colorScheme == "dark" ? theme.colors.dark[5] : theme.colors.blue[0];
  const badgeBorder = colorScheme == "dark" ? theme.colors.dark[3] : theme.colors.blue[2];
  const badgeText = colorScheme == "dark" ? theme.colors.blue[1] : theme.colors.blue[8];

  const selectLocoId = useCallback((id: string) => {
    setSelectedLocoId(id);
    if (id) {
      window.localStorage.setItem(SELECTED_LOCO_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(SELECTED_LOCO_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (locos.length === 0) {
      return;
    }

    if (selectedLocoId && locos.some((l) => l.id === selectedLocoId)) {
      return;
    }

    selectLocoId(locos[0]?.id ?? "");
  }, [locos, selectedLocoId, selectLocoId]);
  
  const currentLoco = useMemo(() => {
    if (selectedLocoId) {
      const found = locos.find((l) => l.id === selectedLocoId);
      if (found) return found;
    }

    return locos.length > 0 ? locos[0] : null;
  }, [locos, selectedLocoId]);

  useEffect(() => {
    currentAddressRef.current = currentLoco?.address ?? null;

    if (currentLoco) {
      wsApi.getLoco(currentLoco.address);
    }
  }, [currentLoco]);

  const handleSelectLoco = (loco: Loco) => {
    selectLocoId(loco.id);
    setPickerOpened(false);
    setSpeed(0);
    setDirection("forward");
    setActiveFunctions({});
    wsApi.getLoco(loco.address);
  };


  const handleForward = () => {
    setDirection("forward");
    if (currentLoco) {
      wsApi.setLoco(currentLoco.address, speed, "forward");
    }
  };
  const handleReverse = () => {
    setDirection("reverse")
    if (currentLoco) {
      wsApi.setLoco(currentLoco.address, speed, "reverse");
    }
  };
  const handleStop = () => {
    setSpeed(0);
    if (currentLoco) {
      wsApi.setLoco(currentLoco.address, 0, direction);
    }
  };
  const handleEmergencyStop = () => {
    setSpeed(0);
    if (currentLoco) {
      wsApi.emergencyStop();
    }
  };

  const setSpeedByPercent = (percent: number) => {
    if (!currentLoco) return;

    const max = currentLoco.maxSpeed || 100;
    const calculated = Math.round((max * percent) / 100);
    const clamped = Math.max(0, Math.min(calculated, max));

    setSpeed(clamped);
  };

  const toggleFunction = (fnNumber: number, momentary: boolean) => {
    if (momentary) {
      setActiveFunctions((prev) => ({ ...prev, [fnNumber]: true }));
      window.setTimeout(() => {
        setActiveFunctions((prev) => ({ ...prev, [fnNumber]: false }));
      }, 200);
      return;
    }

    setActiveFunctions((prev) => ({
      ...prev,
      [fnNumber]: !prev[fnNumber],
    }));
  };

  useEffect(() => {
    const unsubscribe = wsClient.on("locoState", (data) => {
      const loco = data.loco as LocoState;
      if (loco) {
        if (loco.address === currentAddressRef.current) {
          setSpeed(loco.speed);
          setDirection(loco.direction);
          setActiveFunctions(loco.functions ?? {});
        }
      }
      else {
        showErrorMessage("LocoState", "Nem sikerült a locoState konvertálása!");
      }
    });

    return unsubscribe;
  }, []);


  return (
    <Card withBorder radius="sm" p="xs" h="100%"
      opacity={alive ? 1 : 0.75}
    >


      <div style={{ position: "relative", height: "100%" }}>

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
              Nincs még mozdony betöltve.
            </Text>
          ) : (
            <>
              <Card withBorder radius="sm" p="xs">
                <Stack align="center" gap={0}>
                  <LocoImage
                    image={currentLoco.image}
                    name={currentLoco.name}
                    width={400}
                    height={60}
                    clickable
                    onClick={() => setPickerOpened(true)}
                  />
                </Stack>

                <Stack gap="xs" align="center">
                  <Text fw={700} ta="center">
                    #{currentLoco.address} {currentLoco.name || "Névtelen mozdony"}
                  </Text>

                  <Badge
                    radius={4}
                    m={4}
                    size="xl"
                    w={120}
                    h="auto"
                    px="md"
                    py={6}
                    styles={{
                      root: {
                        backgroundColor: badgeBg,
                        border: `1px solid ${badgeBorder}`,
                      },
                      label: {
                        height: "auto",
                        lineHeight: 1,
                        textTransform: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    }}
                  >
                    <Title order={1} fw={700} lh={1} style={{
                      color: badgeText,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {speed}
                    </Title>
                  </Badge>
                  {!alive && (
                    <Badge color="red" variant="light">
                      OFFLINE
                    </Badge>)}


                  <div style={{ width: "100%" }}>
                    {/* <Group justify="space-between" mb={6}>
                      <Text size="sm" fw={500}>
                        Sebesség
                      </Text>
                      <Text size="sm" c="dimmed">
                        {speed} / {currentLoco.maxSpeed || 100}
                      </Text>
                    </Group> */}

                    <Slider
                      min={0}
                      max={currentLoco.maxSpeed || 100}
                      value={speed}
                      onChange={(s) => {
                        setSpeed(s);
                        wsApi.setLoco(currentLoco.address, s, direction);
                      }}
                      label={null}
                    />
                  </div>

                  <SimpleGrid cols={6} spacing={2} p={0} w="100%">
                    {SPEED_PRESETS.map((preset) => (
                      <Button
                        key={preset}
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setSpeedByPercent(preset);
                          if (currentLoco) {
                            const max = currentLoco.maxSpeed || 100;
                            const calculated = Math.round((max * preset) / 100);
                            wsApi.setLoco(currentLoco.address, calculated, direction);
                          }
                        }
                        }
                      >
                        {preset}
                      </Button>
                    ))}
                  </SimpleGrid>

                  <Group grow gap={4} w="100%">
                    <Button
                      size="xs"
                      variant={direction === "reverse" ? "filled" : "light"}
                      leftSection={<IconPlayerTrackPrev size={14} />}
                      onClick={handleReverse}
                    >
                      Hátra
                    </Button>

                    <Button
                      size="xs"
                      variant={speed > 0 ? "light" : "filled"}
                      color="yellow"
                      leftSection={<IconPlayerStop size={14} />}
                      onClick={handleStop}
                    >
                      Stop
                    </Button>
                    <Button
                      size="xs"
                      variant={direction === "forward" ? "filled" : "light"}
                      rightSection={<IconPlayerTrackNext size={14} />}
                      onClick={handleForward}
                    >
                      Előre
                    </Button>

                  </Group>
                  <Button
                    size="md"
                    style={{ width: "100%" }}

                    color={powerInfo?.emergencyStop ? "red" : "gray"}
                    className={powerInfo?.emergencyStop ? "blinkBadge" : ""}

                    leftSection={<IconAlertTriangle size={14} />}
                    onClick={() => {
                      if (powerInfo) {
                        if (powerInfo.emergencyStop) {
                          wsApi.powerOn();
                        } else {
                          wsApi.emergencyStop();
                        }
                      }
                    }}
                  >
                    Emergency
                  </Button>



                </Stack>
              </Card>

              <Card withBorder radius="xs" p="xs" style={{ flex: 1, minHeight: 0 }}>
                <Stack gap="sm" h="100%">

                  <ScrollArea style={{ flex: 1 }} type="auto">
                    <SimpleGrid cols={5} spacing="xs" verticalSpacing="xs">
                      {Array.from({ length: 28 }, (_, i) => {
                        const fn = currentLoco.functions.find((f) => f.number === i);
                        const active = !!activeFunctions[i];
                        const hasName = !!fn?.name?.trim();

                        return (
                          <Button
                            key={i}
                            size="xs"
                            variant={active ? "filled" : "light"}
                            color={active ? "blue" : "gray"}
                            style={{
                              height: 48,
                              padding: 2,
                              touchAction: "none",
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              WebkitTouchCallout: "none",
                            }}
                            styles={{
                              inner: {
                                width: "100%",
                                height: "100%",
                                justifyContent: "center",
                              },
                              label: {
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              },
                            }}
                            onPointerDown={(ev) => {
                              ev.preventDefault();

                              if (fn?.momentary) {
                                wsApi.setLocoFunction(currentLoco.address, i, true);
                              } else {
                                const a = activeFunctions[i];
                                wsApi.setLocoFunction(currentLoco.address, i, !a);
                              }
                            }}
                            onPointerUp={(ev) => {
                              ev.preventDefault();

                              if (fn?.momentary) {
                                wsApi.setLocoFunction(currentLoco.address, i, false);
                              }
                            }}
                            onPointerCancel={() => {
                              if (fn?.momentary) {
                                setActiveFunctions((prev) => ({ ...prev, [i]: false }));
                                wsApi.setLocoFunction(currentLoco.address, i, false);
                              }
                            }}
                            onPointerLeave={() => {
                              if (fn?.momentary) {
                                setActiveFunctions((prev) => ({ ...prev, [i]: false }));
                                wsApi.setLocoFunction(currentLoco.address, i, false);
                              }
                            }}
                            onContextMenu={(ev) => {
                              ev.preventDefault();
                            }}
                          >
                            <span
                              style={{
                                width: "100%",
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                lineHeight: 1.15,
                              }}
                            >
                              <span
                                style={{
                                  display: "block",
                                  width: "100%",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textAlign: "center",
                                }}
                              >
                                F{i}
                              </span>

                              {hasName && (
                                <span
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    minWidth: 0,
                                    fontSize: 10,
                                    opacity: 0.85,
                                    marginTop: 2,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                  }}
                                >
                                  {fn?.name}
                                  {fn?.momentary ? " *" : ""}
                                </span>
                              )}
                            </span>
                          </Button>
                        );
                      })}
                    </SimpleGrid>
                  </ScrollArea>
                </Stack>
              </Card>
            </>
          )}
        </Stack>
      </div>
    </Card >
  );
}
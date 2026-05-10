import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  FileButton,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPhoto, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { getLocos, saveLocos } from "../api/http";
import { generateId } from "../helpers";
import { Loco, LocoFunction } from "../../../common/src/types";
import { wsApi } from "../services/wsApi";
import { useTranslation } from "react-i18next";

type LocoDialogProps = {
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const createEmptyLoco = (): Loco => ({
  id: generateId(),
  name: "",
  address: 3,
  maxSpeed: 100,
  invert: false,
  image: "",
  length: 200,
  functions: [],
});

const createDefaultFunction = (nextNumber: number): LocoFunction => ({
  id: generateId(),
  number: nextNumber,
  name: `F${nextNumber}`,
  icon: "💡",
  momentary: false,
});

export default function LocoDialog({
  opened,
  onClose,
  onSaved,
}: LocoDialogProps) {
  const [locos, setLocos] = useState<Loco[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const { t } = useTranslation();

  useEffect(() => {
    if (!opened) return;

    const load = async () => {
      try {
        setLoading(true);
        setMessage("");

        const data = await getLocos();
        setLocos(data);

        if (data.length > 0) {
          setSelectedId(data[0]!.id);
        } else {
          setSelectedId("");
        }
      } catch (error) {
        console.error(error);
        setMessage(t("locodialog.couldnotloadlocos"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [opened]);

  useEffect(() => {
    if (!selectedId && locos.length > 0) {
      setSelectedId(locos[0]!.id);
    }
  }, [locos, selectedId]);

  const selectedLoco = useMemo(
    () => locos.find((l) => l.id === selectedId) ?? null,
    [locos, selectedId]
  );

  const updateSelectedLoco = (patch: Partial<Loco>) => {
    if (!selectedLoco) return;

    setLocos((prev) =>
      prev.map((l) => (l.id === selectedLoco.id ? { ...l, ...patch } : l))
    );
  };

  const addLoco = () => {
    const loco = createEmptyLoco();
    setLocos((prev) => [...prev, loco]);
    setSelectedId(loco.id);
  };

  const deleteSelectedLoco = () => {
    if (!selectedLoco) return;

    const next = locos.filter((l) => l.id !== selectedLoco.id);
    setLocos(next);
    setSelectedId(next[0]?.id ?? "");
  };

  const addFunction = () => {
    if (!selectedLoco) return;

    const maxFn = selectedLoco.functions.reduce(
      (max, fn) => Math.max(max, fn.number),
      -1
    );

    const nextFn = createDefaultFunction(maxFn + 1);

    updateSelectedLoco({
      functions: [...selectedLoco.functions, nextFn],
    });
  };

  const updateFunction = (fnId: string, patch: Partial<LocoFunction>) => {
    if (!selectedLoco) return;

    updateSelectedLoco({
      functions: selectedLoco.functions.map((fn) =>
        fn.id === fnId ? { ...fn, ...patch } : fn
      ),
    });
  };

  const deleteFunction = (fnId: string) => {
    if (!selectedLoco) return;

    updateSelectedLoco({
      functions: selectedLoco.functions.filter((fn) => fn.id !== fnId),
    });
  };

  const sendFunction = async (fn: LocoFunction, active: boolean) => {
    if (!selectedLoco) return;

    try {
      setMessage("");
      await wsApi.setLocoFunction(selectedLoco.address, fn.number, active);
      setMessage(`F${fn.number} ${active ? "ON" : "OFF"} elküldve.`);
    } catch (error) {
      console.error(error);
      setMessage(`F${fn.number} parancs nem sikerült.`);
    }
  };

  const handleFunctionPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    fn: LocoFunction
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    void sendFunction(fn, true);
  };

  const handleFunctionPointerUp = (
    e: ReactPointerEvent<HTMLButtonElement>,
    fn: LocoFunction
  ) => {
    e.preventDefault();
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (fn.momentary) {
      void sendFunction(fn, false);
    }
  };

  const handleFunctionPointerCancel = (
    e: ReactPointerEvent<HTMLButtonElement>,
    fn: LocoFunction
  ) => {
    e.preventDefault();

    if (fn.momentary) {
      void sendFunction(fn, false);
    }
  };

  const setImageFromFile = (file: File | null) => {
    if (!file || !selectedLoco) return;

    const reader = new FileReader();

    reader.onload = () => {
      updateSelectedLoco({
        image: typeof reader.result === "string" ? reader.result : "",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      await saveLocos(locos);
      setMessage(t("locodialg.successful"));
      onSaved?.();
    } catch (error) {
      console.error(error);
      setMessage(t("locodialog.couldnotsave"));
    } finally {
      setSaving(false);
    }
  };

  if (!opened) return null;

  return (
    <Box
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Card
        withBorder
        radius="sm"
        p="md"
        style={{
          width: "min(1200px, 95vw)",
          height: "min(760px, 92vh)",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Group justify="space-between" mb="md" style={{ flexShrink: 0 }}>
          <div>
            <Title order={3}>{t("locodialog.locomotives")}</Title>
            {/* <Text size="sm" c="dimmed">
              Mozdony törzsadatok és funkciók szerkesztése
            </Text> */}
          </div>

          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Bezárás"
            onClick={onClose}
          >
            <IconX size={20} />
          </ActionIcon>
        </Group>

        <Divider mb="md" style={{ flexShrink: 0 }} />

        {loading ? (
          <Stack
            align="center"
            justify="center"
            style={{
              flex: 1,
              minHeight: 0,
            }}
          >
            <Loader />
            <Text size="sm" c="dimmed">
              {t("locodialog.loading")}
            </Text>
          </Stack>
        ) : (
          <Group
            align="stretch"
            gap="md"
            style={{
              flex: 1,
              minHeight: 0,
              flexWrap: "nowrap",
            }}
          >
            <Card
              withBorder
              radius="sm"
              p="sm"
              style={{
                width: 320,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              <Group justify="space-between" mb="sm" style={{ flexShrink: 0 }}>
                <Text fw={600}>{t("locodialog.mozdonylista")}</Text>

                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={addLoco}
                >
                  {t("locodialog.newloco")}
                </Button>
              </Group>

              <ScrollArea
                type="auto"
                style={{
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <Stack gap="xs">
                  {locos.map((loco) => (
                    <Card
                      key={loco.id}
                      withBorder
                      radius="sm"
                      p="sm"
                      style={{
                        cursor: "pointer",
                        borderColor:
                          loco.id === selectedId
                            ? "var(--mantine-color-blue-5)"
                            : undefined,
                        backgroundColor:
                          loco.id === selectedId
                            ? "var(--mantine-color-default-hover)"
                            : undefined,
                      }}
                      onClick={() => setSelectedId(loco.id)}
                    >
                      <Group
                        align="stretch"
                        gap="sm"
                        style={{
                          width: "100%",
                          flexWrap: "nowrap",
                        }}
                      >
                        <Box
                          style={{
                            width: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {loco.image ? (
                            <img
                              src={loco.image}
                              alt={loco.name || "Loco"}
                              style={{
                                height: 48,
                                width: "auto",
                                maxWidth: "100%",
                                objectFit: "contain",
                                display: "block",
                              }}
                            />
                          ) : (
                            <IconPhoto size={24} style={{ opacity: 0.5 }} />
                          )}
                        </Box>

                        <Stack
                          gap={2}
                          style={{
                            width: "50%",
                            justifyContent: "center",
                          }}
                        >
                          <Text fw={600} truncate>
                            {loco.name || t("locodialog.unknownloco")}
                          </Text>

                          <Text size="sm" c="dimmed">
                            {t("locodialog.locoaddress")}: {loco.address}
                          </Text>

                          <Text size="sm" c="dimmed">
                            {t("locodialog.loco_speed_max")}: {loco.maxSpeed}
                          </Text>
                        </Stack>
                      </Group>
                    </Card>
                  ))}

                  {locos.length === 0 && (
                    <Text size="sm" c="dimmed">
                      {t("locodialog.locosempty")}.
                    </Text>
                  )}
                </Stack>
              </ScrollArea>

              <Divider my="sm" style={{ flexShrink: 0 }} />

              <Group grow style={{ flexShrink: 0 }}>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={deleteSelectedLoco}
                  disabled={!selectedLoco}
                >
                  {t("locodialog.delete")}
                </Button>
              </Group>
            </Card>

            <Card
              withBorder
              radius="sm"
              p="md"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {!selectedLoco ? (
                <Stack
                  align="center"
                  justify="center"
                  style={{
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <Text fw={600}>{t("locodialog.noselectedloco")}.</Text>
                </Stack>
              ) : (
                <Tabs
                  defaultValue="general"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Tabs.List style={{ flexShrink: 0 }}>
                    <Tabs.Tab value="general">General</Tabs.Tab>
                    <Tabs.Tab value="functions">Functions</Tabs.Tab>
                    <Tabs.Tab value="extended">Extended params</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel
                    value="general"
                    pt="md"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <ScrollArea
                      type="auto"
                      style={{
                        flex: 1,
                        minHeight: 0,
                      }}
                    >
                      <Stack gap="md">
                        <Group align="flex-start" wrap="nowrap">
                          <Card
                            withBorder
                            radius="sm"
                            p="xs"
                            style={{
                              width: 220,
                              height: 160,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            {selectedLoco.image ? (
                              <img
                                src={selectedLoco.image}
                                alt={selectedLoco.name}
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <Stack align="center" gap="xs">
                                <IconPhoto size={32} />
                                <Text size="sm" c="dimmed">
                                  {t("locodialog.noimage")}
                                </Text>
                              </Stack>
                            )}
                          </Card>

                          <Stack gap="sm" style={{ flex: 1 }}>
                            <FileButton
                              onChange={setImageFromFile}
                              accept="image/png,image/jpeg,image/webp"
                            >
                              {(props) => (
                                <Button
                                  {...props}
                                  variant="light"
                                  leftSection={<IconPhoto size={16} />}
                                >
                                {t("locodialog.selectimage")}
                                </Button>
                              )}
                            </FileButton>

                            {/* <Text size="sm" c="dimmed">
                              Most egyelőre Base64-ben mentjük a JSON-be.
                            </Text> */}
                          </Stack>
                        </Group>

                        <Stack gap="xs" w="50%">
                          <TextInput
                            label={t("locodialog.loconame")}
                            value={selectedLoco.name}
                            onChange={(e) =>
                              updateSelectedLoco({
                                name: e.currentTarget.value,
                              })
                            }
                          />

                          <NumberInput
                            label={t("locodialog.locoaddress")}
                            value={selectedLoco.address}
                            min={1}
                            onChange={(value) =>
                              updateSelectedLoco({
                                address: Number(value) || 0,
                              })
                            }
                          />

                          <NumberInput
                            label={t("locodialog.loco_max_speed")}
                            value={selectedLoco.maxSpeed}
                            min={1}
                            max={1000}
                            onChange={(value) =>
                              updateSelectedLoco({
                                maxSpeed: Number(value) || 0,
                              })
                            }
                          />

                          <Checkbox
                            label={t("locodialog.loco_direction_invert")}
                            checked={selectedLoco.invert}
                            onChange={(e) =>
                              updateSelectedLoco({
                                invert: e.currentTarget.checked,
                              })
                            }
                          />
                        </Stack>
                      </Stack>
                    </ScrollArea>
                  </Tabs.Panel>

                  <Tabs.Panel
                    value="functions"
                    pt="md"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack
                      gap="md"
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Group
                        justify="space-between"
                        style={{ flexShrink: 0 }}
                      >
                        <Text fw={600}>{t("locodialog.loco_functions")}</Text>

                        <Button
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={addFunction}
                        >
                          {t("locodialog.new_function")}
                        </Button>
                      </Group>

                      <ScrollArea
                        type="auto"
                        style={{
                          flex: 1,
                          minHeight: 0,
                        }}
                      >
                        <Stack gap="sm">
                          {selectedLoco.functions.map((fn) => (
                            <Card key={fn.id} withBorder radius="sm" p="md">
                              <Group align="flex-start" wrap="nowrap">
                                <NumberInput
                                  label={t("locodialog.function_number")}
                                  value={fn.number}
                                  min={0}
                                  style={{ width: 120, flexShrink: 0 }}
                                  onChange={(value) =>
                                    updateFunction(fn.id, {
                                      number: Number(value) || 0,
                                    })
                                  }
                                />

                                <TextInput
                                  label={t("locodialog.functionname")}
                                  value={fn.name}
                                  style={{ flex: 1, minWidth: 0 }}
                                  onChange={(e) =>
                                    updateFunction(fn.id, {
                                      name: e.currentTarget.value,
                                    })
                                  }
                                />

                                <TextInput
                                  label="Ikon"
                                  value={fn.icon}
                                  style={{ width: 100, flexShrink: 0 }}
                                  onChange={(e) =>
                                    updateFunction(fn.id, {
                                      icon: e.currentTarget.value,
                                    })
                                  }
                                />

                                <Checkbox
                                  mt={30}
                                  label={t("locodialog.function_momentary")}
                                  checked={fn.momentary}
                                  onChange={(e) =>
                                    updateFunction(fn.id, {
                                      momentary: e.currentTarget.checked,
                                    })
                                  }
                                />

                                <Button
                                  mt={24}
                                  size="xs"
                                  variant="light"
                                  onPointerDown={(e) =>
                                    handleFunctionPointerDown(e, fn)
                                  }
                                  onPointerUp={(e) =>
                                    handleFunctionPointerUp(e, fn)
                                  }
                                  onPointerCancel={(e) =>
                                    handleFunctionPointerCancel(e, fn)
                                  }
                                  onPointerLeave={(e) => {
                                    if (fn.momentary && e.buttons === 1) {
                                      handleFunctionPointerCancel(e, fn);
                                    }
                                  }}
                                >
                                  {t("locodialog.function_test")}
                                </Button>

                                <ActionIcon
                                  mt={28}
                                  color="red"
                                  variant="light"
                                  onClick={() => deleteFunction(fn.id)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Card>
                          ))}

                          {selectedLoco.functions.length === 0 && (
                            <Text size="sm" c="dimmed">
                              {t("locodialog.functions_empty")}
                            </Text>
                          )}
                        </Stack>
                      </ScrollArea>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel
                    value="extended"
                    pt="md"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack
                      gap="md"
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Group
                        justify="space-between"
                        style={{ flexShrink: 0 }}
                      >
                        <Text fw={600}>{t("locodialog.extended_params")}</Text>
                      </Group>

                      <ScrollArea
                        type="auto"
                        style={{
                          flex: 1,
                          minHeight: 0,
                        }}
                      >
                        <Stack gap="sm">
                          <NumberInput
                            label={t("locodialog.loco_length_mm")}
                            value={selectedLoco.length}
                            min={1}
                            onChange={(value) =>
                              updateSelectedLoco({
                                length: Number(value) || 0,
                              })
                            }
                          />
                        </Stack>
                      </ScrollArea>
                    </Stack>
                  </Tabs.Panel>
                </Tabs>
              )}
            </Card>
          </Group>
        )}

        <Divider my="md" style={{ flexShrink: 0 }} />

        <Group justify="space-between" style={{ flexShrink: 0 }}>
          <Text size="sm" c={message.includes("sikerült") ? "green" : "dimmed"}>
            {message || ""}
          </Text>

          <Group>
            <Button onClick={handleSave} loading={saving}>
              {t("locodialog.save")}
            </Button>

            <Button variant="light" onClick={onClose}>
              {t("locodialog.close")}
            </Button>
          </Group>
        </Group>
      </Card>
    </Box>
  );
}
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActionIcon,
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
} from "@mantine/core";

import {
  IconPhoto,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { useTranslation } from "react-i18next";

import type {
  Loco,
  LocoFunction,
} from "../../../common/src/types";

import {
  getLocos,
  saveLocos,
} from "../api/domainApi";
import { generateId } from "../helpers";
import { wsApi } from "../services/wsApi";
import AppModal from "./common/AppModal";

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

const createDefaultFunction = (
  nextNumber: number
): LocoFunction => ({
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
  const { t } = useTranslation();

  const [locos, setLocos] = useState<Loco[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!opened) return;

    void (async () => {
      try {
        setLoading(true);
        setMessage("");
        const data = await getLocos();
        setLocos(data);
        setSelectedId(data[0]?.id ?? "");
      } catch (error) {
        console.error(error);
        setMessage(t("locodialog.couldnotloadlocos"));
      } finally {
        setLoading(false);
      }
    })();
  }, [opened, t]);

  const selectedLoco = useMemo(
    () => locos.find(loco => loco.id === selectedId) ?? null,
    [locos, selectedId]
  );

  const updateSelectedLoco = (patch: Partial<Loco>): void => {
    if (!selectedLoco) return;

    setLocos(previous =>
      previous.map(loco =>
        loco.id === selectedLoco.id
          ? { ...loco, ...patch }
          : loco
      )
    );
  };

  const addLoco = (): void => {
    const loco = createEmptyLoco();
    setLocos(previous => [...previous, loco]);
    setSelectedId(loco.id);
  };

  const deleteSelectedLoco = (): void => {
    if (!selectedLoco) return;

    const next = locos.filter(loco => loco.id !== selectedLoco.id);
    setLocos(next);
    setSelectedId(next[0]?.id ?? "");
  };

  const addFunction = (): void => {
    if (!selectedLoco) return;

    const maxFn = selectedLoco.functions.reduce(
      (max, fn) => Math.max(max, fn.number),
      -1
    );

    updateSelectedLoco({
      functions: [
        ...selectedLoco.functions,
        createDefaultFunction(maxFn + 1),
      ],
    });
  };

  const updateFunction = (
    fnId: string,
    patch: Partial<LocoFunction>
  ): void => {
    if (!selectedLoco) return;

    updateSelectedLoco({
      functions: selectedLoco.functions.map(fn =>
        fn.id === fnId ? { ...fn, ...patch } : fn
      ),
    });
  };

  const deleteFunction = (fnId: string): void => {
    if (!selectedLoco) return;

    updateSelectedLoco({
      functions: selectedLoco.functions.filter(fn => fn.id !== fnId),
    });
  };

  const sendFunctionTest = async (
    fn: LocoFunction,
    active: boolean
  ): Promise<void> => {
    if (!selectedLoco) return;

    try {
      setMessage("");
      await wsApi.setLocoFunction(
        selectedLoco.address,
        fn.number,
        active
      );
      setMessage(`F${fn.number} ${active ? "ON" : "OFF"} elküldve.`);
    } catch (error) {
      console.error(error);
      setMessage(`F${fn.number} parancs nem sikerült.`);
    }
  };

  const setImageFromFile = (file: File | null): void => {
    if (!file || !selectedLoco) return;

    const reader = new FileReader();

    reader.onload = () => {
      updateSelectedLoco({
        image: typeof reader.result === "string" ? reader.result : "",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async (): Promise<void> => {
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

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={t("locodialog.locomotives")}
      size="min(1180px, 95vw)"
      centered
      draggable
      styles={{
        body: {
          height: "min(740px, calc(100vh - 120px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <Loader />
            <Text size="sm" c="dimmed">{t("locodialog.loading")}</Text>
          </Stack>
        ) : (
          <Group align="stretch" gap="md" wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
            <Card withBorder p="sm" style={{ width: 320, display: "flex", flexDirection: "column" }}>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{t("locodialog.mozdonylista")}</Text>
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLoco}>
                  {t("locodialog.newloco")}
                </Button>
              </Group>

              <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }}>
                <Stack gap="xs">
                  {locos.map(loco => (
                    <Card
                      key={loco.id}
                      withBorder
                      p="sm"
                      onClick={() => setSelectedId(loco.id)}
                      style={{
                        cursor: "pointer",
                        borderColor: loco.id === selectedId ? "var(--mantine-color-blue-5)" : undefined,
                        backgroundColor: loco.id === selectedId ? "var(--mantine-color-default-hover)" : undefined,
                      }}
                    >
                      <Group wrap="nowrap">
                        {loco.image ? (
                          <img
                            src={loco.image}
                            alt={loco.name || "Loco"}
                            style={{ height: 42, maxWidth: 110, objectFit: "contain" }}
                          />
                        ) : (
                          <IconPhoto size={24} style={{ opacity: 0.5 }} />
                        )}

                        <Stack gap={0} style={{ minWidth: 0 }}>
                          <Text fw={600} truncate>{loco.name || t("locodialog.unknownloco")}</Text>
                          <Text size="sm" c="dimmed">{t("locodialog.locoaddress")}: {loco.address}</Text>
                          <Text size="sm" c="dimmed">{t("locodialog.loco_speed_max")}: {loco.maxSpeed}</Text>
                        </Stack>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </ScrollArea>

              <Divider my="sm" />

              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={deleteSelectedLoco}
                disabled={!selectedLoco}
              >
                {t("locodialog.delete")}
              </Button>
            </Card>

            <Card withBorder p="md" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              {!selectedLoco ? (
                <Stack align="center" justify="center" h="100%">
                  <Text fw={600}>{t("locodialog.noselectedloco")}.</Text>
                </Stack>
              ) : (
                <Tabs defaultValue="general" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <Tabs.List>
                    <Tabs.Tab value="general">General</Tabs.Tab>
                    <Tabs.Tab value="functions">Functions</Tabs.Tab>
                    <Tabs.Tab value="extended">Extended params</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="general" pt="md" style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea h="100%">
                      <Stack gap="md" maw={520}>
                        {selectedLoco.image && (
                          <img
                            src={selectedLoco.image}
                            alt={selectedLoco.name}
                            style={{ maxHeight: 120, maxWidth: 260, objectFit: "contain" }}
                          />
                        )}

                        <FileButton onChange={setImageFromFile} accept="image/png,image/jpeg,image/webp">
                          {props => (
                            <Button {...props} variant="light" leftSection={<IconPhoto size={16} />}>
                              {t("locodialog.selectimage")}
                            </Button>
                          )}
                        </FileButton>

                        <TextInput
                          label={t("locodialog.loconame")}
                          value={selectedLoco.name}
                          onChange={event => updateSelectedLoco({ name: event.currentTarget.value })}
                        />

                        <NumberInput
                          label={t("locodialog.locoaddress")}
                          value={selectedLoco.address}
                          min={1}
                          onChange={value => updateSelectedLoco({ address: Number(value) || 0 })}
                        />

                        <NumberInput
                          label={t("locodialog.loco_max_speed")}
                          value={selectedLoco.maxSpeed}
                          min={1}
                          max={1000}
                          onChange={value => updateSelectedLoco({ maxSpeed: Number(value) || 0 })}
                        />

                        <Checkbox
                          label={t("locodialog.loco_direction_invert")}
                          checked={selectedLoco.invert}
                          onChange={event => updateSelectedLoco({ invert: event.currentTarget.checked })}
                        />
                      </Stack>
                    </ScrollArea>
                  </Tabs.Panel>

                  <Tabs.Panel value="functions" pt="md" style={{ flex: 1, minHeight: 0 }}>
                    <Stack h="100%">
                      <Group justify="space-between">
                        <Text fw={600}>{t("locodialog.loco_functions")}</Text>
                        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addFunction}>
                          {t("locodialog.new_function")}
                        </Button>
                      </Group>

                      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                        <Stack gap="sm">
                          {selectedLoco.functions.map(fn => (
                            <Card key={fn.id} withBorder p="sm">
                              <Group align="flex-start" wrap="nowrap">
                                <NumberInput label={t("locodialog.function_number")} value={fn.number} min={0} w={110} onChange={value => updateFunction(fn.id, { number: Number(value) || 0 })} />
                                <TextInput label={t("locodialog.functionname")} value={fn.name} style={{ flex: 1 }} onChange={event => updateFunction(fn.id, { name: event.currentTarget.value })} />
                                <TextInput label="Ikon" value={fn.icon} w={90} onChange={event => updateFunction(fn.id, { icon: event.currentTarget.value })} />
                                <Checkbox mt={30} label={t("locodialog.function_momentary")} checked={fn.momentary} onChange={event => updateFunction(fn.id, { momentary: event.currentTarget.checked })} />
                                <Button
                                  mt={24}
                                  size="xs"
                                  variant="light"
                                  onPointerDown={event => {
                                    event.preventDefault();
                                    void sendFunctionTest(fn, true);
                                  }}
                                  onPointerUp={event => {
                                    event.preventDefault();
                                    if (fn.momentary) {
                                      void sendFunctionTest(fn, false);
                                    }
                                  }}
                                  onPointerCancel={event => {
                                    event.preventDefault();
                                    if (fn.momentary) {
                                      void sendFunctionTest(fn, false);
                                    }
                                  }}
                                  onPointerLeave={event => {
                                    if (fn.momentary && event.buttons === 1) {
                                      void sendFunctionTest(fn, false);
                                    }
                                  }}
                                >
                                  {t("locodialog.function_test")}
                                </Button>
                                <ActionIcon mt={28} color="red" variant="light" onClick={() => deleteFunction(fn.id)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Card>
                          ))}

                          {selectedLoco.functions.length === 0 && (
                            <Text size="sm" c="dimmed">{t("locodialog.functions_empty")}</Text>
                          )}
                        </Stack>
                      </ScrollArea>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="extended" pt="md">
                    <NumberInput
                      label={t("locodialog.loco_length_mm")}
                      value={selectedLoco.length}
                      min={1}
                      onChange={value => updateSelectedLoco({ length: Number(value) || 0 })}
                    />
                  </Tabs.Panel>
                </Tabs>
              )}
            </Card>
          </Group>
        )}

        <Divider />

        <Group justify="space-between">
          <Text size="sm" c={message.includes("sikerült") ? "green" : "dimmed"}>
            {message || ""}
          </Text>
          <Group>
            <Button onClick={() => void handleSave()} loading={saving}>{t("locodialog.save")}</Button>
            <Button variant="light" onClick={onClose}>{t("locodialog.close")}</Button>
          </Group>
        </Group>
      </Stack>
    </AppModal>
  );
}

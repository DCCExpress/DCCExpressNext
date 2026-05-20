import { useEffect, useState } from "react";
import {
    Badge,
    Box,
    Button,
    Card,
    Divider,
    Group,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    Title,
} from "@mantine/core";
import {
    IconDeviceFloppy,
    IconDownload,
    IconCpu,
    IconUpload,
} from "@tabler/icons-react";
import CvBitEditor from "../components/CvBitEditor";
import {
    findCvDefinition,
    loadCvDatabase,
    type CvDefinition,
} from "../data/cvDatabase";
import { useCommandCenter } from "../context/CommandCenterContext";
import { useTranslation } from "react-i18next";

type DecoderType = "loco" | "accessory";
type ProgrammingMode = "service-track" | "pom-loco" | "pom-accessory";

type CvLogItem = {
    time: string;
    text: string;
};



type ProgrammerPageProps = {
    onGoHome?: () => void;
};

export default function ProgrammerPage(p: ProgrammerPageProps) {
    const { t } = useTranslation();
    const [decoderType, setDecoderType] = useState<DecoderType>("loco");
    const [mode, setMode] = useState<ProgrammingMode>("service-track");
    const [address, setAddress] = useState<number | "">(3);
    const [cv, setCv] = useState<number | "">(1);
    const [value, setValue] = useState<number | "">(3);
    const [log, setLog] = useState<CvLogItem[]>([]);
    const [cvDatabase, setCvDatabase] = useState<CvDefinition[]>([]);
    const [cvDatabaseError, setCvDatabaseError] = useState<string | null>(null);
    const cvDefinition = typeof cv === "number" ? findCvDefinition(cvDatabase, cv) : undefined;
    const { alive, type, name, ip, port, powerInfo } = useCommandCenter();
    useEffect(() => {
        let cancelled = false;

        loadCvDatabase()
            .then((database) => {
                if (cancelled) return;

                setCvDatabase(database);
                setCvDatabaseError(null);
            })
            .catch((error) => {
                if (cancelled) return;

                setCvDatabase([]);
                setCvDatabaseError(String(error));
            });

        return () => {
            cancelled = true;
        };
    }, []);

    function addLog(text: string) {
        setLog((prev) =>
            [
                ...prev,
                {
                    time: new Date().toLocaleTimeString(),
                    text,
                },
            ].slice(-200)
        );
    }

    function readCv() {
        if (typeof cv !== "number") return;
        addLog(t("programmer.readLog", { cv }));
    }

    function writeCv() {
        if (typeof cv !== "number" || typeof value !== "number") return;
        addLog(t("programmer.writeLog", { cv, value }));
    }

    return (
        <Stack p="md" gap="md">
            <Group justify="space-between">
                <Group gap="sm">
                    <IconCpu size={28} />

                    <div>
                        <Title order={3}>{t("programmer.title")}</Title>
                        <Text size="sm" c="dimmed">
                            {t("programmer.subtitle")}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {t("programmer.commandCenter")}: {name ?? "-"} / {type ?? "-"} / {ip ?? "-"}:{port ?? "-"}
                        </Text>
                    </div>
                </Group>

                <Group>
                    <Group>
                        <Badge color="blue" variant="light">
                            {t("programmer.experimental")}
                        </Badge>

                        <Badge color={alive ? "green" : "red"} variant="filled">
                            {alive ? t("commandCenter.online") : t("commandCenter.offline")}
                        </Badge>

                        <Badge color={powerInfo?.trackVoltageOn ? "green" : "red"} variant="filled">
                            {t("programmer.powerShort")} {powerInfo?.trackVoltageOn ? "ON" : "OFF"}
                        </Badge>

                        <Button variant="light" onClick={p.onGoHome}>
                            {t("Home")}
                        </Button>
                    </Group>
                    <Badge color="blue" variant="light">
                        {t("programmer.experimental")}
                    </Badge>

                    <Button variant="light" onClick={p.onGoHome}>
                        {t("Home")}
                    </Button>
                </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {/* <Card withBorder radius="md" p="md">
                    <Stack gap="sm">
                        <Title order={5}>{t("programmer.panelTitle")}</Title>

                        <Select
                            label="Decoder type"
                            value={decoderType}
                            onChange={(v) => setDecoderType((v ?? "loco") as DecoderType)}
                            data={[
                                { value: "loco", label: "Loco decoder" },
                                { value: "accessory", label: "Accessory decoder" },
                            ]}
                        />

                        <Select
                            label="Programming mode"
                            value={mode}
                            onChange={(v) =>
                                setMode((v ?? "service-track") as ProgrammingMode)
                            }
                            data={[
                                { value: "service-track", label: "Service track" },
                                { value: "pom-loco", label: "POM - loco" },
                                { value: "pom-accessory", label: "POM - accessory" },
                            ]}
                        />

                        {mode !== "service-track" && (
                            <NumberInput
                                label="Address"
                                value={address}
                                min={1}
                                max={9999}
                                onChange={(value) => setAddress(toNumberOrEmpty(value))}
                            />
                        )}

                        <Divider />

                        <Group grow align="end">
                            <Stack >
                                <NumberInput
                                    label="CV"
                                    value={cv}
                                    min={1}
                                    max={1024}
                                    onChange={(value) => setCv(toNumberOrEmpty(value))}
                                />
                                <NumberInput
                                    label="Value"
                                    value={value}
                                    min={0}
                                    max={255}
                                    onChange={(value) => setValue(toNumberOrEmpty(value))}
                                />

                                {typeof value === "number" && (
                                    <CvBitEditor
                                        value={value}
                                        onChange={setValue}
                                        {...(cv === 29 ? { bits: CV29_BITS } : {})}
                                    />
                                )}
                            </Stack>
                        </Group>

                        <Group grow>
                            <Button
                                variant="light"
                                leftSection={<IconDownload size={16} />}
                                onClick={readCv}
                            >
                                Read CV
                            </Button>

                            <Button leftSection={<IconUpload size={16} />} onClick={writeCv}>
                                Write CV
                            </Button>
                        </Group>
                    </Stack>
                </Card> */}
                <Card withBorder radius="md" p="md">
                    <Stack gap="sm">
                        <Title order={5}>{t("programmer.panelTitle")}</Title>

                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                            <Stack gap="sm">
                                <Select
                                    label={t("programmer.decoderType")}
                                    value={decoderType}
                                    onChange={(v) => setDecoderType((v ?? "loco") as DecoderType)}
                                    data={[
                                        { value: "loco", label: t("programmer.decoderTypes.loco") },
                                        { value: "accessory", label: t("programmer.decoderTypes.accessory") },
                                    ]}
                                />

                                <Select
                                    label={t("programmer.programmingMode")}
                                    value={mode}
                                    onChange={(v) =>
                                        setMode((v ?? "service-track") as ProgrammingMode)
                                    }
                                    data={[
                                        { value: "service-track", label: t("programmer.modes.serviceTrack") },
                                        { value: "pom-loco", label: t("programmer.modes.pomLoco") },
                                        { value: "pom-accessory", label: t("programmer.modes.pomAccessory") },
                                    ]}
                                />

                                {mode !== "service-track" && (
                                    <NumberInput
                                        label={t("programmer.address")}
                                        value={address}
                                        min={1}
                                        max={9999}
                                        onChange={(value) => setAddress(toNumberOrEmpty(value))}
                                    />
                                )}

                                <Divider />

                                <Group grow align="end">
                                    <NumberInput
                                        label={t("programmer.cv")}
                                        value={cv}
                                        min={1}
                                        max={1024}
                                        onChange={(value) => setCv(toNumberOrEmpty(value))}
                                    />

                                    <NumberInput
                                        label={t("programmer.value")}
                                        value={value}
                                        min={0}
                                        max={255}
                                        onChange={(value) => setValue(toNumberOrEmpty(value))}
                                    />
                                </Group>

                                {typeof value === "number" && (
                                    <Card withBorder>
                                        <CvBitEditor
                                            value={value}
                                            onChange={setValue}
                                            {...(cvDefinition?.bits ? { bits: cvDefinition.bits } : {})}
                                        />
                                    </Card>
                                )}

                                <Group grow>
                                    <Button
                                        variant="light"
                                        leftSection={<IconDownload size={16} />}
                                        onClick={readCv}
                                    >
                                        {t("programmer.readCv")}
                                    </Button>

                                    <Button leftSection={<IconUpload size={16} />} onClick={writeCv}>
                                        {t("programmer.writeCv")}
                                    </Button>
                                </Group>
                            </Stack>

                            <CvHelpPanel
                                cv={typeof cv === "number" ? cv : null}
                                definition={cvDefinition}
                                error={cvDatabaseError}
                            />
                        </SimpleGrid>
                    </Stack>
                </Card>
                <Card withBorder radius="md" p="md">
                    <Stack gap="sm">
                        <Group justify="space-between">
                            <Title order={5}>{t("programmer.logTitle")}</Title>

                        </Group>

                        <Textarea
                            value={log.map((item) => `${item.time}  ${item.text}`).join("\n")}
                            readOnly
                            autosize
                            minRows={18}
                            maxRows={30}
                            styles={{
                                input: {
                                    fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    fontSize: 12,
                                },
                            }}
                        />
                    </Stack>
                </Card>
            </SimpleGrid>
        </Stack>
    );
}

function toNumberOrEmpty(value: string | number): number | "" {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : "";
    }

    if (value.trim() === "") {
        return "";
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : "";
}

type CvHelpPanelProps = {
    cv: number | null;
    definition: CvDefinition | undefined;
    error?: string | null | undefined;
};

function CvHelpPanel({ cv, definition, error }: CvHelpPanelProps) {
    const { t } = useTranslation();

    if (error) {
        return (
            <Card withBorder radius="md" p="sm">
                <Stack gap="xs">
                    <Text size="sm" fw={700}>
                        {t("programmer.help.title")}
                    </Text>

                    <Badge color="red" variant="light">
                        {t("programmer.help.databaseError")}
                    </Badge>

                    <Text size="xs" c="red">
                        {error}
                    </Text>
                </Stack>
            </Card>
        );
    }

    if (cv === null) {
        return (

            <Card withBorder radius="md" p="sm">
                <Text size="sm" fw={700}>
                    {t("programmer.help.title")}
                </Text>

                <Text size="xs" c="dimmed">
                    {t("programmer.help.empty")}
                </Text>
            </Card>
        );
    }

    if (!definition) {
        return (
            <Card withBorder radius="md" p="sm">
                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text size="sm" fw={700}>
                            CV {cv}
                        </Text>

                        <Badge color="gray" variant="light">
                            {t("programmer.help.unknown")}
                        </Badge>
                    </Group>

                    <Text size="xs" c="dimmed">
                        {t("programmer.help.unknownDescription")}
                    </Text>
                </Stack>
            </Card>
        );
    }

    return (
        <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
                <Group justify="space-between" align="flex-start">
                    <Box>
                        <Text size="sm" fw={700}>
                            CV {definition.cv}: {definition.name}
                        </Text>

                        <Text size="xs" c="dimmed">
                            {definition.description}
                        </Text>
                    </Box>

                    <Badge color="blue" variant="light">
                        {t("programmer.help.known")}
                    </Badge>
                </Group>

                <Divider />

                <Group gap="xs">
                    <InfoBadge label={t("programmer.help.min")} value={definition.min ?? "-"} />
                    <InfoBadge label={t("programmer.help.max")} value={definition.max ?? "-"} />
                    <InfoBadge label={t("programmer.help.default")} value={definition.defaultValue ?? "-"} />
                </Group>

                {definition.bits && definition.bits.length > 0 && (
                    <>
                        <Divider />

                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">
                                {t("programmer.help.bits")}
                            </Text>

                            {definition.bits.map((bit) => (
                                <Group key={bit.bit} gap="xs" wrap="nowrap" align="flex-start">
                                    <Badge size="xs" variant="filled">
                                        {bit.bit}
                                    </Badge>

                                    <Box>
                                        <Text size="xs" fw={600}>
                                            {bit.label}
                                        </Text>

                                        {bit.description && (
                                            <Text size="xs" c="dimmed">
                                                {bit.description}
                                            </Text>
                                        )}
                                    </Box>
                                </Group>
                            ))}
                        </Stack>
                    </>
                )}

                {definition.notes && definition.notes.length > 0 && (
                    <>
                        <Divider />

                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">
                                {t("programmer.help.notes")}
                            </Text>

                            {definition.notes.map((note, index) => (
                                <Text key={index} size="xs" c="dimmed">
                                    • {note}
                                </Text>
                            ))}
                        </Stack>
                    </>
                )}
            </Stack>
        </Card>
    );
}

function InfoBadge({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <Badge variant="light" color="gray">
            {label}: {value}
        </Badge>
    );
}

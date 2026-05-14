import { Button, Card, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconTrash, IconTrashFilled, IconX } from "@tabler/icons-react";

import LocoImage from "./LocoImage";
import { Loco } from "../../../../common/src/types";

type LocoPickerProps = {
    opened: boolean;
    locos: Loco[];
    selectedLocoId?: string | undefined;
    title?: string | undefined;
    onClose: () => void;
    onRemoveLoco?: (loco: Loco) => void;
    onRemoveAllLoco?: () => void;
    onSelect: (loco: Loco) => void;
};

export default function LocoPicker({
    opened,
    locos,
    selectedLocoId,
    title = "Mozdony választó",
    onClose,
    onSelect,
    onRemoveLoco,
    onRemoveAllLoco,
}: LocoPickerProps) {
    if (!opened) return null;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: 12,
            }}
            onMouseDown={onClose}
        >

            <Card
                withBorder
                radius="sm"
                p="md"
                style={{
                    width: "100%",
                    maxWidth: 360,
                    height: "70vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Group justify="space-between" mb="sm" style={{ flexShrink: 0 }}>
                    {/* <Text fw={700}>{title}</Text> */}

                    {onRemoveLoco && (
                        <Button
                            size="xs"
                            variant="light" 
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={onRemoveLoco.bind(null, locos.find((l) => l.id === selectedLocoId)!)}
                        >
                            Remove
                        </Button>)}
                    {onRemoveAllLoco && (
                        <Button
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<IconTrashFilled size={14} />}
                            onClick={onRemoveAllLoco}
                        >
                            RemoveAll
                        </Button>)}
                    <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<IconX size={14} />}
                        onClick={onClose}
                    >
                        Bezárás
                    </Button>
                </Group>

                <ScrollArea
                    type="hover"
                    style={{
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Stack gap="sm">
                        {locos.map((loco) => (
                            <Card
                                key={loco.id}
                                withBorder
                                radius="sm"
                                p="sm"
                                style={{
                                    cursor: "pointer",
                                    borderColor:
                                        loco.id === selectedLocoId
                                            ? "var(--mantine-color-blue-5)"
                                            : undefined,
                                }}
                                onClick={() => onSelect(loco)}
                            >
                                <Group wrap="nowrap">
                                    <LocoImage
                                        image={loco.image}
                                        name={loco.name}
                                        width={120}
                                        height={60}
                                    />

                                    <div>
                                        <Text fw={600}>{loco.name || "Névtelen mozdony"}</Text>
                                        <Text size="sm" c="dimmed">
                                            DCC cím: {loco.address}
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            Max seb.: {loco.maxSpeed}
                                        </Text>
                                    </div>
                                </Group>
                            </Card>
                        ))}

                        {locos.length === 0 && (
                            <Text size="sm" c="dimmed">
                                Nincs választható mozdony.
                            </Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Card>
        </div>
    );
}
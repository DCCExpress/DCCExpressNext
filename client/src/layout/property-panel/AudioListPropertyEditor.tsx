import {
  type DragEvent,
  useState,
} from "react";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconFolderOpen,
  IconGripVertical,
  IconPlayerPlayFilled,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import type { AudioListButtonItemDto } from "../../../../common/src/layout/layoutDto";
import { generateId } from "../../helpers";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import { AudioListButtonElementView } from "../../models/editor/elements/AudioListButtonElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import type { SelectedElementUpdateHandler } from "./propertyPanelTypes";

type AudioListPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  onUpdateSelectedElement: SelectedElementUpdateHandler;
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length) {
    return items;
  }

  const boundedToIndex = Math.max(0, Math.min(toIndex, items.length - 1));

  if (fromIndex === boundedToIndex) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);

  if (!moved) {
    return items;
  }

  nextItems.splice(boundedToIndex, 0, moved);
  return nextItems;
}

export default function AudioListPropertyEditor({
  prop,
  selectedElement,
  onUpdateSelectedElement,
}: AudioListPropertyEditorProps) {
  const [opened, setOpened] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  if (!(selectedElement instanceof AudioListButtonElementView)) {
    return null;
  }

  const items = selectedElement.audioItems;

  const updateItems = (nextItems: AudioListButtonItemDto[]) => {
    selectedElement.audioItems = nextItems;
    onUpdateSelectedElement(selectedElement);
  };

  const updateItem = (
    itemId: string,
    patch: Partial<AudioListButtonItemDto>
  ) => {
    updateItems(
      items.map(item =>
        item.id === itemId
          ? { ...item, ...patch }
          : item
      )
    );
  };

  const addItem = () => {
    updateItems([
      ...items,
      {
        id: generateId(),
        name: "Audio",
        fileName: "",
      },
    ]);
  };

  const removeItem = (itemId: string) => {
    updateItems(
      items.filter(item => item.id !== itemId)
    );

    if (draggedItemId === itemId) {
      setDraggedItemId(null);
    }
  };

  const moveDraggedItemToIndex = (targetIndex: number): void => {
    if (!draggedItemId) {
      return;
    }

    const fromIndex = items.findIndex(item => item.id === draggedItemId);
    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, items.length - 1));

    if (fromIndex < 0 || fromIndex === boundedTargetIndex) {
      return;
    }

    updateItems(moveItem(items, fromIndex, boundedTargetIndex));
  };

  const handleDragStart = (
    event: DragEvent<HTMLTableRowElement>,
    itemId: string
  ): void => {
    setDraggedItemId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragEnd = (): void => {
    setDraggedItemId(null);
  };

  return (
    <>
      <Group justify="space-between" align="center">
        <div>
          <Text size="sm" fw={500}>{prop.label}</Text>
          <Text size="xs" c="dimmed">
            {items.length} audio item{items.length === 1 ? "" : "s"}
          </Text>
        </div>

        <Button size="xs" onClick={() => setOpened(true)}>
          Edit list
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Audio list"
        size="lg"
        centered
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
              Add the display name and audio file for each popup row. Drag rows by the grip to set the runtime order.
            </Text>

            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={addItem}
            >
              Add audio
            </Button>
          </Group>

          {items.length === 0 ? (
            <Card withBorder p="md">
              <Text size="sm" c="dimmed">
                No audio rows yet.
              </Text>
            </Card>
          ) : (
            <ScrollArea.Autosize mah="min(560px, calc(100vh - 280px))" type="auto" offsetScrollbars>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 78 }}>Order</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>File</Table.Th>
                    <Table.Th style={{ width: 112 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, index) => (
                    <Table.Tr
                      key={item.id}
                      draggable
                      onDragStart={event => handleDragStart(event, item.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={event => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";

                        if (draggedItemId && draggedItemId !== item.id) {
                          moveDraggedItemToIndex(index);
                        }
                      }}
                      style={{
                        opacity: draggedItemId === item.id ? 0.35 : 1,
                        transition: "opacity 120ms ease, background-color 120ms ease",
                        cursor: "grab",
                      }}
                    >
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            title="Drag to reorder"
                            style={{ cursor: "grab", touchAction: "none" }}
                          >
                            <IconGripVertical size={16} />
                          </ActionIcon>

                          <Badge
                            size="sm"
                            variant="filled"
                            color={draggedItemId === item.id ? "orange" : "blue"}
                            miw={draggedItemId === item.id ? 48 : 30}
                            ta="center"
                          >
                            {draggedItemId === item.id ? `→ #${index + 1}` : `#${index + 1}`}
                          </Badge>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          size="xs"
                          value={item.name}
                          onChange={event =>
                            updateItem(item.id, { name: event.target.value })
                          }
                          onMouseDown={event => event.stopPropagation()}
                          onPointerDown={event => event.stopPropagation()}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          size="xs"
                          value={item.fileName}
                          onChange={event =>
                            updateItem(item.id, { fileName: event.target.value })
                          }
                          onMouseDown={event => event.stopPropagation()}
                          onPointerDown={event => event.stopPropagation()}
                          rightSection={
                            <FileButton
                              onChange={file => {
                                if (file) {
                                  updateItem(item.id, { fileName: file.name });
                                }
                              }}
                              accept="audio/*"
                            >
                              {fileButtonProps => (
                                <ActionIcon
                                  {...fileButtonProps}
                                  size="sm"
                                  variant="subtle"
                                  title="Choose audio file"
                                  onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    fileButtonProps.onClick?.();
                                  }}
                                >
                                  <IconFolderOpen size={16} />
                                </ActionIcon>
                              )}
                            </FileButton>
                          }
                          rightSectionWidth={36}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            title="Test audio"
                            disabled={!item.fileName.trim()}
                            onClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              selectedElement.playItem(item, () => {
                                onUpdateSelectedElement(selectedElement);
                              });
                            }}
                          >
                            <IconPlayerPlayFilled size={16} />
                          </ActionIcon>

                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            title="Remove audio"
                            onClick={() => removeItem(item.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}

                  {draggedItemId && items.length > 0 && (
                    <Table.Tr
                      onDragOver={event => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        moveDraggedItemToIndex(items.length);
                      }}
                      style={{ opacity: 0.55 }}
                    >
                      <Table.Td colSpan={4}>
                        <Text size="sm" c="dimmed" ta="center">
                          Move to end
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          )}
        </Stack>
      </Modal>
    </>
  );
}

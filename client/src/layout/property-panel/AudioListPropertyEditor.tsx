import {
  ActionIcon,
  Button,
  FileButton,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconFolderOpen,
  IconPlayerPlayFilled,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

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

export default function AudioListPropertyEditor({
  prop,
  selectedElement,
  onUpdateSelectedElement,
}: AudioListPropertyEditorProps) {
  const [opened, setOpened] = useState(false);

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
  };

  const moveItem = (itemId: string, direction: -1 | 1) => {
    const fromIndex = items.findIndex(item => item.id === itemId);

    if (fromIndex < 0) {
      return;
    }

    const toIndex = fromIndex + direction;

    if (toIndex < 0 || toIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(fromIndex, 1);

    if (!moved) {
      return;
    }

    nextItems.splice(toIndex, 0, moved);
    updateItems(nextItems);
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
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Add the display name and audio file for each popup row. Use the arrows to set the runtime order.
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
            <Text size="sm" c="dimmed">
              No audio rows yet.
            </Text>
          ) : (
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
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => moveItem(item.id, -1)}
                        >
                          <IconArrowUp size={16} />
                        </ActionIcon>

                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          title="Move down"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(item.id, 1)}
                        >
                          <IconArrowDown size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        value={item.name}
                        onChange={event =>
                          updateItem(item.id, { name: event.target.value })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        value={item.fileName}
                        onChange={event =>
                          updateItem(item.id, { fileName: event.target.value })
                        }
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
                          onClick={() =>
                            selectedElement.playItem(item, () => {
                              onUpdateSelectedElement(selectedElement);
                            })
                          }
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
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Modal>
    </>
  );
}

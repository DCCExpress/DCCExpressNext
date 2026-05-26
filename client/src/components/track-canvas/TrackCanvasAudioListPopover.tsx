import {
  ActionIcon,
  Box,
  Group,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";

import type {
  AudioListPopoverState,
} from "./TrackCanvas.types";

export type TrackCanvasAudioListPopoverProps = {
  state: AudioListPopoverState;
  onClose: () => void;
  onPlay: () => void;
};

export function TrackCanvasAudioListPopover({
  state,
  onClose,
  onPlay,
}: TrackCanvasAudioListPopoverProps) {
  const items = state.audioListButton?.audioItems ?? [];

  return (
    <Popover
      opened={state.opened}
      onChange={(opened) => {
        if (!opened) {
          onClose();
        }
      }}
      withArrow
      shadow="xl"
      closeOnClickOutside
      closeOnEscape
      withinPortal
      offset={18}
      transitionProps={{
        transition: "scale",
        duration: 200,
        timingFunction: "ease-out",
      }}
    >
      <Popover.Target>
        <Box
          p={4}
          style={{
            position: "fixed",
            left: state.x,
            top: state.y,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </Popover.Target>

      <Popover.Dropdown
        p="xs"
        miw={280}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {state.audioListButton?.label || "Audio list"}
          </Text>

          {items.length === 0 ? (
            <Text size="sm" c="dimmed">
              No audio rows configured.
            </Text>
          ) : (
            items.map(item => (
              <Group
                key={item.id}
                justify="space-between"
                gap="sm"
                wrap="nowrap"
                style={{
                  borderBottom: "1px solid var(--mantine-color-default-border)",
                  paddingBottom: 6,
                }}
              >
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={500} truncate>
                    {item.name || "Audio"}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {item.fileName || "No file selected"}
                  </Text>
                </Box>

                <ActionIcon
                  variant={state.audioListButton?.isItemActive(item) ? "filled" : "light"}
                  title="Play audio"
                  onClick={() => {
                    state.audioListButton?.playItem(item, onPlay);
                  }}
                >
                  <IconPlayerPlayFilled size={16} />
                </ActionIcon>
              </Group>
            ))
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

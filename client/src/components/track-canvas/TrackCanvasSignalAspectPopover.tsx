// client/src/components/track-canvas/TrackCanvasSignalAspectPopover.tsx

import {
  Box,
  Group,
  Popover,
  Stack,
} from "@mantine/core";

import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";

import type {
  SignalAspectPopoverState,
} from "./TrackCanvas.types";

export type TrackCanvasSignalAspectPopoverProps = {
  state: SignalAspectPopoverState;
  onClose: () => void;
};

export function TrackCanvasSignalAspectPopover({
  state,
  onClose,
}: TrackCanvasSignalAspectPopoverProps) {
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
      closeOnClickOutside={false}
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
        p={4}
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
          <Group gap={4}>
            <Box
              className="signal-aspect-button"
              onClick={() => {
                onClose();
                state.signal?.sendGreen();
              }}
            >
              <ElementPreview
                style={{ cursor: "pointer" }}
                element={state.previews?.green!}
                label="Green"
                width={40}
                height={40}
                translateX={-10}
              />
            </Box>

            <Box
              className="signal-aspect-button"
              onClick={() => {
                onClose();
                state.signal?.sendRed();
              }}
            >
              <ElementPreview
                element={state.previews?.red!}
                label="Red"
                width={40}
                height={40}
                translateX={-10}
              />
            </Box>

            {state.signal && state.signal.aspect > 2 && (
              <Box
                className="signal-aspect-button"
                onClick={() => {
                  onClose();
                  state.signal?.sendYellow();
                }}
              >
                <ElementPreview
                  element={state.previews?.yellow!}
                  label="Yellow"
                  width={40}
                  height={40}
                  translateX={-10}
                />
              </Box>
            )}

            {state.signal && state.signal.aspect > 3 && (
              <Box
                className="signal-aspect-button"
                onClick={() => {
                  onClose();
                  state.signal?.sendWhite();
                }}
              >
                <ElementPreview
                  element={state.previews?.white!}
                  label="White"
                  width={40}
                  height={40}
                  translateX={-10}
                />
              </Box>
            )}
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

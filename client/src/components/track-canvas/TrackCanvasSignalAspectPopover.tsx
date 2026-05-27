// client/src/components/track-canvas/TrackCanvasSignalAspectPopover.tsx

import {
  Box,
  Group,
  Popover,
  Stack,
} from "@mantine/core";
import {
  useEffect,
  useState,
} from "react";

import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";

import type {
  DoubleTurnoutPopoverState,
  SignalAspectPopoverState,
} from "./TrackCanvas.types";
import {
  TrackCanvasDoubleTurnoutPopover,
} from "./TrackCanvasDoubleTurnoutPopover";
import {
  TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_CLOSE_EVENT,
  TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_OPEN_EVENT,
  type TrackCanvasDoubleTurnoutPopoverOpenDetail,
} from "./trackCanvasDoubleTurnoutPopoverEvents";

export type TrackCanvasSignalAspectPopoverProps = {
  state: SignalAspectPopoverState;
  onClose: () => void;
};

function TrackCanvasDoubleTurnoutPopoverHost() {
  const [state, setState] =
    useState<DoubleTurnoutPopoverState>({
      opened: false,
      x: 0,
      y: 0,
      turnout: null,
    });

  const close = () => {
    setState(previous => ({
      ...previous,
      opened: false,
      turnout: null,
    }));
  };

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<TrackCanvasDoubleTurnoutPopoverOpenDetail>;

      setState({
        opened: true,
        x: customEvent.detail.clientX,
        y: customEvent.detail.clientY,
        turnout: customEvent.detail.turnout,
      });
    };

    window.addEventListener(
      TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_OPEN_EVENT,
      handleOpen
    );

    window.addEventListener(
      TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_CLOSE_EVENT,
      close
    );

    return () => {
      window.removeEventListener(
        TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_OPEN_EVENT,
        handleOpen
      );

      window.removeEventListener(
        TRACK_CANVAS_DOUBLE_TURNOUT_POPOVER_CLOSE_EVENT,
        close
      );
    };
  }, []);

  return (
    <TrackCanvasDoubleTurnoutPopover
      state={state}
      onClose={close}
    />
  );
}

export function TrackCanvasSignalAspectPopover({
  state,
  onClose,
}: TrackCanvasSignalAspectPopoverProps) {
  return (
    <>
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

      <TrackCanvasDoubleTurnoutPopoverHost />
    </>
  );
}

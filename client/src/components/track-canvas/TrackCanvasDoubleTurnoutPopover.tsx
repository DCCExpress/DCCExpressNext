// client/src/components/track-canvas/TrackCanvasDoubleTurnoutPopover.tsx

import {
  Box,
  Group,
  Popover,
  Stack,
} from "@mantine/core";

import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";
import { wsApi } from "../../services/wsApi";

import type {
  DoubleTurnoutPopoverState,
} from "./TrackCanvas.types";

type DoubleTurnoutPosition = {
  label: string;
  firstClosed: boolean;
  secondClosed: boolean;
};

const DOUBLE_TURNOUT_POSITIONS: DoubleTurnoutPosition[] = [
  {
    label: "O-O",
    firstClosed: false,
    secondClosed: false,
  },
  {
    label: "O-C",
    firstClosed: false,
    secondClosed: true,
  },
  {
    label: "C-O",
    firstClosed: true,
    secondClosed: false,
  },
  {
    label: "C-C",
    firstClosed: true,
    secondClosed: true,
  },
];

export type TrackCanvasDoubleTurnoutPopoverProps = {
  state: DoubleTurnoutPopoverState;
  onClose: () => void;
};

function getPhysicalValueForLogicalState(
  closedValue: boolean,
  logicalClosed: boolean
): boolean {
  return logicalClosed
    ? closedValue
    : !closedValue;
}

function createDoubleTurnoutPreview(
  selectedElement: TrackTurnoutDoubleElementView,
  firstClosed: boolean,
  secondClosed: boolean
): TrackTurnoutDoubleElementView {
  const turnout = new TrackTurnoutDoubleElementView(0, 0);

  turnout.rotation = selectedElement.rotation;
  turnout.turnout1Address = selectedElement.turnout1Address;
  turnout.turnout2Address = selectedElement.turnout2Address;
  turnout.turnout1ClosedValue = selectedElement.turnout1ClosedValue;
  turnout.turnout2ClosedValue = selectedElement.turnout2ClosedValue;

  turnout.turnout1Closed = getPhysicalValueForLogicalState(
    turnout.turnout1ClosedValue,
    firstClosed
  );

  turnout.turnout2Closed = getPhysicalValueForLogicalState(
    turnout.turnout2ClosedValue,
    secondClosed
  );

  return turnout;
}

function setDoubleTurnoutPosition(
  turnout: TrackTurnoutDoubleElementView,
  position: DoubleTurnoutPosition
): void {
  wsApi.setTurnout(
    turnout.turnout1Address,
    getPhysicalValueForLogicalState(
      turnout.turnout1ClosedValue,
      position.firstClosed
    )
  );

  wsApi.setTurnout(
    turnout.turnout2Address,
    getPhysicalValueForLogicalState(
      turnout.turnout2ClosedValue,
      position.secondClosed
    )
  );
}

export function TrackCanvasDoubleTurnoutPopover({
  state,
  onClose,
}: TrackCanvasDoubleTurnoutPopoverProps) {
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
            {state.turnout && DOUBLE_TURNOUT_POSITIONS.map(position => (
              <Box
                key={position.label}
                className="signal-aspect-button"
                onClick={() => {
                  if (!state.turnout) {
                    return;
                  }

                  onClose();
                  setDoubleTurnoutPosition(
                    state.turnout,
                    position
                  );
                }}
              >
                <ElementPreview
                  style={{ cursor: "pointer" }}
                  element={createDoubleTurnoutPreview(
                    state.turnout,
                    position.firstClosed,
                    position.secondClosed
                  )}
                  label={position.label}
                  width={40}
                  height={40}
                />
              </Box>
            ))}
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

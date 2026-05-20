import { Card, Group, Modal, Stack } from "@mantine/core";

import ElementPreview from "../../models/editor/rendering/ElementPreviewRenderer";
import { TrackStraightElementView } from "../../models/editor/elements/TrackStraightElementView";
import { TrackEndElementView } from "../../models/editor/elements/TrackEndElementView";
import { TrackCornerElementView } from "../../models/editor/elements/TrackCornerElementView";
import { TrackCurveElementView } from "../../models/editor/elements/TrackCurveElementView";
import { TrackTurnoutLeftElementView } from "../../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../../models/editor/elements/TrackTurnoutRightElementView";
import { TrackTurnoutTwoWayElementView } from "../../models/editor/elements/TrackTurnoutTwoWayElementView";
import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";
import { TrackSensorElementView } from "../../models/editor/elements/TrackSensorElementView";
import { ButtonElementView } from "../../models/editor/elements/ButtonElementView";
import { ClockElementView } from "../../models/editor/elements/ClockElementView";
import { TreeElementView } from "../../models/editor/elements/TreeElementView";
import { BlockElementView } from "../../models/editor/elements/BlockElementView";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import { AudioButtonElementView } from "../../models/editor/elements/AudioButtonElementView";
import { RouteButtonElementView } from "../../models/editor/elements/RouteButtonElementView";
import { TrackCrossingElementView } from "../../models/editor/elements/TrackCrossingElementView";
import { ButtonScriptElementView } from "../../models/editor/elements/ButtonScriptElementView";
import { LabelElementView } from "../../models/editor/elements/LabelElementView";
import { TrackDirectionElementView } from "../../models/editor/elements/TrackDirectionElementView";
import { ExtendedRouteButtonElementView } from "../../models/editor/elements/ExtendedRouteButtonElementView";
import { ELEMENT_TYPES, ElementType } from "../../../../common/src/layout/elementTypes";

type ElementPickerDialogProps = {
  opened: boolean;
  onClose: () => void;
  onPick: (elementType: ElementType) => void;
};

export default function ElementPickerDialog({
  opened,
  onClose,
  onPick,
}: ElementPickerDialogProps) {


  const track = new TrackStraightElementView(0, 0);
  const trackdirection = new TrackDirectionElementView(0, 0);
  const trackend = new TrackEndElementView(0, 0);
  const trackcorner = new TrackCornerElementView(0, 0);
  const trackcurve = new TrackCurveElementView(0, 0);
  const trackcrossing = new TrackCrossingElementView(0, 0);
  const trackturnoutleft = new TrackTurnoutLeftElementView(0, 0);
  const trackturnoutright = new TrackTurnoutRightElementView(0, 0);
  const trackturnouttwoway = new TrackTurnoutTwoWayElementView(0, 0);
  const trackturnoutdouble = new TrackTurnoutDoubleElementView(0, 0);
  const tracksensor = new TrackSensorElementView(0, 0);
  const button = new ButtonElementView(0, 0);
  const buttonscript = new ButtonScriptElementView(0, 0);
  const audiobutton = new AudioButtonElementView(0, 0);
  const routebutton = new RouteButtonElementView(0, 0);
  const extendedroutebutton = new ExtendedRouteButtonElementView(0, 0);
  const label = new LabelElementView(0, 0);
  const clock = new ClockElementView(0, 0);
  clock.scale = 0.28
  const tree = new TreeElementView(0, 0);
  const block = new BlockElementView(0, 0);
  const signal2 = new TrackSignalElementView(0, 0);
  signal2.aspect = 2;

  const signal3 = new TrackSignalElementView(0, 0);
  signal3.aspect = 3;
  const signal4 = new TrackSignalElementView(0, 0);
  signal4.aspect = 4;

  return (
    <Modal size={"xl"} opened={opened} onClose={onClose} title="Elem kiválasztása" centered>

      <Stack p={2} gap="xs">
        <Card padding="xs" withBorder >
          <Group>
            <ElementPreview element={trackdirection} label="Direction" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_DIRECTION);
              onClose();
            }} />
            <ElementPreview element={track} label="Straight" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_STRAIGHT);
              onClose();
            }} />
            <ElementPreview element={trackend} label="Track End" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_END);
              onClose();
            }} />
            <ElementPreview element={trackcorner} label="Corner" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_CORNER);
              onClose();
            }} />
            <ElementPreview element={trackcurve} label="Curve" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_CURVE);
              onClose();
            }} />
            <ElementPreview element={trackcrossing} label="Crossing" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_CROSSING);
              onClose();
            }} />
          </Group>
        </Card>

        <Card padding="xs" withBorder>
          <Group>
            <ElementPreview element={trackturnoutleft} label="Turnout Left" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_LEFT);
              onClose();
            }} />
            <ElementPreview element={trackturnoutright} label="Turnout Right" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_RIGHT);
              onClose();
            }} />

            <ElementPreview element={trackturnouttwoway} label="Turnout Y" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY);
              onClose();
            }} />

            <ElementPreview element={trackturnoutdouble} label="Turnout Double" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE);
              onClose();
            }} />
          </Group>
        </Card>

        <Card padding="xs" withBorder >
          <Group>
            <ElementPreview element={signal2} label="Signal 2" width={40} height={40} translateX={-10} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SIGNAL2);
              onClose();
            }} />
            <ElementPreview element={signal3} label="Signal 3" width={40} height={40} translateX={-10} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SIGNAL3);
              onClose();
            }} />
            <ElementPreview element={signal4} label="Signal 4" width={40} height={40} translateX={-10} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SIGNAL4);
              onClose();
            }} />
          </Group>
        </Card>

        <Card padding="xs" withBorder >
          <Group>
            <ElementPreview element={tracksensor} label="Sensor" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SENSOR);
              onClose();
            }} />
            <ElementPreview element={label} label="Label" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.LABEL);
              onClose();
            }} />
            <ElementPreview element={button} label="Button" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON);
              onClose();
            }} />
            <ElementPreview element={buttonscript} label="Script Button" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON_SCRIPT);
              onClose();
            }} />
            <ElementPreview element={routebutton} label="Route" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON_ROUTE);
              onClose();
            }} />
            <ElementPreview
              element={extendedroutebutton}
              label="Auto Route"
              width={40}
              height={40}
              onClick={() => {
                onPick(ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED);
                onClose();
              }}
            />
            <ElementPreview element={audiobutton} label="Audio" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON_AUDIO);
              onClose();
            }} />
            <ElementPreview element={clock} scale={1} label="Clock" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.CLOCK);
              onClose();
            }} />
            <ElementPreview element={block} label="Block" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_BLOCK);
              onClose();
            }} />
            <ElementPreview element={tree} label="Tree" width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TREE);
              onClose();
            }} />
          </Group>
        </Card>

      </Stack>
    </Modal>
  );
}
import { Card, Group, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

import AppModal from "../common/AppModal";
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
import { AudioListButtonElementView } from "../../models/editor/elements/AudioListButtonElementView";
import { RouteButtonElementView } from "../../models/editor/elements/RouteButtonElementView";
import { TrackCrossingElementView } from "../../models/editor/elements/TrackCrossingElementView";
import { TrackLevelCrossingElementView } from "../../models/editor/elements/TrackLevelCrossingElementView";
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
  const { t } = useTranslation();

  const track = new TrackStraightElementView(0, 0);
  const tracklevelcrossing = new TrackLevelCrossingElementView(0, 0);
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
  const audiolistbutton = new AudioListButtonElementView(0, 0);
  const routebutton = new RouteButtonElementView(0, 0);
  const extendedroutebutton = new ExtendedRouteButtonElementView(0, 0);
  const label = new LabelElementView(0, 0);
  const clock = new ClockElementView(0, 0);
  clock.scale = 0.28;
  const tree = new TreeElementView(0, 0);
  const block = new BlockElementView(0, 0);
  const signal2 = new TrackSignalElementView(0, 0);
  signal2.aspect = 2;

  const signal3 = new TrackSignalElementView(0, 0);
  signal3.aspect = 3;
  const signal4 = new TrackSignalElementView(0, 0);
  signal4.aspect = 4;

  return (
    <AppModal
      size="xl"
      opened={opened}
      onClose={onClose}
      title={t("editor.pickElement")}
      centered
      draggable
    >
      <Stack p={2} gap="xs">
        <Card padding="xs" withBorder>
          <Group>
            <ElementPreview element={trackdirection} label={t("editor.elements.direction")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_DIRECTION);
              onClose();
            }} />
            <ElementPreview element={track} label={t("editor.elements.straight")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_STRAIGHT);
              onClose();
            }} />
            <ElementPreview element={tracklevelcrossing} label={t("editor.elements.levelCrossing")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_LEVEL_CROSSING);
              onClose();
            }} />
            <ElementPreview element={trackend} label={t("editor.elements.trackEnd")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_END);
              onClose();
            }} />
            <ElementPreview element={trackcorner} label={t("editor.elements.corner")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_CORNER);
              onClose();
            }} />
            <ElementPreview element={trackcurve} label={t("editor.elements.curve")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_CURVE);
              onClose();
            }} />
            <ElementPreview element={trackcrossing} label={t("editor.elements.crossing")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_CROSSING);
              onClose();
            }} />
          </Group>
        </Card>

        <Card padding="xs" withBorder>
          <Group>
            <ElementPreview element={trackturnoutleft} label={t("editor.elements.turnoutLeft")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_LEFT);
              onClose();
            }} />
            <ElementPreview element={trackturnoutright} label={t("editor.elements.turnoutRight")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_RIGHT);
              onClose();
            }} />

            <ElementPreview element={trackturnouttwoway} label={t("editor.elements.turnoutY")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY);
              onClose();
            }} />

            <ElementPreview element={trackturnoutdouble} label={t("editor.elements.turnoutDouble")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE);
              onClose();
            }} />
          </Group>
        </Card>

        <Card padding="xs" withBorder>
          <Group>
            <ElementPreview element={signal2} label={t("editor.elements.signal2")} width={40} height={40} translateX={-10} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SIGNAL2);
              onClose();
            }} />
            <ElementPreview element={signal3} label={t("editor.elements.signal3")} width={40} height={40} translateX={-10} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SIGNAL3);
              onClose();
            }} />
            <ElementPreview element={signal4} label={t("editor.elements.signal4")} width={40} height={40} translateX={-10} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SIGNAL4);
              onClose();
            }} />
          </Group>
        </Card>

        <Card padding="xs" withBorder>
          <Group>
            <ElementPreview element={tracksensor} label={t("editor.elements.sensor")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_SENSOR);
              onClose();
            }} />
            <ElementPreview element={label} label={t("editor.elements.label")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.LABEL);
              onClose();
            }} />
            <ElementPreview element={button} label={t("editor.elements.button")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON);
              onClose();
            }} />
            <ElementPreview element={buttonscript} label={t("editor.elements.scriptButton")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON_SCRIPT);
              onClose();
            }} />
            <ElementPreview element={routebutton} label={t("editor.elements.route")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON_ROUTE);
              onClose();
            }} />
            <ElementPreview
              element={extendedroutebutton}
              label={t("editor.elements.autoRoute")}
              width={40}
              height={40}
              onClick={() => {
                onPick(ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED);
                onClose();
              }}
            />
            <ElementPreview element={audiobutton} label={t("editor.elements.audio")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON_AUDIO);
              onClose();
            }} />
            <ElementPreview element={audiolistbutton} label={t("editor.elements.audioList")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.BUTTON_AUDIO_LIST);
              onClose();
            }} />
            <ElementPreview element={clock} scale={1} label={t("editor.elements.clock")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.CLOCK);
              onClose();
            }} />
            <ElementPreview element={block} label={t("editor.elements.block")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TRACK_BLOCK);
              onClose();
            }} />
            <ElementPreview element={tree} label={t("editor.elements.tree")} width={40} height={40} onClick={() => {
              onPick(ELEMENT_TYPES.TREE);
              onClose();
            }} />
          </Group>
        </Card>
      </Stack>
    </AppModal>
  );
}

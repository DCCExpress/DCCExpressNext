import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  EditorTool,
} from "../../../models/editor/types/EditorTypes";
import type { BaseElementView } from "../../../models/editor/core/BaseElementView";
import type { LayoutView } from "../../../models/editor/core/LayoutView";
import type { BlockElementView } from "../../../models/editor/elements/BlockElementView";

import AppSettingsDialog from "../../../components/app-settings/AppSettingsDialog";
import BlockActionsManagerDialog from "../../../components/block-actions/BlockActionsManagerDialog";
import ElementPickerDialog from "../../../components/editor/ElementPickerDialog";
import FullscreenLoader from "../../../components/FullscreenLoader";
import LocoDialog from "../../../components/LocoDialog";
import SignalLogicDialog from "../../../components/signal-logic/SignalLogicDialog";

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

type EditorToolSetter =
  Dispatch<SetStateAction<EditorTool>>;

type LayoutPageDialogsProps = {
  canvasBusy: boolean;
  canvasBusyText: string;

  locoDialogOpened: boolean;
  setLocoDialogOpened: BooleanSetter;
  onLocosSaved: () => Promise<void>;

  blockActionsDialogOpened: boolean;
  setBlockActionsDialogOpened: BooleanSetter;

  signalLogicDialogOpened: boolean;
  setSignalLogicDialogOpened: BooleanSetter;

  pickerOpened: boolean;
  setPickerOpened: BooleanSetter;

  appSettingsDialogOpened: boolean;
  setAppSettingsDialogOpened: BooleanSetter;

  layout: LayoutView;
  setTool: EditorToolSetter;
  onUpdateSelectedElement: (element: BaseElementView | null) => void;
};

export default function LayoutPageDialogs({
  canvasBusy,
  canvasBusyText,

  locoDialogOpened,
  setLocoDialogOpened,
  onLocosSaved,

  blockActionsDialogOpened,
  setBlockActionsDialogOpened,

  signalLogicDialogOpened,
  setSignalLogicDialogOpened,

  pickerOpened,
  setPickerOpened,

  appSettingsDialogOpened,
  setAppSettingsDialogOpened,

  layout,
  setTool,
  onUpdateSelectedElement,
}: LayoutPageDialogsProps) {
  return (
    <>
      <FullscreenLoader
        visible={canvasBusy}
        text={canvasBusyText}
      />

      <LocoDialog
        opened={locoDialogOpened}
        onClose={() =>
          setLocoDialogOpened(false)
        }
        onSaved={onLocosSaved}
      />

      <BlockActionsManagerDialog
        opened={blockActionsDialogOpened}
        onClose={() =>
          setBlockActionsDialogOpened(false)
        }
        layout={layout}
        onBlockUpdated={(block: BlockElementView) =>
          onUpdateSelectedElement(block)
        }
      />

      <SignalLogicDialog
        opened={signalLogicDialogOpened}
        onClose={() =>
          setSignalLogicDialogOpened(false)
        }
        layout={layout}
      />

      <ElementPickerDialog
        opened={pickerOpened}
        onClose={() =>
          setPickerOpened(false)
        }
        onPick={elementType => {
          setTool({
            mode: "draw",
            elementType,
          });
        }}
      />

      <AppSettingsDialog
        opened={appSettingsDialogOpened}
        onClose={() =>
          setAppSettingsDialogOpened(false)
        }
      />
    </>
  );
}

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  EditorTool,
} from "../../../models/editor/types/EditorTypes";

import AppSettingsDialog from "../../../components/app-settings/AppSettingsDialog";
import ElementPickerDialog from "../../../components/editor/ElementPickerDialog";
import FullscreenLoader from "../../../components/FullscreenLoader";
import LocoDialog from "../../../components/LocoDialog";

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

  pickerOpened: boolean;
  setPickerOpened: BooleanSetter;

  appSettingsDialogOpened: boolean;
  setAppSettingsDialogOpened: BooleanSetter;

  setTool: EditorToolSetter;
};

export default function LayoutPageDialogs({
  canvasBusy,
  canvasBusyText,

  locoDialogOpened,
  setLocoDialogOpened,
  onLocosSaved,

  pickerOpened,
  setPickerOpened,

  appSettingsDialogOpened,
  setAppSettingsDialogOpened,

  setTool,
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

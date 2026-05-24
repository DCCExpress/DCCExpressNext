import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  CommandCenter,
} from "../../../api/commandCentersApi";

import type {
  EditorTool,
} from "../../../models/editor/types/EditorTypes";

import AppSettingsDialog from "../../../components/app-settings/AppSettingsDialog";
import CommandCenterDialog from "../../../components/CommandCenterDialog";
import ElementPickerDialog from "../../../components/editor/ElementPickerDialog";
import FullscreenLoader from "../../../components/FullscreenLoader";
import LocoDialog from "../../../components/LocoDialog";
import SettingDialog from "../../../components/SettingsDialog";

type BooleanSetter =
  Dispatch<SetStateAction<boolean>>;

type EditorToolSetter =
  Dispatch<SetStateAction<EditorTool>>;

type LayoutPageDialogsProps = {
  canvasBusy: boolean;
  canvasBusyText: string;

  commandCenterOpened: boolean;
  setCommandCenterOpened: BooleanSetter;
  commandCenter: CommandCenter;
  onCommandCenterSaved: (
    commandCenter: CommandCenter
  ) => void;

  locoDialogOpened: boolean;
  setLocoDialogOpened: BooleanSetter;
  onLocosSaved: () => Promise<void>;

  pickerOpened: boolean;
  setPickerOpened: BooleanSetter;

  settingsDialogOpened: boolean;
  setSettingsDialogOpened: BooleanSetter;

  appSettingsDialogOpened: boolean;
  setAppSettingsDialogOpened: BooleanSetter;

  setTool: EditorToolSetter;
};

export default function LayoutPageDialogs({
  canvasBusy,
  canvasBusyText,

  commandCenterOpened,
  setCommandCenterOpened,
  commandCenter,
  onCommandCenterSaved,

  locoDialogOpened,
  setLocoDialogOpened,
  onLocosSaved,

  pickerOpened,
  setPickerOpened,

  settingsDialogOpened,
  setSettingsDialogOpened,

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

      <CommandCenterDialog
        opened={commandCenterOpened}
        onClose={() =>
          setCommandCenterOpened(false)
        }
        onSave={onCommandCenterSaved}
        commandCenter={commandCenter}
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

      <SettingDialog
        opened={settingsDialogOpened}
        onClose={() =>
          setSettingsDialogOpened(false)
        }
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
import {
  ActionIcon,
  Divider,
  Group,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBolt,
  IconEditFilled,
  IconMaximize,
  IconPointer,
  IconTopologyStar3,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { isTouchDevice } from "../../helpers";
import type { EditorTool } from "../../models/editor/types/EditorTypes";

type EditorToolbarProps = {
  editMode: boolean;
  onEditModeChange: (value: boolean) => void;
  tool: EditorTool;
  onCursorToolClick: () => void;
  onOpenElementPicker: () => void;
  onOpenAutomationFlow: () => void;
  automationDisabled: boolean;
  onDeleteToolClick: () => void;
  onFitLayout: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export default function EditorToolbar({
  editMode,
  onEditModeChange,
  tool,
  onCursorToolClick,
  onOpenElementPicker,
  onOpenAutomationFlow,
  automationDisabled,
  onDeleteToolClick,
  onFitLayout,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const touchOnly = isTouchDevice();

  return (
    <>
      <Tooltip label={t("editor.top.editMode")}>
        <ActionIcon
          variant={editMode ? "filled" : "light"}
          disabled={touchOnly}
          color="#7B2EDA"
          onClick={() => onEditModeChange(!editMode)}
          onMouseDown={event => event.preventDefault()}
        >
          <IconEditFilled size={18} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label={t("automation.dialog.title")}>
        <ActionIcon
          variant="light"
          color="violet"
          disabled={automationDisabled}
          onClick={onOpenAutomationFlow}
          onMouseDown={event => event.preventDefault()}
          aria-label={t("automation.dialog.title")}
        >
          <IconBolt size={18} />
        </ActionIcon>
      </Tooltip>

      <Divider orientation="vertical" size="sm" mr={4} ml={4} />

      <Tooltip label={t("editor.top.fitLayout")}>
        <ActionIcon
          variant="light"
          color="blue"
          onClick={onFitLayout}
          onMouseDown={event => event.preventDefault()}
          aria-label={t("editor.top.fitLayout")}
        >
          <IconMaximize size={18} />
        </ActionIcon>
      </Tooltip>

      {editMode && (
        <Group gap={6} wrap="nowrap">
          <Divider orientation="vertical" size="sm" mr={4} ml={4} />

          <Tooltip label={t("editor.top.cursorEsc")}>
            <ActionIcon
              variant={tool.mode === "cursor" ? "filled" : "light"}
              onClick={onCursorToolClick}
              onMouseDown={event => event.preventDefault()}
              aria-label={t("editor.top.cursorMode")}
            >
              <IconPointer size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("editor.top.elements")}>
            <ActionIcon
              variant={tool.mode === "draw" ? "filled" : "light"}
              onClick={onOpenElementPicker}
              onMouseDown={event => event.preventDefault()}
              aria-label={t("editor.top.element")}
            >
              <IconTopologyStar3 size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("editor.top.deleteDel")}>
            <ActionIcon
              variant={tool.mode === "delete" ? "filled" : "light"}
              onClick={onDeleteToolClick}
              onMouseDown={event => event.preventDefault()}
              aria-label={t("task.actions.delete")}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>

          <Divider orientation="vertical" size="sm" mr={4} ml={4} />

          <Tooltip label={t("editor.top.undo")}>
            <ActionIcon
              variant="light"
              onClick={onUndo}
              onMouseDown={event => event.preventDefault()}
              aria-label={t("editor.top.undoShort")}
              disabled={!canUndo}
            >
              <IconArrowBackUp size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("editor.top.redo")}>
            <ActionIcon
              variant="light"
              onClick={onRedo}
              onMouseDown={event => event.preventDefault()}
              aria-label={t("editor.top.redoShort")}
              disabled={!canRedo}
            >
              <IconArrowForwardUp size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
    </>
  );
}

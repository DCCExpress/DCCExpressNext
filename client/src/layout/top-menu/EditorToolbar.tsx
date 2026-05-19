import {
  ActionIcon,
  Divider,
  Group,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
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
      <Tooltip label="Edit mode (E)">
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

      <Divider orientation="vertical" size="sm" mr={4} ml={4} />

      <Tooltip label="Fit layout (F)">
        <ActionIcon
          variant="light"
          color="blue"
          onClick={onFitLayout}
          onMouseDown={event => event.preventDefault()}
          aria-label="Fit layout"
        >
          <IconMaximize size={18} />
        </ActionIcon>
      </Tooltip>

      {editMode && (
        <Group gap={6} wrap="nowrap">
          <Divider orientation="vertical" size="sm" mr={4} ml={4} />

          <Tooltip label="Cursor (Esc)">
            <ActionIcon
              variant={tool.mode === "cursor" ? "filled" : "light"}
              onClick={onCursorToolClick}
              onMouseDown={event => event.preventDefault()}
              aria-label="Cursor mode"
            >
              <IconPointer size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Elements">
            <ActionIcon
              variant={tool.mode === "draw" ? "filled" : "light"}
              onClick={onOpenElementPicker}
              onMouseDown={event => event.preventDefault()}
              aria-label="Element"
            >
              <IconTopologyStar3 size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("Delete (Del)")}>
            <ActionIcon
              variant={tool.mode === "delete" ? "filled" : "light"}
              onClick={onDeleteToolClick}
              onMouseDown={event => event.preventDefault()}
              aria-label={t("Delete")}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>

          <Divider orientation="vertical" size="sm" mr={4} ml={4} />

          <Tooltip label="Undo (Ctrl+Z)">
            <ActionIcon
              variant="light"
              onClick={onUndo}
              onMouseDown={event => event.preventDefault()}
              aria-label={t("Undo")}
              disabled={!canUndo}
            >
              <IconArrowBackUp size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Redo (Ctrl+Y / Ctrl+Shift+Z)">
            <ActionIcon
              variant="light"
              onClick={onRedo}
              onMouseDown={event => event.preventDefault()}
              aria-label="Redo"
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

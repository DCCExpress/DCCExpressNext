import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconPointer, IconShape } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { EditorTool } from "../../models/editor/types/EditorTypes";

type EditorToolbarProps = {
  tool: EditorTool;
  onCursorClick: () => void;
  onElementsClick: () => void;
};

export default function EditorToolbar({
  tool,
  onCursorClick,
  onElementsClick,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const isCursorActive = tool.mode === "cursor";
  const isDrawActive = tool.mode === "draw";

  return (
    <Group gap="xs">
      <Tooltip label={t("editor.cursorEsc")}>
        <ActionIcon
          size="lg"
          variant={isCursorActive ? "filled" : "light"}
          onClick={onCursorClick}
          aria-label={t("editor.cursorMode")}
        >
          <IconPointer size={18} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label={t("editor.pickElement")}>
        <ActionIcon
          size="lg"
          variant={isDrawActive ? "filled" : "light"}
          onClick={onElementsClick}
          aria-label={t("editor.pickElement")}
        >
          <IconShape size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import CollapsiblePanelCard from "../../components/common/CollapsiblePanelCard";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";

type PropertyPanelHelpProps = {
  selectedElement: BaseElementView | null;
};

const PROPERTY_PANEL_HELP_COLLAPSED_KEY =
  "dcc-express.property-panel.help.collapsed";

export default function PropertyPanelHelp({
  selectedElement,
}: PropertyPanelHelpProps) {
  const { t } = useTranslation();

  return (
    <div style={{ marginTop: 10, marginRight: 16 }}>
      <CollapsiblePanelCard
        title={
          <Group gap="xs" wrap="nowrap">
            <Text component="span">❓</Text>
            <Text size="sm" fw={700} component="span">
              {t("help.title")}
            </Text>
          </Group>
        }
        collapsedStorageKey={PROPERTY_PANEL_HELP_COLLAPSED_KEY}
        expandTooltip={t("common.expand", { defaultValue: "Expand" })}
        collapseTooltip={t("common.collapse", { defaultValue: "Collapse" })}
        cardPadding="xs"
        bodyGap="xs"
      >
        <div
          dangerouslySetInnerHTML={{
            __html: selectedElement
              ? selectedElement.getHelp()
              : t("help.general"),
          }}
        />
      </CollapsiblePanelCard>
    </div>
  );
}

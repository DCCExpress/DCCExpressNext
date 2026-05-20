import { Accordion, Group, Text, useMantineColorScheme } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { BaseElementView } from "../../models/editor/core/BaseElementView";

type PropertyPanelHelpProps = {
  selectedElement: BaseElementView | null;
};

export default function PropertyPanelHelp({
  selectedElement,
}: PropertyPanelHelpProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState<string | null>("help");
  const { colorScheme } = useMantineColorScheme();

  return (
    <Accordion
      value={opened}
      onChange={setOpened}
      mr={0}
      mt={10}
      chevronPosition="right"
      variant="contained"
    >
      <Accordion.Item value="help">
        <Accordion.Control
          style={theme => ({
            backgroundColor:
              colorScheme === "dark"
                ? theme.colors.dark[8]
                : theme.colors.gray[3],
          })}
        >
          <Group gap={0}>
            <Text>❓</Text>
            <Text>{t("help.title")}</Text>
          </Group>
        </Accordion.Control>

        <Accordion.Panel>
          <div
            dangerouslySetInnerHTML={{
              __html: selectedElement ? selectedElement.getHelp() : t("help.general"),
            }}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

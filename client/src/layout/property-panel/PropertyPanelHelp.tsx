import { Accordion, Group, Text, useMantineColorScheme } from "@mantine/core";
import { useState } from "react";

import type { BaseElementView } from "../../models/editor/core/BaseElementView";

type PropertyPanelHelpProps = {
  selectedElement: BaseElementView | null;
};

export default function PropertyPanelHelp({
  selectedElement,
}: PropertyPanelHelpProps) {
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
            <Text>Help</Text>
          </Group>
        </Accordion.Control>

        <Accordion.Panel>
          <div
            dangerouslySetInnerHTML={{
              __html: selectedElement ? selectedElement.getHelp() : "GENERAL HELP",
            }}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

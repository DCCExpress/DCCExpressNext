import {
  ScrollArea,
  Stack,
} from "@mantine/core";

import VisibilitySettings from "../VisibilitySettings";
export default function VisibilityTab() {
  return (
    <ScrollArea.Autosize
      mah="calc(100vh - 220px)"
      type="auto"
      offsetScrollbars
    >
      <Stack gap="xs">
        <VisibilitySettings />
      </Stack>
    </ScrollArea.Autosize>
  );
}

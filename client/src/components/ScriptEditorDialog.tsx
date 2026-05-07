import { useEffect, useState } from "react";
import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

type ScriptEditorDialogProps = {
  opened: boolean;
  title?: string;
  value: string;
  onClose: () => void;
  onSave: (script: string) => void;
};

export default function ScriptEditorDialog({
  opened,
  title = "Script editor",
  value,
  onClose,
  onSave,
}: ScriptEditorDialogProps) {
  const [code, setCode] = useState(value ?? "");
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (opened) {
      setCode(value ?? "");
    }
  }, [opened, value]);

  const handleSave = () => {
    onSave(code);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size="90vw"
      centered
      styles={{
        content: {
          height: "90vh",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        },
      }}
    >
      <Stack style={{ flex: 1, minHeight: 0 }}>
        <Text size="sm" c="dimmed">
          Itt írhatod a gombhoz tartozó DCCExpress scriptet.
        </Text>

        <div style={{ flex: 1, minHeight: 0, borderRadius: 8, overflow: "hidden" }}>
          <CodeMirror
            value={code}
            height="100%"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              autocompletion: true,
              bracketMatching: true,
              closeBrackets: true,
            }}
            extensions={[
              javascript({
                jsx: false,
                typescript: true,
              }),
            ]}
            theme={colorScheme === "dark" ? oneDark : "light"}
            onChange={(value) => setCode(value)}
          />
        </div>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
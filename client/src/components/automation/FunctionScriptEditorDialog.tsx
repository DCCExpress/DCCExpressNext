import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconMessageCode,
  IconWand,
} from "@tabler/icons-react";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import {
  defaultKeymap,
  indentLess,
  indentMore,
  toggleLineComment,
} from "@codemirror/commands";
import {
  EditorView,
  keymap,
} from "@codemirror/view";

import prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";

type FunctionScriptEditorDialogProps = {
  opened: boolean;
  title: string;
  value: string;
  onSave: (value: string) => void | Promise<void>;
  onClose: () => void;
};

async function formatFunctionBody(script: string): Promise<string> {
  const wrapped = `function __automation_function__(payload, inputs, node, context) {\n${script}\n}`;

  const formattedWrapped = await prettier.format(wrapped, {
    parser: "babel",
    plugins: [babelPlugin, estreePlugin],
    semi: true,
    singleQuote: false,
  });

  return formattedWrapped
    .replace(/^function __automation_function__\(payload, inputs, node, context\) \{\n/, "")
    .replace(/\n\}\s*$/, "");
}

export default function FunctionScriptEditorDialog({
  opened,
  title,
  value,
  onSave,
  onClose,
}: FunctionScriptEditorDialogProps) {
  const editorViewRef = useRef<EditorView | null>(null);
  const [code, setCode] = useState(value);
  const [saving, setSaving] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const cmTheme = colorScheme === "dark" ? "dark" : "light";

  useEffect(() => {
    if (!opened) {
      return;
    }

    setCode(value);
    setTimeout(() => {
      editorViewRef.current?.focus();
    }, 0);
  }, [opened, value]);

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      await onSave(code);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleFormatScript = async (): Promise<void> => {
    try {
      setCode(await formatFunctionBody(code));
    } catch (error) {
      console.error("Function script format error:", error);
    }
  };

  const handleToggleComment = (): void => {
    const view = editorViewRef.current;
    if (!view) {
      return;
    }

    toggleLineComment(view);
    view.focus();
  };

  const editorKeymap = keymap.of([
    ...defaultKeymap,
    {
      key: "Tab",
      run: indentMore,
    },
    {
      key: "Shift-Tab",
      run: indentLess,
    },
    {
      key: "Mod-/",
      run: toggleLineComment,
    },
    {
      key: "Shift-Alt-f",
      run: () => {
        void handleFormatScript();
        return true;
      },
    },
    {
      key: "Mod-s",
      run: () => {
        void handleSave();
        return true;
      },
    },
  ]);

  const stopEditorShortcuts = (event: React.KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === "s") {
      event.preventDefault();
      event.stopPropagation();
      void handleSave();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      closeOnEscape={false}
      closeOnClickOutside={false}
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
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <div
        onKeyDownCapture={stopEditorShortcuts}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          gap="xs"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Group justify="space-between" align="center" style={{ flexShrink: 0 }}>
            <Group gap={4}>
              <Tooltip label="Save function script">
                <ActionIcon
                  size="sm"
                  variant="light"
                  onClick={() => void handleSave()}
                  loading={saving}
                >
                  <IconDeviceFloppy size={16} />
                </ActionIcon>
              </Tooltip>

              <Divider orientation="vertical" />

              <Tooltip label="Format script">
                <ActionIcon
                  size="sm"
                  variant="light"
                  onClick={() => void handleFormatScript()}
                >
                  <IconWand size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Comment / uncomment">
                <ActionIcon
                  size="sm"
                  variant="light"
                  onClick={handleToggleComment}
                >
                  <IconMessageCode size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            Elérhető változók: payload, inputs, node, context. A return értéke lesz a kimenő payload, Boolean(return) pedig a logikai kimenet.
          </Text>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: 4,
            }}
          >
            <CodeMirror
              value={code}
              height="100%"
              theme={cmTheme}
              extensions={[
                javascript({
                  jsx: false,
                  typescript: false,
                }),
                editorKeymap,
              ]}
              onCreateEditor={(view) => {
                editorViewRef.current = view;
              }}
              onChange={setCode}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
              }}
              style={{
                height: "100%",
                fontSize: 14,
              }}
            />
          </div>

          <Group justify="space-between" style={{ flexShrink: 0 }}>
            <Text size="xs" c="dimmed">
              Shift+Alt+F: format · Ctrl+/: comment · Ctrl+S: save · Tab: indent
            </Text>
            <Group gap={6}>
              <Button
                size="xs"
                leftSection={<IconDeviceFloppy size={14} />}
                loading={saving}
                onClick={() => void handleSave()}
              >
                Save
              </Button>
              <Button variant="default" size="xs" onClick={onClose}>
                Close
              </Button>
            </Group>
          </Group>
        </Stack>
      </div>
    </Modal>
  );
}

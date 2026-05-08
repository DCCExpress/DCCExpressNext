import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Button,
  Checkbox,
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
  IconDownload,
  IconMessageCode,
  IconPlayerPlay,
  IconPlayerStop,
  IconReload,
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
import { EditorView, keymap } from "@codemirror/view";

import prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";

import { scriptEngine } from "../services/scriptEngine";
import { useScriptStatus } from "../hooks/useScriptStatus";

type ScriptEditorDialogProps = {
  opened: boolean;
  title?: string;
  onClose: () => void;
};

async function formatScriptBody(script: string): Promise<string> {
  const wrapped = `async function __script__() { \n${script} \n }`;

  const formattedWrapped = await prettier.format(wrapped, {
    parser: "babel",
    plugins: [babelPlugin, estreePlugin],
    semi: true,
    singleQuote: false,
  });

  return formattedWrapped
    .replace(/^async function __script__\(\) {\n/, "")
    .replace(/\n}\s*$/, "");
}

export default function ScriptEditorDialog({
  opened,
  title = "Script editor",
  onClose,
}: ScriptEditorDialogProps) {
  const editorViewRef = useRef<EditorView | null>(null);

  const [code, setCode] = useState(scriptEngine.getScript());
  const [loadingScript, setLoadingScript] = useState(false);
  const [savingScript, setSavingScript] = useState(false);

  const { colorScheme } = useMantineColorScheme();
  const { scriptState, stopScript } = useScriptStatus();

  const [scriptErrorOpened, setScriptErrorOpened] = useState(false);
  const [shownError, setShownError] = useState<string | null>(null);

  const [autoStart, setAutoStart] = useState(scriptEngine.getAutoStart());

  const scriptStatus = scriptState?.status ?? "idle";
  const scriptIsRunning =
    scriptStatus === "running" || scriptStatus === "stopping";

  const cmTheme = colorScheme === "dark" ? "dark" : "light";

  useEffect(() => {
    const unsubscribe = scriptEngine.subscribeScript((scriptDocument) => {
      setCode(scriptDocument.content);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!opened) return;

    setCode(scriptEngine.getScript());
    setAutoStart(scriptEngine.getAutoStart());
    setTimeout(() => {
      editorViewRef.current?.focus();
    }, 0);
  }, [opened]);

  const handleAutoStartChange = (checked: boolean) => {
    setAutoStart(checked);
    scriptEngine.setAutoStart(checked);
  };

  useEffect(() => {
    if (scriptState?.status !== "error") return;
    if (!scriptState.error) return;

    setShownError(scriptState.error);
    setScriptErrorOpened(true);
  }, [scriptState?.status, scriptState?.error]);

  const handleChange = (value: string) => {
    setCode(value);
    scriptEngine.setScript(value);
  };

  const handleLoadScript = async () => {
    try {
      setLoadingScript(true);
      await scriptEngine.loadScript();
    } catch (error) {
      console.error("Failed to load script:", error);
    } finally {
      setLoadingScript(false);
    }
  };

  const handleSaveScript = async () => {
    try {
      setSavingScript(true);
      scriptEngine.setScript(code);
      await scriptEngine.saveScript();
    } catch (error) {
      console.error("Failed to save script:", error);
    } finally {
      setSavingScript(false);
    }
  };

  const handleFormatScript = async () => {
    try {
      const formatted = await formatScriptBody(code);
      handleChange(formatted);
    } catch (error) {
      console.error("Script format error:", error);
    }
  };

  const handleToggleComment = () => {
    const view = editorViewRef.current;
    if (!view) return;

    toggleLineComment(view);
    view.focus();
  };


  const handleStartScript = () => {
    scriptEngine.setScript(code);

    scriptEngine.runCurrent({
      source: "control-panel",
    });
  };

  const handleStopScript = () => {
    stopScript();
  };

  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (ev: KeyboardEvent) => {
      const key = ev.key.toLowerCase();

      if ((ev.ctrlKey || ev.metaKey) && key === "s") {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();

        void handleSaveScript();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [opened, code]);

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
        void handleSaveScript();
        return true;
      },
    },
  ]);

  const stopEditorShortcuts = (ev: React.KeyboardEvent) => {
    const key = ev.key.toLowerCase();

    if ((ev.ctrlKey || ev.metaKey) && key === "s") {
      ev.preventDefault();
      ev.stopPropagation();

      void handleSaveScript();
    }
  };

  return (

    <>
      <Modal
        opened={scriptErrorOpened}
        onClose={() => setScriptErrorOpened(false)}
        title="Script error"
        centered
        size="lg"
        zIndex={10000}
      >
        <Stack gap="sm">
          <Text size="sm" c="red" fw={700}>
            The script stopped because of an error.
          </Text>

          <Text
            size="sm"
            style={{
              whiteSpace: "pre-wrap",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            {shownError}
          </Text>

          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => setScriptErrorOpened(false)}
            >
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>
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

                <Tooltip label="Load script">
                  <ActionIcon
                    size="sm"
                    variant="light"
                    onClick={handleLoadScript}
                    loading={loadingScript}
                  >
                    <IconReload size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Save script">
                  <ActionIcon
                    size="sm"
                    variant="light"
                    onClick={handleSaveScript}
                    loading={savingScript}
                  >
                    <IconDeviceFloppy size={16} />
                  </ActionIcon>
                </Tooltip>

                <Divider orientation="vertical" />

                <Tooltip label="Format script">
                  <ActionIcon
                    size="sm"
                    variant="light"
                    onClick={handleFormatScript}
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

                <Divider orientation="vertical" />

                <Checkbox
                  size="xs"
                  label="Auto start"
                  checked={autoStart}
                  onChange={(event) =>
                    handleAutoStartChange(event.currentTarget.checked)
                  }
                />
              </Group>

              {/* <Group gap={6}>
              <Text size="xs" c="dimmed">
                {scriptStatus}
              </Text>

            </Group> */}
            </Group>

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
                onChange={handleChange}
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
                  leftSection={<IconPlayerPlay size={14} />}
                  disabled={scriptIsRunning}
                  onClick={handleStartScript}
                >
                  Start
                </Button>

                <Button
                  size="xs"
                  color="red"
                  leftSection={<IconPlayerStop size={14} />}
                  disabled={scriptStatus !== "running"}
                  onClick={handleStopScript}
                >
                  Stop
                </Button>

                <Button variant="default" size="xs" onClick={onClose}>
                  Close
                </Button>
              </Group>
            </Group>
          </Stack>
        </div>
      </Modal>
    </>
  );
}
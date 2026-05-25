import {
  Card,
  Group,
  NumberInput,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";

import LocoActionsTab from "./LocoActionsTab";
import LocoFunctionsTab from "./LocoFunctionsTab";
import LocoGeneralTab from "./LocoGeneralTab";
import LocoListPanel from "./LocoListPanel";
import type { useLocoDialogState } from "./useLocoDialogState";

type TFunction = (key: string) => string;
type LocoDialogState = ReturnType<typeof useLocoDialogState>;

type LocoDialogContentProps = {
  state: LocoDialogState;
  t: TFunction;
};

export default function LocoDialogContent({
  state,
  t,
}: LocoDialogContentProps) {
  const {
    locos,
    selectedId,
    setSelectedId,
    selectedLoco,
    activeActionHook,
    setActiveActionHook,
    functionOptions,
    updateSelectedLoco,
    addLoco,
    deleteSelectedLoco,
    addFunction,
    updateFunction,
    deleteFunction,
    updateActionsForHook,
    sendFunctionTest,
    setImageFromFile,
  } = state;

  return (
    <Group align="stretch" gap="md" wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
      <LocoListPanel
        locos={locos}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={addLoco}
        onDeleteSelected={deleteSelectedLoco}
        hasSelectedLoco={!!selectedLoco}
        t={t}
      />

      <Card withBorder p="md" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        {!selectedLoco ? (
          <Stack align="center" justify="center" h="100%">
            <Text fw={600}>{t("locodialog.noselectedloco")}.</Text>
          </Stack>
        ) : (
          <Tabs defaultValue="general" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Tabs.List>
              <Tabs.Tab value="general">General</Tabs.Tab>
              <Tabs.Tab value="functions">Functions</Tabs.Tab>
              <Tabs.Tab value="actions">Actions</Tabs.Tab>
              <Tabs.Tab value="extended">Extended params</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="general" pt="md" style={{ flex: 1, minHeight: 0 }}>
              <LocoGeneralTab
                loco={selectedLoco}
                onPatch={updateSelectedLoco}
                onImageFile={setImageFromFile}
                t={t}
              />
            </Tabs.Panel>

            <Tabs.Panel value="functions" pt="md" style={{ flex: 1, minHeight: 0 }}>
              <LocoFunctionsTab
                functions={selectedLoco.functions}
                onAddFunction={addFunction}
                onUpdateFunction={updateFunction}
                onDeleteFunction={deleteFunction}
                onFunctionTest={(fn, active) => void sendFunctionTest(fn, active)}
                t={t}
              />
            </Tabs.Panel>

            <Tabs.Panel value="actions" pt="md" style={{ flex: 1, minHeight: 0 }}>
              <LocoActionsTab
                selectedLoco={selectedLoco}
                activeActionHook={activeActionHook}
                onActiveActionHookChange={setActiveActionHook}
                functionOptions={functionOptions}
                onUpdateActionsForHook={updateActionsForHook}
              />
            </Tabs.Panel>

            <Tabs.Panel value="extended" pt="md">
              <NumberInput
                label={t("locodialog.loco_length_mm")}
                value={selectedLoco.length}
                min={1}
                onChange={value => updateSelectedLoco({ length: Number(value) || 0 })}
              />
            </Tabs.Panel>
          </Tabs>
        )}
      </Card>
    </Group>
  );
}

import {
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Image
} from "@mantine/core";

import type { LocoOccupancyDetectionPosition, LocoTrainType } from "../../../../common/src/types";
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

const TRAIN_TYPE_OPTIONS: LocoTrainType[] = [
  "passenger",
  "freight",
  "mixed",
  "maintenance",
  "other",
];

const OCCUPANCY_DETECTION_POSITION_OPTIONS: LocoOccupancyDetectionPosition[] = [
  "forward",
  "reverse",
  "both",
];

const formatDateTime = (value: string | undefined): string => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
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

  const trainTypeOptions = TRAIN_TYPE_OPTIONS.map(value => ({
    value,
    label: t(`locodialog.trainTypes.${value}`),
  }));

  const occupancyDetectionPositionOptions = OCCUPANCY_DETECTION_POSITION_OPTIONS.map(value => ({
    value,
    label: t(`locodialog.occupancyDetectionPositions.${value}`),
  }));

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
              <Tabs.Tab value="general">{t("locodialog.tabs.general")}</Tabs.Tab>
              <Tabs.Tab value="functions">{t("locodialog.tabs.functions")}</Tabs.Tab>
              <Tabs.Tab value="actions">{t("locodialog.tabs.actions")}</Tabs.Tab>
              <Tabs.Tab value="extended">{t("locodialog.extended_params")}</Tabs.Tab>
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
              <Stack gap="md" maw={520}>

                <Card withBorder radius="md" p="xs">
                  <Image
                    src="/images/loco-info-card.png"
                    alt="Locomotive direction and occupancy sensor diagram"
                    fit="contain"
                    radius="sm"
                  />
                </Card>
                <NumberInput
                  label={t("locodialog.loco_length_mm")}
                  value={selectedLoco.length}
                  min={1}
                  onChange={value => updateSelectedLoco({ length: Number(value) || 0 })}
                />

                <Select
                  label={t("locodialog.train_type")}
                  data={trainTypeOptions}
                  value={selectedLoco.trainType ?? "passenger"}
                  allowDeselect={false}
                  onChange={value => updateSelectedLoco({ trainType: (value ?? "passenger") as LocoTrainType })}
                />

                <Select
                  label={t("locodialog.occupancy_detection_position")}
                  data={occupancyDetectionPositionOptions}
                  value={selectedLoco.occupancyDetectionPosition ?? "forward"}
                  allowDeselect={false}
                  onChange={value => updateSelectedLoco({ occupancyDetectionPosition: (value ?? "forward") as LocoOccupancyDetectionPosition })}
                />

                <TextInput
                  label={t("locodialog.last_run_at")}
                  value={formatDateTime(selectedLoco.lastRunAt)}
                  placeholder={t("locodialog.last_run_at_empty")}
                  readOnly
                />
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}
      </Card>
    </Group>
  );
}

import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import {
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import type {
  LocoFunction,
} from "../../../../common/src/types";

type LocoFunctionsTabProps = {
  functions: LocoFunction[];
  onAddFunction: () => void;
  onUpdateFunction: (
    fnId: string,
    patch: Partial<LocoFunction>
  ) => void;
  onDeleteFunction: (fnId: string) => void;
  onFunctionTest: (
    fn: LocoFunction,
    active: boolean
  ) => void;
  t: (key: string) => string;
};

export default function LocoFunctionsTab({
  functions,
  onAddFunction,
  onUpdateFunction,
  onDeleteFunction,
  onFunctionTest,
  t,
}: LocoFunctionsTabProps) {
  return (
    <Stack h="100%">
      <Group justify="space-between">
        <Text fw={600}>{t("locodialog.loco_functions")}</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={onAddFunction}>
          {t("locodialog.new_function")}
        </Button>
      </Group>

      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="sm">
          {functions.map(fn => (
            <Card key={fn.id} withBorder p="sm">
              <Group align="flex-start" wrap="nowrap">
                <NumberInput
                  label={t("locodialog.function_number")}
                  value={fn.number}
                  min={0}
                  w={110}
                  onChange={value => onUpdateFunction(fn.id, { number: Number(value) || 0 })}
                />
                <TextInput
                  label={t("locodialog.functionname")}
                  value={fn.name}
                  style={{ flex: 1 }}
                  onChange={event => onUpdateFunction(fn.id, { name: event.currentTarget.value })}
                />
                <TextInput
                  label="Ikon"
                  value={fn.icon}
                  w={90}
                  onChange={event => onUpdateFunction(fn.id, { icon: event.currentTarget.value })}
                />
                <Checkbox
                  mt={30}
                  label={t("locodialog.function_momentary")}
                  checked={fn.momentary}
                  onChange={event => onUpdateFunction(fn.id, { momentary: event.currentTarget.checked })}
                />
                <Button
                  mt={24}
                  size="xs"
                  variant="light"
                  onPointerDown={event => {
                    event.preventDefault();
                    onFunctionTest(fn, true);
                  }}
                  onPointerUp={event => {
                    event.preventDefault();
                    if (fn.momentary) {
                      onFunctionTest(fn, false);
                    }
                  }}
                  onPointerCancel={event => {
                    event.preventDefault();
                    if (fn.momentary) {
                      onFunctionTest(fn, false);
                    }
                  }}
                  onPointerLeave={event => {
                    if (fn.momentary && event.buttons === 1) {
                      onFunctionTest(fn, false);
                    }
                  }}
                >
                  {t("locodialog.function_test")}
                </Button>
                <ActionIcon mt={28} color="red" variant="light" onClick={() => onDeleteFunction(fn.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}

          {functions.length === 0 && (
            <Text size="sm" c="dimmed">{t("locodialog.functions_empty")}</Text>
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

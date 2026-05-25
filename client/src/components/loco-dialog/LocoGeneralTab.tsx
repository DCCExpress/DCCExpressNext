import {
  Button,
  Checkbox,
  FileButton,
  NumberInput,
  ScrollArea,
  Stack,
  TextInput,
} from "@mantine/core";

import { IconPhoto } from "@tabler/icons-react";

import type { Loco } from "../../../../common/src/types";

type LocoGeneralTabProps = {
  loco: Loco;
  onPatch: (patch: Partial<Loco>) => void;
  onImageFile: (file: File | null) => void;
  t: (key: string) => string;
};

export default function LocoGeneralTab({
  loco,
  onPatch,
  onImageFile,
  t,
}: LocoGeneralTabProps) {
  return (
    <ScrollArea h="100%">
      <Stack gap="md" maw={520}>
        {loco.image && (
          <img
            src={loco.image}
            alt={loco.name}
            style={{ maxHeight: 120, maxWidth: 260, objectFit: "contain" }}
          />
        )}

        <FileButton onChange={onImageFile} accept="image/png,image/jpeg,image/webp">
          {props => (
            <Button {...props} variant="light" leftSection={<IconPhoto size={16} />}>
              {t("locodialog.selectimage")}
            </Button>
          )}
        </FileButton>

        <TextInput
          label={t("locodialog.loconame")}
          value={loco.name}
          onChange={event => onPatch({ name: event.currentTarget.value })}
        />

        <NumberInput
          label={t("locodialog.locoaddress")}
          value={loco.address}
          min={1}
          onChange={value => onPatch({ address: Number(value) || 0 })}
        />

        <NumberInput
          label={t("locodialog.loco_max_speed")}
          value={loco.maxSpeed}
          min={1}
          max={1000}
          onChange={value => onPatch({ maxSpeed: Number(value) || 0 })}
        />

        <Checkbox
          label={t("locodialog.loco_direction_invert")}
          checked={loco.invert}
          onChange={event => onPatch({ invert: event.currentTarget.checked })}
        />
      </Stack>
    </ScrollArea>
  );
}

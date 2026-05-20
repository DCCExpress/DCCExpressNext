import { Select } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { BLOCK_TYPES } from "../../../../common/src/layout/elementTypes";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import type { PropertyChangeHandler } from "./propertyPanelTypes";

type BlockTypeSelectPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  onChange: PropertyChangeHandler;
};

export default function BlockTypeSelectPropertyEditor({
  prop,
  selectedElement,
  onChange,
}: BlockTypeSelectPropertyEditorProps) {
  const { t } = useTranslation();

  return (
    <Select
      label={prop.label}
      placeholder={t("block.typePlaceholder")}
      data={[
        {
          value: BLOCK_TYPES.NORMAL,
          label: t("block.types.normal"),
        },
        {
          value: BLOCK_TYPES.STATION,
          label: t("block.types.station"),
        },
        {
          value: BLOCK_TYPES.TERMINAL,
          label: t("block.types.terminal"),
        },
        {
          value: BLOCK_TYPES.STAGING,
          label: t("block.types.staging"),
        },
        {
          value: BLOCK_TYPES.SIDING,
          label: t("block.types.siding"),
        },
        {
          value: BLOCK_TYPES.YARD,
          label: t("block.types.yard"),
        },
      ]}
      value={(selectedElement as any)[prop.key] ?? null}
      onChange={(value: string | null) =>
        onChange(prop, value ?? BLOCK_TYPES.NORMAL)
      }
      searchable={false}
      clearable={false}
      disabled={prop.readonly === true}
    />
  );
}

import type {
  IEditableProperty,
} from "../../models/editor/elements/PropertyDescriptor";

type Translate = (
  key: string,
  options?: Record<string, unknown>
) => string;

export function getPropertyLabel(
  t: Translate,
  prop: IEditableProperty
): string {
  return t(`propertyPanel.fields.${prop.key}`, {
    defaultValue: prop.label,
  });
}

export function getPropertyOptionLabel(
  t: Translate,
  prop: IEditableProperty,
  option: {
    value: string;
    label: string;
  }
): string {
  return t(`propertyPanel.options.${prop.key}.${option.value}`, {
    defaultValue: option.label,
  });
}

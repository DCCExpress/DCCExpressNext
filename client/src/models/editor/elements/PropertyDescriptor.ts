// export type PropertyEditorType = 
// "string" | "number" | "boolean" | "checkbox" | "colorpicker" | "bittoggle" | "signal2" | "turnoutSelection" | "audiofile";

export type PropertyEditorType =
  | "string"
  | "number"
  | "boolean"
  | "checkbox"
  | "colorpicker"
  | "bittoggle"
  | "signal2"
  | "turnoutSelection"
  | "audiofile"
  | "routeBlockSelect"
   | "blockTypeSelect";

export interface IEditableProperty {
  label: string;
  key: string;
  type: PropertyEditorType;
  readonly?: boolean;
  validate?: (value: any) => boolean;
  min?: number;
  max?: number;
  callback?: () => void;
}
import type { Dispatch, SetStateAction } from "react";

import type { LayoutView } from "../../models/editor/core/LayoutView";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";

export type LayoutSetter = Dispatch<SetStateAction<LayoutView>>;

export type PropertyChangeHandler = (
  prop: IEditableProperty,
  rawValue: unknown
) => void;

export type SelectedElementUpdateHandler = (
  element: BaseElementView | null
) => void;

import type { Dispatch, SetStateAction } from "react";

import type { Layout } from "../../models/editor/core/Layout";
import type { BaseElement } from "../../models/editor/core/BaseElement";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";

export type LayoutSetter = Dispatch<SetStateAction<Layout>>;

export type PropertyChangeHandler = (
  prop: IEditableProperty,
  rawValue: unknown
) => void;

export type SelectedElementUpdateHandler = (
  element: BaseElement | null
) => void;

import type { BaseElement } from "../../models/editor/core/BaseElement";
import type { Layout } from "../../models/editor/core/Layout";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import type { Graph } from "../../../../common/src/railway/graph";

import BasicPropertyEditor from "./BasicPropertyEditor";
import BlockTypeSelectPropertyEditor from "./BlockTypeSelectPropertyEditor";
import RouteBlockSelectPropertyEditor from "./RouteBlockSelectPropertyEditor";
import RouteTurnoutSelectionPropertyEditor from "./RouteTurnoutSelectionPropertyEditor";
import SignalAspectPropertyEditor from "./SignalAspectPropertyEditor";
import TurnoutBitPropertyEditor from "./TurnoutBitPropertyEditor";
import type {
  LayoutSetter,
  PropertyChangeHandler,
  SelectedElementUpdateHandler,
} from "./propertyPanelTypes";

type RouteBlockSelectData = Array<{
  value: string;
  label: string;
}>;

type PropertyFieldRendererProps = {
  prop: IEditableProperty;
  selectedElement: BaseElement;
  layout: Layout;
  turnoutSelectionMode: boolean;
  setTurnoutSelectionMode: (on: boolean) => void;
  onLayoutChange: LayoutSetter;
  routeGraph: Graph | null;
  routeGraphBlockSelectData: RouteBlockSelectData;
  routeGraphError: string | null;
  onChange: PropertyChangeHandler;
  onUpdateSelectedElement: SelectedElementUpdateHandler;
};

export default function PropertyFieldRenderer({
  prop,
  selectedElement,
  layout,
  turnoutSelectionMode,
  setTurnoutSelectionMode,
  onLayoutChange,
  routeGraph,
  routeGraphBlockSelectData,
  routeGraphError,
  onChange,
  onUpdateSelectedElement,
}: PropertyFieldRendererProps) {
  switch (prop.type) {
    case "string":
    case "audiofile":
    case "number":
    case "boolean":
    case "checkbox":
    case "colorpicker":
      return (
        <BasicPropertyEditor
          prop={prop}
          selectedElement={selectedElement}
          onChange={onChange}
        />
      );

    case "bittoggle":
      return (
        <TurnoutBitPropertyEditor
          prop={prop}
          selectedElement={selectedElement}
          onChange={onChange}
        />
      );

    case "signal2":
      return (
        <SignalAspectPropertyEditor
          prop={prop}
          selectedElement={selectedElement}
          onUpdateSelectedElement={onUpdateSelectedElement}
        />
      );

    case "turnoutSelection":
      return (
        <RouteTurnoutSelectionPropertyEditor
          prop={prop}
          selectedElement={selectedElement}
          layout={layout}
          turnoutSelectionMode={turnoutSelectionMode}
          setTurnoutSelectionMode={setTurnoutSelectionMode}
          onLayoutChange={onLayoutChange}
          onUpdateSelectedElement={onUpdateSelectedElement}
        />
      );

    case "routeBlockSelect":
      return (
        <RouteBlockSelectPropertyEditor
          prop={prop}
          selectedElement={selectedElement}
          routeGraph={routeGraph}
          routeGraphBlockSelectData={routeGraphBlockSelectData}
          routeGraphError={routeGraphError}
          onChange={onChange}
        />
      );

    case "blockTypeSelect":
      return (
        <BlockTypeSelectPropertyEditor
          prop={prop}
          selectedElement={selectedElement}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { LayoutView } from "../../models/editor/core/LayoutView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import type { Graph } from "../../../../common/src/railway/graph";

import AudioListPropertyEditor from "./AudioListPropertyEditor";
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
  selectedElement: BaseElementView;
  layout: LayoutView;
  turnoutSelectionMode: boolean;
  setTurnoutSelectionMode: (on: boolean) => void;
  onLayoutChange: LayoutSetter;
  routeGraph: Graph | null;
  routeGraphBlockSelectData: RouteBlockSelectData;
  routeGraphError: string | null;
  onChange: PropertyChangeHandler;
  onUpdateSelectedElement: SelectedElementUpdateHandler;
  setBusy?: (busy: boolean, text?: string) => void;
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
  setBusy,
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

    case "audioList":
      return (
        <AudioListPropertyEditor
          prop={prop}
          selectedElement={selectedElement}
          onUpdateSelectedElement={onUpdateSelectedElement}
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
          {...(setBusy !== undefined
            ? { setBusy }
            : {})}
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
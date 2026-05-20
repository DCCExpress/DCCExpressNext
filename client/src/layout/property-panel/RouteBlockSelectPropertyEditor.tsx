import { Select, Stack, Text } from "@mantine/core";

import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import type { Graph } from "../../../../common/src/railway/graph";
import type { PropertyChangeHandler } from "./propertyPanelTypes";

type RouteBlockSelectData = Array<{
  value: string;
  label: string;
}>;

type RouteBlockSelectPropertyEditorProps = {
  prop: IEditableProperty;
  selectedElement: BaseElementView;
  routeGraph: Graph | null;
  routeGraphBlockSelectData: RouteBlockSelectData;
  routeGraphError: string | null;
  onChange: PropertyChangeHandler;
};

export default function RouteBlockSelectPropertyEditor({
  prop,
  selectedElement,
  routeGraph,
  routeGraphBlockSelectData,
  routeGraphError,
  onChange,
}: RouteBlockSelectPropertyEditorProps) {
  return (
    <Stack gap={6}>
      <Select
        label={prop.label}
        placeholder="Select block"
        data={routeGraphBlockSelectData}
        value={(selectedElement as any)[prop.key] || null}
        onChange={(value: string | null) => onChange(prop, value ?? "")}
        searchable
        clearable
        disabled={!routeGraph || routeGraphBlockSelectData.length === 0}
      />

      {!routeGraph && (
        <Text size="xs" c="dimmed">
          No route graph available.
        </Text>
      )}

      {routeGraph && routeGraphBlockSelectData.length === 0 && (
        <Text size="xs" c="dimmed">
          No blocks available in the generated route graph.
        </Text>
      )}

      {routeGraphError && (
        <Text size="xs" c="red">
          {routeGraphError}
        </Text>
      )}
    </Stack>
  );
}

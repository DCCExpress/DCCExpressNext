import { Select, Stack, Text } from "@mantine/core";

import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import type { IEditableProperty } from "../../models/editor/elements/PropertyDescriptor";
import type { Graph } from "../../../../common/src/railway/graph";
import type { PropertyChangeHandler } from "./propertyPanelTypes";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <Stack gap={6}>
      <Select
        label={prop.label}
        placeholder={t("routesPanel.selectBlock")}
        data={routeGraphBlockSelectData}
        value={(selectedElement as any)[prop.key] || null}
        onChange={(value: string | null) => onChange(prop, value ?? "")}
        searchable
        clearable
        disabled={!routeGraph || routeGraphBlockSelectData.length === 0}
      />

      {!routeGraph && (
        <Text size="xs" c="dimmed">
          {t("routesPanel.noRouteGraph")}
        </Text>
      )}

      {routeGraph && routeGraphBlockSelectData.length === 0 && (
        <Text size="xs" c="dimmed">
          {t("routesPanel.noBlocks")}
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

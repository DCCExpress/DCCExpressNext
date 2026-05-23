import {
  Card,
  ScrollArea,
  Text,
} from "@mantine/core";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

import ControlPanel from "../components/ControlPanel";
import VisibilitySettings from "../components/VisibilitySettings";
import { BaseElementView } from "../models/editor/core/BaseElementView";
import { LayoutView } from "../models/editor/core/LayoutView";
import { IEditableProperty } from "../models/editor/elements/PropertyDescriptor";
import { ExtendedRouteButtonElementView } from "../models/editor/elements/ExtendedRouteButtonElementView";
import { showErrorMessage, showOkMessage, showWarningMessage } from "../helpers";
import { useRouteGraph } from "../hooks/useRouteGraph";
import { wsApi } from "../services/wsApi";
import { getGraphBlockSelectData } from "../services/routeGraphUi";
import ExtendedRouteActions from "./property-panel/ExtendedRouteActions";
import PropertyFieldRenderer from "./property-panel/PropertyFieldRenderer";
import PropertyPanelHelp from "./property-panel/PropertyPanelHelp";
import "../styles/propertypanel.css";
import { useTranslation } from "react-i18next";

type PropertyPanelProps = {
  selectedElement: BaseElementView | null;
  onUpdateSelectedElement: (element: BaseElementView | null) => void;
  invalidate: number;
  editMode: boolean;
  opened: boolean;
  turnoutSelectionMode: boolean;
  setTurnoutSelectionMode: (on: boolean) => void;
  layout: LayoutView;
  onLayoutChange: Dispatch<SetStateAction<LayoutView>>;
  routes?: string | undefined;
  setBusy?: (busy: boolean, text?: string) => void;
};

function updateElementProperty(
  selectedElement: BaseElementView,
  prop: IEditableProperty,
  rawValue: unknown
): void {
  switch (prop.type) {
    case "number": {
      const nextValue =
        typeof rawValue === "number"
          ? rawValue
          : Number.parseInt(String(rawValue ?? 0), 10);

      if (prop.validate && !prop.validate(nextValue)) {
        return;
      }

      (selectedElement as any)[prop.key] = Number.isNaN(nextValue)
        ? 0
        : nextValue;
      return;
    }

    case "boolean":
      (selectedElement as any)[prop.key] = Boolean(rawValue);
      return;

    case "checkbox":
      (selectedElement as any)[prop.key] = rawValue ? "checked" : "";
      return;

    default:
      (selectedElement as any)[prop.key] = rawValue;
  }
}

export default function RightPropertyPanel({
  selectedElement,
  onUpdateSelectedElement,
  invalidate,
  editMode,
  opened,
  turnoutSelectionMode,
  setTurnoutSelectionMode,
  layout,
  onLayoutChange,
  routes,
  setBusy,
}: PropertyPanelProps) {
  const { t } = useTranslation();
  const {
    graph: routeGraph,
    ensureLoaded: ensureRouteGraphLoaded,
    reload: reloadRouteGraph,
  } = useRouteGraph();

  const [routeGraphError, setRouteGraphError] = useState<string | null>(null);

  const properties = useMemo(() => {
    if (!editMode || !selectedElement) {
      return null;
    }

    return selectedElement.getEditableProperties();
  }, [editMode, selectedElement, invalidate]);

  const routeGraphBlockSelectData = useMemo(() => {
    return getGraphBlockSelectData(routeGraph);
  }, [routeGraph]);

  const handleChange = (
    prop: IEditableProperty,
    rawValue: unknown
  ): void => {
    if (!selectedElement) {
      return;
    }

    updateElementProperty(selectedElement, prop, rawValue);
    onUpdateSelectedElement(selectedElement);
  };

  const refreshExtendedRouteGraph = async (): Promise<void> => {
    if (!(selectedElement instanceof ExtendedRouteButtonElementView)) {
      setRouteGraphError(null);
      return;
    }

    try {
      const graph = await reloadRouteGraph();

      if (!graph) {
        setRouteGraphError(t("routesPanel.noActiveGraph"));
        return;
      }

      setRouteGraphError(null);
    } catch (error) {
      setRouteGraphError(
        error instanceof Error
          ? error.message
          : t("routesPanel.reloadFailed")
      );
    } finally {
      onUpdateSelectedElement(selectedElement);
    }
  };

  const handleTestExtendedRoute = async (): Promise<void> => {
    if (!(selectedElement instanceof ExtendedRouteButtonElementView)) {
      return;
    }

    if (!selectedElement.fromBlockId || !selectedElement.toBlockId) {
      showWarningMessage(
        t("common.error"),
        t("routesPanel.selectBothBlocks")
      );
      return;
    }

    let graph = routeGraph;

    try {
      if (!graph) {
        graph = await ensureRouteGraphLoaded();
      }

      if (!graph) {
        showWarningMessage(t("common.error"), t("routesPanel.noServerGraph"));
        return;
      }

      const fromBlock = graph.findBlockById(selectedElement.fromBlockId);
      const toBlock = graph.findBlockById(selectedElement.toBlockId);

      if (!fromBlock || !toBlock) {
        showWarningMessage(
          t("common.error"),
          t("routesPanel.selectedBlocksMissing")
        );
        return;
      }

      setBusy?.(
        true,
        t("routesPanel.routeRequestSent", {
          from: fromBlock.label,
          to: toBlock.label,
        })
      );

      wsApi.reserveRoute(fromBlock.name, toBlock.name);

      showOkMessage(
        t("routesPanel.routeRequest"),
        t("routesPanel.reservationRequested", {
          from: fromBlock.label,
          to: toBlock.label,
        })
      );
    } catch (error) {
      showErrorMessage(
        t("common.error"),
        error instanceof Error
          ? error.message
          : t("routesPanel.reservationFailed")
      );
    } finally {
      setBusy?.(false);
    }
  };

  useEffect(() => {
    if (editMode && selectedElement instanceof ExtendedRouteButtonElementView) {
      if (!routeGraph) {
        void refreshExtendedRouteGraph();
      } else {
        setRouteGraphError(null);
      }
    } else {
      setRouteGraphError(null);
    }

    // Szándékosan nincs routeGraph a dependency listában.
    // Csak kijelöléskor / editMode váltáskor döntsön az automatikus generálásról.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement, editMode]);

  void opened;

  if (!editMode) {
    return <ControlPanel routes={routes} layout={layout} />;
  }

  return (
    <ScrollArea h="100%" style={{ margin: 0, padding: 0 }}>
      <div className="property-panel">
        <Text c="blue" tt="capitalize">
          {t("propertyPanel.title")}
        </Text>

        {!selectedElement && <VisibilitySettings />}

        {selectedElement &&
          properties?.map(prop => (
            <div
              key={prop.key}
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 12,
                marginLeft: 0,
                marginRight: 16,
              }}
            >
              <Card withBorder p="xs">
                <PropertyFieldRenderer
                  prop={prop}
                  selectedElement={selectedElement}
                  layout={layout}
                  turnoutSelectionMode={turnoutSelectionMode}
                  setTurnoutSelectionMode={setTurnoutSelectionMode}
                  onLayoutChange={onLayoutChange}
                  routeGraph={routeGraph}
                  routeGraphBlockSelectData={routeGraphBlockSelectData}
                  routeGraphError={routeGraphError}
                  onChange={handleChange}
                  onUpdateSelectedElement={onUpdateSelectedElement}
                  setBusy={setBusy}
                />
              </Card>
            </div>
          ))}

        {selectedElement instanceof ExtendedRouteButtonElementView && (
          <ExtendedRouteActions
            selectedElement={selectedElement}
            onRefreshRouteGraph={refreshExtendedRouteGraph}
            onTestRoute={handleTestExtendedRoute}
          />
        )}

        <PropertyPanelHelp selectedElement={selectedElement} />
      </div>
    </ScrollArea>
  );
}
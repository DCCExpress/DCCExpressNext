// server/src/ws/handlers/wsLayoutMessageHandlers.ts

import type {
  LayoutResponsePayload,
} from "../../../../common/src/types.js";

import type {
  RouteGraphResponseDto,
} from "../../../../common/src/railway/routeGraphDto.js";

import {
  layoutRuntimeStore,
} from "../../services/layoutRuntimeStore.js";

import {
  railwayTopologyStore,
} from "../../services/railwayTopologyStore.js";

import {
  routeGraphRuntimeStore,
} from "../../services/routeGraphRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function createRouteGraphResponse(): RouteGraphResponseDto {
  const graph = routeGraphRuntimeStore.getGraph();
  const topology = railwayTopologyStore.getTopology();

  if (!graph) {
    return {
      ready: false,
    };
  }

  return {
    ready: true,
    nodes: graph.nodes.map(node => ({
      name: node.name,
      trackName: node.trackName,
      x: node.x,
      y: node.y,
      isVirtual: node.isVirtual,
      busy: node.busy,
      detectors: node.detectors,
      signals: node.signals,
      blocks: node.blocks,
      elementIds: node.elementIds,
    })),
    edges: graph.edges.map(edge => ({
      from: edge.from.name,
      to: edge.to.name,
      turnoutStates: edge.turnoutStates,
      locoDirection: edge.locoDirection,
    })),
    trackRuntime: topology
      ? [
        ...topology.getPhysicalTrackElements().map(elem => ({
          id: elem.id,
          section: elem.section,
          travelDirection: elem.travelDirection,
        })),
        ...topology.getBlocks().map(block => {
          const centerTrack = topology.getPhysicalTrackAt(block.pos);

          return {
            id: block.id,
            section: centerTrack?.section ?? 0,
            travelDirection: centerTrack?.travelDirection ?? "unknown",
          };
        }),
      ]
      : [],
  };
}

function sendLayoutResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: LayoutResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "layoutResponse",
    data: payload,
  });
}

export const handleLayoutMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "layoutCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        await layoutRuntimeStore.initialize();

        sendLayoutResponse(context, {
          requestId,
          action,
          ok: true,
          layout: layoutRuntimeStore.getLayout() ?? {},
        });

        return true;
      }

      case "save": {
        await layoutRuntimeStore.replaceLayout(context.msg.data.layout ?? {});

        sendLayoutResponse(context, {
          requestId,
          action,
          ok: true,
          message: "Layout saved and server runtime layout updated.",
        });

        return true;
      }

      case "refreshRuntime": {
        layoutRuntimeStore.refreshRuntimeFromLayout(context.msg.data.layout ?? {});

        sendLayoutResponse(context, {
          requestId,
          action,
          ok: true,
          message: "Server runtime topology and route graph refreshed without saving layout.",
        });

        return true;
      }

      case "getRouteGraph": {
        sendLayoutResponse(context, {
          requestId,
          action,
          ok: true,
          routeGraph: createRouteGraphResponse(),
        });

        return true;
      }

      default: {
        sendLayoutResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown layout command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendLayoutResponse(context, {
      requestId,
      action,
      ok: false,
      message: error instanceof Error
        ? error.message
        : String(error),
    });

    return true;
  }
};

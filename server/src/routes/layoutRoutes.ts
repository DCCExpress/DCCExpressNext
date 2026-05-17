import { Router } from "express";
import {
  layoutRuntimeStore,
  type ServerLayoutDto,
} from "../services/layoutRuntimeStore.js";
import { railwayTopologyStore } from "../services/railwayTopologyStore.js";
import { routeGraphRuntimeStore } from "../services/routeGraphRuntimeStore.js";
import type {
  RouteGraphResponseDto,
} from "../../../common/src/railway/routeGraphDto.js";

export const layoutRoutes = Router();

layoutRoutes.get("/", async (_req, res) => {
  try {
    await layoutRuntimeStore.initialize();

    const layout = layoutRuntimeStore.getLayout();

    res.json(layout ?? {});
  } catch (error) {
    console.error("GET /api/layout error:", error);

    res.status(500).json({
      success: false,
      message: "Nem sikerült beolvasni a pályát.",
    });
  }
});

layoutRoutes.put("/", async (req, res) => {
  try {
    const layout = req.body as ServerLayoutDto;

    if (!layout || typeof layout !== "object") {
      res.status(400).json({
        success: false,
        message: "A kérés törzsének layout objektumnak kell lennie.",
      });
      return;
    }

    await layoutRuntimeStore.replaceLayout(layout);

    res.json({
      success: true,
      message: "Layout saved and server runtime layout updated.",
    });
  } catch (error) {
    console.error("PUT /api/layout error:", error);

    res.status(500).json({
      success: false,
      message: "Nem sikerült elmenteni a pályát.",
    });
  }
});

layoutRoutes.get("/topology-summary", (_req, res) => {
  const topology = railwayTopologyStore.getTopology();

  if (!topology) {
    res.json({
      ready: false,
    });
    return;
  }

  res.json({
    ready: true,
    physicalTracks:
      topology.getPhysicalTrackElements().length,
    turnouts:
      topology.getTurnouts().length,
    blocks:
      topology.getBlocks().length,
    sensors:
      topology.getSensors().length,
    signals:
      topology.getSignals().length,
    directionElements:
      topology.getDirectionElements().length,
  });
});

layoutRoutes.get("/route-graph-summary", (_req, res) => {
  const graph = routeGraphRuntimeStore.getGraph();

  if (!graph) {
    res.json({
      ready: false,
    });

    return;
  }

  const blocks = graph.nodes.flatMap(
    node => node.blocks
  );

  res.json({
    ready: true,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    blocks: blocks.length,
    blockNames: blocks.map(block => block.name),
    runnableBlockRoutes:
      graph.getRunnableBlockRoutes().length,
    runnableBlockTransitions:
      graph.getRunnableBlockTransitions().length,
  });
});
// layoutRoutes.get("/route-graph-summary", (_req, res) => {
//   const graph = routeGraphRuntimeStore.getGraph();

//   if (!graph) {
//     res.json({
//       ready: false,
//     });

//     return;
//   }

//   const blocks = graph.nodes.flatMap(
//     node => node.blocks
//   );

//   res.json({
//     ready: true,
//     nodes: graph.nodes.length,
//     edges: graph.edges.length,
//     blocks: blocks.length,
//     blockNames: blocks.map(block => block.name),
//     runnableBlockRoutes:
//       graph.getRunnableBlockRoutes().length,
//     runnableBlockTransitions:
//       graph.getRunnableBlockTransitions().length,
//   });
// });

layoutRoutes.get("/route-test", (req, res) => {
  const graph = routeGraphRuntimeStore.getGraph();

  if (!graph) {
    res.json({
      ready: false,
      error: "Nincs aktív szerveroldali route graph.",
    });

    return;
  }

  const fromBlockName =
    typeof req.query.from === "string"
      ? req.query.from
      : "A1";

  const toBlockName =
    typeof req.query.to === "string"
      ? req.query.to
      : "C3";

  const fromBlock =
    graph.findBlockByName(fromBlockName);

  const toBlock =
    graph.findBlockByName(toBlockName);

  const fromNode = fromBlock
    ? graph.findNodeContainingBlock(fromBlock.id)
    : null;

  const toNode = toBlock
    ? graph.findNodeContainingBlock(toBlock.id)
    : null;

  const nodeRoute =
    fromNode && toNode
      ? graph.findRoute(fromNode.name, toNode.name)
      : null;

  const blockRoute =
    graph.findRouteBetweenBlockNames(
      fromBlockName,
      toBlockName
    );

  res.json({
    ready: true,

    request: {
      fromBlockName,
      toBlockName,
    },

    fromBlock,
    toBlock,

    fromNode: fromNode
      ? {
          name: fromNode.name,
          blocks: fromNode.blocks.map(b => b.name),
        }
      : null,

    toNode: toNode
      ? {
          name: toNode.name,
          blocks: toNode.blocks.map(b => b.name),
        }
      : null,

    nodeRoute: nodeRoute
      ? {
          nodes: nodeRoute.nodes.map(node => node.name),
          edges: nodeRoute.edges.length,
          turnoutStates: nodeRoute.turnoutStates,
          locoDirection: nodeRoute.locoDirection,
        }
      : null,

    blockRoute: blockRoute
      ? {
          fromBlock: blockRoute.fromBlock.name,
          toBlock: blockRoute.toBlock.name,
          nodes: blockRoute.nodes.map(node => node.name),
          edges: blockRoute.edges.length,
          turnoutStates: blockRoute.turnoutStates,
          locoDirection: blockRoute.locoDirection,
        }
      : null,

    graphSummary: {
      nodes: graph.nodes.map(node => ({
        name: node.name,
        blocks: node.blocks.map(block => block.name),
      })),

      edges: graph.edges.map(edge => ({
        from: edge.from.name,
        to: edge.to.name,
        turnouts: edge.turnoutStates,
      })),
    },
  });
});

layoutRoutes.get("/route-graph", (_req, res) => {
  const graph = routeGraphRuntimeStore.getGraph();

  if (!graph) {
    const response: RouteGraphResponseDto = {
      ready: false,
    };

    res.json(response);
    return;
  }

  const response: RouteGraphResponseDto = {
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
  };

  res.json(response);
});
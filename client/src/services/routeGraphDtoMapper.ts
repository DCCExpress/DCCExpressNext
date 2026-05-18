import type {
  RouteGraphDto,
} from "../../../common/src/railway/routeGraphDto";

import {
  Edge,
  Graph,
  GraphNode,
} from "../../../common/src/railway/graph";

export function createClientGraphFromRouteGraphDto(
  dto: RouteGraphDto
): Graph {
  const graph = new Graph();

  const nodesByName = new Map<string, GraphNode>();

  for (const nodeDto of dto.nodes) {
    const node = new GraphNode(
      nodeDto.name,
      nodeDto.trackName,
      nodeDto.x,
      nodeDto.y,
      nodeDto.detectors,
      nodeDto.signals,
      nodeDto.blocks,
      nodeDto.elementIds
    );

    node.isVirtual = nodeDto.isVirtual;
    node.busy = nodeDto.busy;

    graph.addNode(node);
    nodesByName.set(node.name, node);
  }

  for (const edgeDto of dto.edges) {
    const fromNode = nodesByName.get(edgeDto.from);
    const toNode = nodesByName.get(edgeDto.to);

    if (!fromNode || !toNode) {
      console.warn(
        "[RouteGraphDtoMapper] Edge references missing node:",
        edgeDto
      );

      continue;
    }

    graph.addEdge(
      new Edge(
        fromNode,
        toNode,
        edgeDto.turnoutStates,
        edgeDto.locoDirection
      )
    );
  }

  return graph;
}
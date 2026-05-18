import type {
  Graph,
} from "../../../common/src/railway/graph";

export function getGraphBlockSelectData(
  graph: Graph | null
): { value: string; label: string }[] {
  if (!graph) {
    return [];
  }

  return graph.nodes
    .flatMap(node =>
      node.blocks.map(block => ({
        value: block.id,
        label: block.label,
      }))
    )
    .sort((a, b) =>
      a.label.localeCompare(b.label)
    );
}
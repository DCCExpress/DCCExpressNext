import type {
  Edge,
  Graph,
  GraphNode,
} from "../../../../../common/src/railway/graph";

const NODE_RADIUS = 10;

export default class GraphRenderer {
  private readonly initializedGraphs = new WeakSet<Graph>();

  draw(
    ctx: CanvasRenderingContext2D,
    graph: Graph,
    width: number,
    height: number
  ): void {
    this.autoLayout(graph, width, height);

    ctx.save();

    // Edge-ek először
    for (const edge of graph.edges) {
      const curveOffset = this.getCurveOffset(graph, edge);
      this.drawEdge(ctx, edge, curveOffset);
    }

    // Node-ok utána, hogy felül legyenek
    for (const node of graph.nodes) {
      this.drawNode(ctx, node);
    }

    ctx.restore();
  }

  private autoLayout(
    graph: Graph,
    width: number,
    height: number
  ): void {
    if (graph.nodes.length === 0) {
      return;
    }

    const padding = 70;
    const centerX = width / 2;
    const centerY = height / 2;

    /**
     * Első rajzoláskor szétszórjuk körbe,
     * ugyanúgy, mint a régi kliens Graph.ts tette.
     */
    if (!this.initializedGraphs.has(graph)) {
      const radius = Math.min(width, height) * 0.32;

      graph.nodes.forEach((node, i) => {
        const angle =
          (Math.PI * 2 * i) / graph.nodes.length;

        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
      });

      this.initializedGraphs.add(graph);
    }

    const iterations = 280;
    const idealEdgeLength = 180;
    const repulsionStrength = 36000;
    const springStrength = 0.018;
    const centerStrength = 0.003;

    const nodeIndex = new Map<GraphNode, number>();

    graph.nodes.forEach((node, index) => {
      nodeIndex.set(node, index);
    });

    /**
     * A gráf irányított, de layout számításkor
     * S1->S2 és S2->S1 ugyanaz a fizikai kapcsolat.
     */
    const uniqueConnections = new Set<string>();

    const layoutEdges = graph.edges.filter(edge => {
      const a = nodeIndex.get(edge.from);
      const b = nodeIndex.get(edge.to);

      if (a === undefined || b === undefined) {
        return false;
      }

      const key =
        a < b
          ? `${a}:${b}`
          : `${b}:${a}`;

      if (uniqueConnections.has(key)) {
        return false;
      }

      uniqueConnections.add(key);
      return true;
    });

    for (let iteration = 0; iteration < iterations; iteration++) {
      const moveX =
        new Array<number>(graph.nodes.length).fill(0);

      const moveY =
        new Array<number>(graph.nodes.length).fill(0);

      // 1. Node-node taszítás
      for (let i = 0; i < graph.nodes.length; i++) {
        const a = graph.nodes[i]!;

        for (let j = i + 1; j < graph.nodes.length; j++) {
          const b = graph.nodes[j]!;

          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;

          if (distSq < 0.01) {
            dx = 0.1 + i * 0.01;
            dy = 0.1 + j * 0.01;
            distSq = dx * dx + dy * dy;
          }

          const dist = Math.sqrt(distSq);
          const force = repulsionStrength / distSq;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          moveX[i]! -= fx;
          moveY[i]! -= fy;

          moveX[j]! += fx;
          moveY[j]! += fy;
        }
      }

      // 2. Edge-ek rugóereje
      for (const edge of layoutEdges) {
        const fromIndex = nodeIndex.get(edge.from)!;
        const toIndex = nodeIndex.get(edge.to)!;

        const from = edge.from;
        const to = edge.to;

        const dx = to.x - from.x;
        const dy = to.y - from.y;

        const distance =
          Math.max(1, Math.hypot(dx, dy));

        const stretch =
          distance - idealEdgeLength;

        const force =
          stretch * springStrength;

        const fx =
          (dx / distance) * force;

        const fy =
          (dy / distance) * force;

        moveX[fromIndex]! += fx;
        moveY[fromIndex]! += fy;

        moveX[toIndex]! -= fx;
        moveY[toIndex]! -= fy;
      }

      // 3. Enyhe középre húzás
      for (let i = 0; i < graph.nodes.length; i++) {
        const node = graph.nodes[i]!;

        moveX[i]! +=
          (centerX - node.x) * centerStrength;

        moveY[i]! +=
          (centerY - node.y) * centerStrength;
      }

      // 4. Mozgatás hűtéssel
      const cooling =
        1 - iteration / iterations;

      const maxStep =
        12 * cooling + 1;

      for (let i = 0; i < graph.nodes.length; i++) {
        const node = graph.nodes[i]!;

        const dx =
          Math.max(
            -maxStep,
            Math.min(maxStep, moveX[i]!)
          );

        const dy =
          Math.max(
            -maxStep,
            Math.min(maxStep, moveY[i]!)
          );

        node.x = Math.max(
          padding,
          Math.min(width - padding, node.x + dx)
        );

        node.y = Math.max(
          padding,
          Math.min(height - padding, node.y + dy)
        );
      }
    }
  }

  private drawNode(
    ctx: CanvasRenderingContext2D,
    node: GraphNode
  ): void {
    ctx.save();

    ctx.beginPath();
    ctx.arc(
      node.x,
      node.y,
      NODE_RADIUS,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#111111";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.name, node.x, node.y);

    ctx.restore();
  }

  private drawEdge(
    ctx: CanvasRenderingContext2D,
    edge: Edge,
    curveOffset: number
  ): void {
    ctx.save();

    const dx = edge.to.x - edge.from.x;
    const dy = edge.to.y - edge.from.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) {
      ctx.restore();
      return;
    }

    const ux = dx / length;
    const uy = dy / length;

    const startX =
      edge.from.x + ux * NODE_RADIUS;

    const startY =
      edge.from.y + uy * NODE_RADIUS;

    const endX =
      edge.to.x - ux * NODE_RADIUS;

    const endY =
      edge.to.y - uy * NODE_RADIUS;

    const normalX = -uy;
    const normalY = ux;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const controlX =
      midX + normalX * curveOffset;

    const controlY =
      midY + normalY * curveOffset;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(
      controlX,
      controlY,
      endX,
      endY
    );

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.stroke();

    const arrowAngle = Math.atan2(
      endY - controlY,
      endX - controlX
    );

    this.drawArrowHead(
      ctx,
      endX,
      endY,
      arrowAngle
    );

    if (edge.turnoutStates.length > 0) {
      const point = this.getQuadraticPoint(
        startX,
        startY,
        controlX,
        controlY,
        endX,
        endY,
        0.5
      );

      const labelOffset =
        curveOffset === 0 ? 14 : 0;

      const labelX =
        point.x + normalX * labelOffset;

      const labelY =
        point.y + normalY * labelOffset;

      const label = edge.turnoutStates
        .map(ts =>
          `${ts.address}:${ts.closed ? "C" : "T"}`
        )
        .join(", ");

      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textWidth =
        ctx.measureText(label).width;

      const paddingX = 5;
      const boxWidth =
        textWidth + paddingX * 2;

      const boxHeight = 16;

      ctx.fillStyle =
        "rgba(255, 255, 255, 0.92)";

      ctx.fillRect(
        labelX - boxWidth / 2,
        labelY - boxHeight / 2,
        boxWidth,
        boxHeight
      );

      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1;

      ctx.strokeRect(
        labelX - boxWidth / 2,
        labelY - boxHeight / 2,
        boxWidth,
        boxHeight
      );

      ctx.fillStyle = "#111111";
      ctx.fillText(label, labelX, labelY);
    }

    ctx.restore();
  }

  private drawArrowHead(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number
  ): void {
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(x, y);

    ctx.lineTo(
      x - arrowLength * Math.cos(angle - arrowAngle),
      y - arrowLength * Math.sin(angle - arrowAngle)
    );

    ctx.moveTo(x, y);

    ctx.lineTo(
      x - arrowLength * Math.cos(angle + arrowAngle),
      y - arrowLength * Math.sin(angle + arrowAngle)
    );

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private getQuadraticPoint(
    x1: number,
    y1: number,
    cx: number,
    cy: number,
    x2: number,
    y2: number,
    t: number
  ) {
    const mt = 1 - t;

    return {
      x:
        mt * mt * x1 +
        2 * mt * t * cx +
        t * t * x2,

      y:
        mt * mt * y1 +
        2 * mt * t * cy +
        t * t * y2,
    };
  }

  private getCurveOffset(
    graph: Graph,
    edge: Edge
  ): number {
    const hasReverseEdge =
      graph.edges.some(other =>
        other.from === edge.to &&
        other.to === edge.from
      );

    if (!hasReverseEdge) {
      return 0;
    }

    const fromIndex =
      graph.nodes.indexOf(edge.from);

    const toIndex =
      graph.nodes.indexOf(edge.to);

    return fromIndex < toIndex ? 22 : -22;
  }
}
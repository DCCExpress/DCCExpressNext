// src/components/common/CanvasElement.tsx

import { Box } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

export type CanvasDrawHandler = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) => void;

type CanvasElementProps = {
  draw: CanvasDrawHandler;
  height?: string | number;
};

export default function CanvasElement({
  draw,
  height = "100%",
}: CanvasElementProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      setSize({
        width: Math.floor(width),
        height: Math.floor(height),
      });
    });

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (size.width <= 0 || size.height <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;

    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    draw(ctx, canvas, size.width, size.height);
  }, [draw, size]);

  return (
    <Box
      ref={wrapperRef}
      style={{
        width: "100%",
        height,
        overflow: "hidden",
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
        background: "var(--mantine-color-body)",
      }}
    >
      <canvas ref={canvasRef} />
    </Box>
  );
}
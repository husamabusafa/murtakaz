"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { EChartsOption } from "echarts";
import { cn } from "@/lib/utils";

export function EChart({
  option,
  className,
  height = 260,
}: {
  option: EChartsOption;
  className?: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const resolvedOption = useMemo<EChartsOption>(
    () => ({
      backgroundColor: "transparent",
      textStyle: { color: "#e2e8f0", fontFamily: 'Tajawal, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto' },
      ...option,
    }),
    [option],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    type ChartInstance = {
      setOption: (option: EChartsOption, opts?: { notMerge?: boolean }) => void;
      resize: () => void;
      dispose: () => void;
    };

    let chart: ChartInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    (async () => {
      const echarts = await import("echarts");
      if (cancelled) return;

      chart = echarts.init(container, undefined, { renderer: "canvas" });
      chart.setOption(resolvedOption, { notMerge: true });

      resizeObserver = new ResizeObserver(() => chart?.resize());
      resizeObserver.observe(container);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chart?.dispose();
    };
  }, [resolvedOption]);

  return <div ref={containerRef} className={cn("w-full", className)} style={{ height }} />;
}

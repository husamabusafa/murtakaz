"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { EChartsOption } from "echarts";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

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
  const { theme } = useTheme();

  const resolvedOption = useMemo<EChartsOption>(() => {
    const isDark = theme === "dark";
    return {
      backgroundColor: "transparent",
      darkMode: isDark,
      textStyle: {
        color: isDark ? "#e2e8f0" : "#0f172a",
        fontFamily: 'Tajawal, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
      },
      color: [
        "#60a5fa",
        "#34d399",
        "#a78bfa",
        "#fb7185",
        "#fbbf24",
        "#22c55e",
        "#38bdf8",
      ],
      ...option,
    };
  }, [option, theme]);

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

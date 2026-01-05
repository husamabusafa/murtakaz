"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { EChart } from "@/components/charts/echart";

export function KpiGauge({
  value,
  target,
  unit,
  height = 180,
}: {
  value: number | null | undefined;
  target: number | null | undefined;
  unit?: string | null;
  height?: number;
}) {
  const option = useMemo<EChartsOption>(() => {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    const safeTarget = typeof target === "number" && Number.isFinite(target) && target > 0 ? target : null;

    const max = safeTarget ?? Math.max(100, Math.abs(safeValue) * 1.25);
    const ratio = safeTarget ? safeValue / safeTarget : 0;

    const red = 0.6;
    const amber = 0.9;

    return {
      series: [
        {
          type: "gauge",
          min: 0,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: "100%",
          center: ["50%", "58%"],
          splitNumber: 4,
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [red, "rgba(248,113,113,0.85)"],
                [amber, "rgba(251,191,36,0.85)"],
                [1, "rgba(52,211,153,0.85)"],
              ],
            },
          },
          pointer: { length: "62%", width: 5 },
          axisTick: { distance: -18, splitNumber: 2, lineStyle: { color: "rgba(226,232,240,0.45)", width: 1 } },
          splitLine: { distance: -18, length: 10, lineStyle: { color: "rgba(226,232,240,0.6)", width: 2 } },
          axisLabel: { color: "rgba(226,232,240,0.6)", distance: 14 },
          detail: {
            valueAnimation: true,
            color: "#e2e8f0",
            fontSize: 20,
            fontWeight: 700,
            offsetCenter: [0, "26%"],
            formatter: (val: number) => {
              const display = Number.isFinite(val) ? val : 0;
              return `${display}${unit ?? ""}`;
            },
          },
          title: {
            color: "rgba(226,232,240,0.75)",
            fontSize: 12,
            offsetCenter: [0, "6%"],
            show: Boolean(safeTarget),
            formatter: () => (safeTarget ? `Target: ${safeTarget}${unit ?? ""}` : ""),
          },
          data: [{ value: safeValue }],
          progress: { show: true, width: 14, roundCap: true, itemStyle: { color: ratio >= amber ? "rgba(52,211,153,0.85)" : ratio >= red ? "rgba(251,191,36,0.85)" : "rgba(248,113,113,0.85)" } },
        },
      ],
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: "rgba(2,6,23,0.9)",
        borderColor: "rgba(255,255,255,0.12)",
      },
    };
  }, [target, unit, value]);

  return <EChart option={option} height={height} />;
}

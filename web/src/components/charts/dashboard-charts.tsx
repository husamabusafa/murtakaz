"use client";

import type { EChartsOption } from "echarts";
import { EChart } from "@/components/charts/echart";

function axisStyles() {
  return {
    axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
    axisTick: { show: false },
    axisLabel: { color: "rgba(226,232,240,0.75)" },
    splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)" } },
  } as const;
}

export function SparkLine({
  values,
  height = 72,
  color = "#60a5fa",
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  const option: EChartsOption = {
    grid: { left: 0, right: 0, top: 6, bottom: 0 },
    xAxis: { type: "category", show: false, data: values.map((_, idx) => `${idx}`) },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color },
        areaStyle: { color: "rgba(96,165,250,0.18)" },
      },
    ],
    tooltip: { trigger: "axis", confine: true, backgroundColor: "rgba(2,6,23,0.9)", borderColor: "rgba(255,255,255,0.12)" },
  };
  return <EChart option={option} height={height} />;
}

export function Donut({
  items,
  height = 240,
}: {
  items: { name: string; value: number; color: string }[];
  height?: number;
}) {
  const option: EChartsOption = {
    tooltip: { trigger: "item", confine: true, backgroundColor: "rgba(2,6,23,0.9)", borderColor: "rgba(255,255,255,0.12)" },
    legend: { bottom: 0, textStyle: { color: "rgba(226,232,240,0.75)" } },
    series: [
      {
        type: "pie",
        radius: ["58%", "78%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 10, borderColor: "rgba(2,6,23,0.35)", borderWidth: 2 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 6 },
        data: items.map((item) => ({ ...item, itemStyle: { color: item.color } })),
      },
    ],
  };
  return <EChart option={option} height={height} />;
}

export function Bar({
  categories,
  values,
  height = 260,
  color = "#34d399",
  formatter,
}: {
  categories: string[];
  values: number[];
  height?: number;
  color?: string;
  formatter?: (value: number) => string;
}) {
  const base = axisStyles();
  const option: EChartsOption = {
    grid: { left: 18, right: 12, top: 14, bottom: 28, containLabel: true },
    xAxis: { type: "category", data: categories, ...base, axisLabel: { ...base.axisLabel, interval: 0 } },
    yAxis: { type: "value", ...base },
    series: [
      {
        type: "bar",
        data: values,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [10, 10, 4, 4], color },
      },
    ],
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "rgba(2,6,23,0.9)",
      borderColor: "rgba(255,255,255,0.12)",
      valueFormatter: formatter ? (val) => formatter(Number(val)) : undefined,
    },
  };
  return <EChart option={option} height={height} />;
}


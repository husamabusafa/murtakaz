"use client";

import { graphic, type EChartsOption } from "echarts";
import { EChart } from "@/components/charts/echart";
import { useTheme } from "@/providers/theme-provider";

function axisStyles(isDark: boolean) {
  return {
    axisLine: { lineStyle: { color: isDark ? "rgba(148,163,184,0.22)" : "rgba(15,23,42,0.16)" } },
    axisTick: { show: false },
    axisLabel: { color: isDark ? "rgba(226,232,240,0.70)" : "rgba(15,23,42,0.70)" },
    splitLine: { lineStyle: { color: isDark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.08)" } },
  } as const;
}

function tooltipStyles(isDark: boolean) {
  return {
    backgroundColor: isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.95)",
    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.10)",
    textStyle: { color: isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.92)", fontSize: 12 },
    extraCssText: "border-radius: 14px; box-shadow: 0 18px 60px rgba(0,0,0,0.28); padding: 10px 12px;",
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isDark ? "rgba(96,165,250,0.26)" : "rgba(59,130,246,0.18)" },
            { offset: 1, color: "rgba(0,0,0,0)" },
          ]),
        },
      },
    ],
    tooltip: {
      trigger: "axis",
      confine: true,
      ...tooltipStyles(isDark),
    },
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const option: EChartsOption = {
    tooltip: { trigger: "item", confine: true, ...tooltipStyles(isDark) },
    legend: { bottom: 0, textStyle: { color: isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.70)" } },
    series: [
      {
        type: "pie",
        radius: ["62%", "86%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 12, borderColor: isDark ? "rgba(2,6,23,0.35)" : "rgba(255,255,255,0.65)", borderWidth: 2 },
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const base = axisStyles(isDark);
  const fill = new graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color },
    { offset: 1, color: isDark ? "rgba(2,6,23,0.0)" : "rgba(255,255,255,0.0)" },
  ]);
  const option: EChartsOption = {
    grid: { left: 10, right: 10, top: 18, bottom: 28, containLabel: true },
    xAxis: { type: "category", data: categories, ...base, axisLabel: { ...base.axisLabel, interval: 0 } },
    yAxis: { type: "value", ...base },
    series: [
      {
        type: "bar",
        data: values,
        barMaxWidth: 56,
        itemStyle: { borderRadius: [10, 10, 6, 6], color: fill },
        emphasis: {
          itemStyle: {
            shadowBlur: 18,
            shadowColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(2,6,23,0.12)",
          },
        },
      },
    ],
    tooltip: {
      trigger: "axis",
      confine: true,
      ...tooltipStyles(isDark),
      valueFormatter: formatter ? (val) => formatter(Number(val)) : undefined,
    },
  };
  return <EChart option={option} height={height} />;
}

export function AreaLine({
  categories,
  values,
  height = 260,
  color = "#60a5fa",
  formatter,
}: {
  categories: string[];
  values: number[];
  height?: number;
  color?: string;
  formatter?: (value: number) => string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const base = axisStyles(isDark);

  const option: EChartsOption = {
    grid: { left: 18, right: 12, top: 18, bottom: 28, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      ...base,
      axisLabel: { ...base.axisLabel, interval: 0 },
    },
    yAxis: { type: "value", ...base },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2.5, color },
        itemStyle: { color, borderColor: isDark ? "rgba(2,6,23,0.6)" : "rgba(255,255,255,0.9)", borderWidth: 2 },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isDark ? "rgba(96,165,250,0.28)" : "rgba(59,130,246,0.20)" },
            { offset: 1, color: "rgba(0,0,0,0)" },
          ]),
        },
      },
    ],
    tooltip: {
      trigger: "axis",
      confine: true,
      ...tooltipStyles(isDark),
      valueFormatter: formatter ? (val) => formatter(Number(val)) : undefined,
    },
  };

  return <EChart option={option} height={height} />;
}


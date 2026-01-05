"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { EChart } from "@/components/charts/echart";

type KpiGaugeProps = {
  value: number | null | undefined;
  target: number | null | undefined;
  unit?: string | null;
  height?: number;
  theme?: "dark" | "light";
  withCard?: boolean;
  label?: string; // optional subtitle under the number
};

export function KpiGauge({
  value,
  target,
  unit,
  height = 200,
  theme = "dark",
  withCard = true,
  label = "Current",
}: KpiGaugeProps) {
  const option = useMemo<EChartsOption>(() => {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    const safeTarget =
      typeof target === "number" && Number.isFinite(target) && target > 0 ? target : null;

    const max = safeTarget ?? Math.max(100, Math.abs(safeValue) * 1.25);
    const ratio = safeTarget ? safeValue / safeTarget : 0;

    // thresholds
    const red = 0.6;
    const amber = 0.9;

    const isDark = theme === "dark";

    // surfaces / text
    const textStrong = isDark ? "#e5e7eb" : "#0f172a";
    const textMuted = isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.65)";
    const gridLine = isDark ? "rgba(226,232,240,0.18)" : "rgba(15,23,42,0.12)";
    const track = isDark ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.08)";

    // status colors
    const cRed = "rgba(248,113,113,0.92)";
    const cAmber = "rgba(251,191,36,0.95)";
    const cGreen = "rgba(52,211,153,0.92)";

    const status =
      ratio >= amber ? "On track" : ratio >= red ? "At risk" : safeTarget ? "Off track" : "—";

    const statusColor = ratio >= amber ? cGreen : ratio >= red ? cAmber : cRed;

    // progress gradient (subtle modern look)
    const progressColor = {
      type: "linear",
      x: 0,
      y: 0,
      x2: 1,
      y2: 0,
      colorStops: [
        { offset: 0, color: "rgba(255,255,255,0.08)" },
        { offset: 0.25, color: statusColor },
        { offset: 1, color: "rgba(255,255,255,0.10)" },
      ],
    } as const;

    const fmt = (n: number) => {
      if (!Number.isFinite(n)) return "0";
      // nice compact formatting for big numbers
      const abs = Math.abs(n);
      if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
      if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
      // keep integers clean
      return Number.isInteger(n) ? `${n}` : `${n.toFixed(2)}`;
    };

    return {
      backgroundColor: "transparent",
      animationDuration: 850,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        confine: true,
        appendToBody: true,
        backgroundColor: isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.95)",
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)",
        borderWidth: 1,
        textStyle: { color: textStrong, fontSize: 12 },
        extraCssText:
          "border-radius: 14px; box-shadow: 0 18px 60px rgba(0,0,0,0.28); padding: 10px 12px;",
        formatter: () => {
          const v = safeValue;
          const t = safeTarget;
          const pct = t ? `${Math.round((v / t) * 100)}%` : "—";
          return `
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; gap:14px;">
                <span style="opacity:.75;">Value</span>
                <b>${fmt(v)}${unit ?? ""}</b>
              </div>
              ${
                t
                  ? `<div style="display:flex; justify-content:space-between; gap:14px;">
                       <span style="opacity:.75;">Target</span>
                       <b>${fmt(t)}${unit ?? ""}</b>
                     </div>
                     <div style="display:flex; justify-content:space-between; gap:14px;">
                       <span style="opacity:.75;">Progress</span>
                       <b>${pct}</b>
                     </div>`
                  : ""
              }
              <div style="margin-top:2px; display:flex; align-items:center; gap:8px;">
                <span style="width:8px; height:8px; border-radius:999px; background:${statusColor}; display:inline-block;"></span>
                <span style="opacity:.85;">${status}</span>
              </div>
            </div>
          `;
        },
      },
      series: [
        // Outer “halo” ring for depth
        {
          type: "gauge",
          min: 0,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: "104%",
          center: ["50%", "58%"],
          pointer: { show: false },
          progress: { show: false },
          axisLine: {
            lineStyle: {
              width: 2,
              color: [[1, isDark ? "rgba(226,232,240,0.10)" : "rgba(15,23,42,0.10)"]],
              shadowBlur: 14,
              shadowColor: isDark ? "rgba(56,189,248,0.18)" : "rgba(2,132,199,0.12)",
              shadowOffsetY: 2,
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          title: { show: false },
          silent: true,
          z: 1,
        },

        // Main gauge
        {
          type: "gauge",
          min: 0,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: "100%",
          center: ["50%", "58%"],
          splitNumber: 4,

          // Track
          axisLine: {
            lineStyle: {
              width: 16,
              color: [[1, track]],
              cap: "round",
            },
          },

          // Progress
          progress: {
            show: true,
            width: 16,
            roundCap: true,
            itemStyle: {
              color: progressColor as any,
              shadowBlur: 16,
              shadowColor: statusColor,
            },
          },

          // Pointer + anchor (more modern than a thick needle)
          pointer: {
            icon: "path://M2,0 L-2,0 L0,-70 Z",
            width: 10,
            length: "55%",
            itemStyle: {
              color: isDark ? "rgba(226,232,240,0.85)" : "rgba(15,23,42,0.82)",
              shadowBlur: 10,
              shadowColor: "rgba(0,0,0,0.25)",
            },
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 12,
            itemStyle: {
              color: isDark ? "rgba(2,6,23,0.6)" : "rgba(255,255,255,0.8)",
              borderWidth: 3,
              borderColor: statusColor,
              shadowBlur: 12,
              shadowColor: statusColor,
            },
          },

          // Ticks / splits
          axisTick: {
            distance: -20,
            splitNumber: 2,
            lineStyle: { color: gridLine, width: 1 },
          },
          splitLine: {
            distance: -20,
            length: 12,
            lineStyle: { color: isDark ? "rgba(226,232,240,0.30)" : "rgba(15,23,42,0.20)", width: 2 },
          },
          axisLabel: {
            color: textMuted,
            distance: 18,
            fontSize: 11,
            formatter: (v: number) => {
              // Only show key labels (0, target-ish, max) to keep it clean
              if (Math.abs(v - 0) < 1e-9) return "0";
              if (safeTarget && Math.abs(v - safeTarget) / max < 0.02) return "T";
              if (Math.abs(v - max) / max < 0.02) return fmt(max);
              return "";
            },
          },

          // Center text (value + unit + label + status)
          detail: {
            valueAnimation: true,
            offsetCenter: [0, "18%"],
            formatter: (val: number) => {
              const v = Number.isFinite(val) ? val : 0;
              const u = unit ?? "";
              const tgtLine = safeTarget ? `{muted|Target ${fmt(safeTarget)}${u}}` : `{muted| }`;
              return [
                `{value|${fmt(v)}${u}}`,
                `{label|${label}}`,
                tgtLine,
                `{status|${status}}`,
              ].join("\n");
            },
            rich: {
              value: {
                color: textStrong,
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 30,
              },
              label: {
                color: textMuted,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 18,
              },
              muted: {
                color: textMuted,
                fontSize: 11,
                lineHeight: 16,
              },
              status: {
                color: statusColor,
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 16,
              },
            },
          },

          title: { show: false },
          data: [{ value: safeValue }],
          z: 2,
        },
      ],
    };
  }, [height, label, target, theme, unit, value]);

  const Chart = <EChart option={option} height={height} />;

  if (!withCard) return Chart;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
      {/* soft glow */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      {Chart}
    </div>
  );
}

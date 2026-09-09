"use client";

import { motion } from "framer-motion";
import { useId } from "react";

import { useLocale } from "@/lib/locale-context";

/**
 * The small demand-trend line on a career card.
 *
 * Draws itself once on mount. It is decorative in the strict sense — the
 * numbers behind it are an illustration of a demand rating rather than
 * measured market data, and the detail page says so — so it is hidden from
 * assistive technology and carries a plain-language title instead of exposing
 * five meaningless index values.
 */
export default function Sparkline({
  values,
  width = 64,
  height = 22,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const { t, dir } = useLocale();
  const gradientId = useId();

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 2) - 1;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const rising = values[values.length - 1] >= values[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={rising ? t.careers.trendRising : t.careers.trendSteady}
      // Mirrored in RTL so the line still reads left-to-right as "over time"
      // in the direction the rest of the page flows.
      style={{ transform: dir === "rtl" ? "scaleX(-1)" : undefined }}
      className="shrink-0 overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <motion.path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="2"
        fill="var(--brand)"
      />
    </svg>
  );
}

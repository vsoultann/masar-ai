"use client";

import { motion, useReducedMotion } from "framer-motion";

import CountUp from "@/components/CountUp";

/**
 * The circular match-percentage indicator on a recommendation card.
 *
 * The ring is decorative — the percentage inside it is the accessible value —
 * so the SVG is hidden from assistive technology and the number carries the
 * meaning.
 */
export default function MatchRing({
  value,
  size = 64,
  stroke = 6,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(100, value)) / 100;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduced ? circumference * (1 - fraction) : circumference }}
          animate={{ strokeDashoffset: circumference * (1 - fraction) }}
          transition={{ duration: reduced ? 0 : 1.1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-black">
        <CountUp value={value} decimals={0} suffix="%" />
      </span>
    </div>
  );
}

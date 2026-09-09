"use client";

import { useId } from "react";

/**
 * The Masar mark.
 *
 * "Masar" (مسار) means path, so the mark is a path: a route that starts at a
 * point, turns, and arrives at a larger one. It sits inside an eight-point
 * Islamic star — the same motif used across the generated career artwork and
 * the animated background, so the identity is one idea repeated rather than
 * three unrelated ones.
 *
 * Drawn on a 48-unit grid with a 4-unit safe margin, which is what lets it stay
 * legible at 20px in the header and at 512px as an app icon. It inherits the
 * active colour scheme through --brand rather than hardcoding green, so the
 * mark follows the palette the student picked.
 */
export default function Logo({
  size = 36,
  className = "",
  /** Solid tile for app icons and the map markers; transparent for the header. */
  filled = true,
  title,
}: {
  size?: number;
  className?: string;
  filled?: boolean;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`lg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      {filled && <rect width="48" height="48" rx="12" fill={`url(#lg-${uid})`} />}

      {/* The eight-point star: two squares at 45 degrees. */}
      <g
        fill="none"
        stroke={filled ? "var(--brand-ink)" : "var(--brand)"}
        strokeOpacity={filled ? 0.34 : 0.28}
        strokeWidth="1.6"
      >
        <rect x="12" y="12" width="24" height="24" rx="2" />
        <rect x="12" y="12" width="24" height="24" rx="2" transform="rotate(45 24 24)" />
      </g>

      {/* The path itself: start point, a turn, and the destination. */}
      <g
        fill="none"
        stroke={filled ? "var(--brand-ink)" : "var(--brand)"}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 33 C 16 24, 32 26, 32 17" />
      </g>
      <circle cx="16" cy="33" r="3" fill={filled ? "var(--brand-ink)" : "var(--brand)"} />
      <circle
        cx="32"
        cy="16"
        r="5"
        fill={filled ? "var(--brand-ink)" : "var(--brand)"}
        fillOpacity="0.92"
      />
    </svg>
  );
}

"use client";

import { useId } from "react";

import { seedOf } from "@/components/art/palette";

/**
 * Generated campus artwork for an institution.
 *
 * No real campus photographs or crests are shipped — those are the
 * institutions' property, and this is a public student project. These are
 * original stylised skylines instead: a dome, a tower cluster or a workshop
 * roofline depending on the institution *type*, over a shared desert horizon
 * with palms.
 *
 * Type drives the silhouette so a federal university does not look like a
 * technical academy, and the id drives the variation — building heights, palm
 * placement, sky warmth — so no two campuses in a grid of fifty are identical.
 * Deliberately abstract: it must not read as a depiction of a specific real
 * building, because it is not one.
 */

const W = 400;
const H = 250;

const TYPE_TINT: Record<string, { from: string; to: string; ink: string; accent: string }> = {
  federal_public:       { from: "#0f5132", to: "#04231a", ink: "#03170f", accent: "#79d9a4" },
  local_public:         { from: "#0e7490", to: "#04202a", ink: "#031820", accent: "#7dd3e8" },
  private:              { from: "#7c5e10", to: "#241d05", ink: "#1b1604", accent: "#e8cb7a" },
  international_branch: { from: "#4c1d95", to: "#140629", ink: "#0f0420", accent: "#c3aaf5" },
  technical:            { from: "#374151", to: "#14171c", ink: "#0e1013", accent: "#b8c4d4" },
};

function Palm({ x, y, scale, colour }: { x: number; y: number; scale: number; colour: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={colour} fill="none" strokeLinecap="round">
      <path d="M0 0 q3 -22 -1 -38" strokeWidth="2.6" />
      <g strokeWidth="2.2">
        <path d="M-1 -38 q-16 -9 -25 -3 M-1 -38 q16 -11 26 -4 M-1 -38 q-10 -17 -24 -19 M-1 -38 q12 -17 26 -16 M-1 -38 q1 -18 -3 -24" />
      </g>
    </g>
  );
}

export default function CampusArt({
  type,
  seed,
  className = "",
}: {
  type: string;
  seed: string;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const tint = TYPE_TINT[type] ?? TYPE_TINT.federal_public;
  const n = seedOf(seed);

  const horizon = 190;
  // Building heights vary per institution but stay within a band, so the
  // skylines differ without any one looking broken.
  const heights = [0, 1, 2, 3, 4].map((i) => 46 + ((n >> (i * 3)) % 46));
  const domeWide = type === "federal_public" || type === "local_public";
  const palmX = 40 + (n % 30);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id={`csky-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={tint.from} />
          <stop offset="100%" stopColor={tint.to} />
        </linearGradient>
        <linearGradient id={`cglow-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={tint.accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={tint.accent} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`cclip-${uid}`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>

      <g clipPath={`url(#cclip-${uid})`}>
        <rect width={W} height={H} fill={`url(#csky-${uid})`} />
        <circle cx={320 - (n % 40)} cy={62} r="22" fill={tint.accent} opacity="0.5" />
        <rect y={horizon - 90} width={W} height="90" fill={`url(#cglow-${uid})`} />

        {/* Skyline. The dome marks the public institutions; the branch campuses
            get a glazed tower; technical academies get a sawtooth workshop. */}
        <g fill={tint.ink}>
          {domeWide ? (
            <>
              <rect x="150" y={horizon - heights[2]} width="104" height={heights[2]} />
              <path
                d={`M150 ${horizon - heights[2]} q52 -46 104 0 Z`}
                fill={tint.ink}
              />
              <rect x="198" y={horizon - heights[2] - 62} width="8" height="26" />
              <circle cx="202" cy={horizon - heights[2] - 66} r="5" fill={tint.accent} opacity="0.9" />
            </>
          ) : type === "technical" ? (
            <>
              <rect x="140" y={horizon - heights[2]} width="128" height={heights[2]} />
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={i}
                  d={`M${140 + i * 32} ${horizon - heights[2]} l16 -20 l16 20 Z`}
                  fill={tint.ink}
                />
              ))}
            </>
          ) : (
            <>
              <rect x="164" y={horizon - heights[2] - 34} width="72" height={heights[2] + 34} />
              <path d={`M164 ${horizon - heights[2] - 34} l36 -26 l36 26 Z`} fill={tint.ink} />
            </>
          )}

          <rect x="66" y={horizon - heights[0]} width="70" height={heights[0]} />
          <rect x="268" y={horizon - heights[3]} width="62" height={heights[3]} />
          <rect x="336" y={horizon - heights[4] * 0.7} width="48" height={heights[4] * 0.7} />
          <rect x="18" y={horizon - heights[1] * 0.6} width="44" height={heights[1] * 0.6} />
        </g>

        {/* Lit windows: the same deterministic seed, so a campus keeps its
            pattern between renders. */}
        <g fill={tint.accent} opacity="0.55">
          {Array.from({ length: 26 }, (_, i) => {
            const col = i % 7;
            const row = Math.floor(i / 7);
            const lit = ((n >> i) & 3) !== 0;
            if (!lit) return null;
            return (
              <rect
                key={i}
                x={74 + col * 38 + (row % 2) * 5}
                y={horizon - 34 - row * 16}
                width="7"
                height="9"
                rx="1"
              />
            );
          })}
        </g>

        <Palm x={palmX} y={horizon + 6} scale={1.15} colour={tint.accent} />
        <Palm x={W - palmX - 22} y={horizon + 12} scale={0.9} colour={tint.accent} />

        <path
          d={`M0 ${horizon} q80 -14 160 -2 q90 14 170 -6 q40 -10 70 2 V${H} H0 Z`}
          fill={tint.ink}
          opacity="0.95"
        />
        <path
          d={`M0 ${horizon + 26} q110 -16 210 4 q100 18 190 -6 V${H} H0 Z`}
          fill={tint.to}
          opacity="0.9"
        />
      </g>
    </svg>
  );
}

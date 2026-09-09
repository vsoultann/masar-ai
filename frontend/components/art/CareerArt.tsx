"use client";

import { useId, type ReactNode } from "react";

import { DEFAULT_ART, SECTOR_ART, seedOf, type ArtPalette } from "@/components/art/palette";

/**
 * Original generated artwork for a career card.
 *
 * This project ships no photographs: the repository is public and academic, and
 * committing scraped or unlicensed images would be indefensible. The brief's
 * own fallback — "generate an original SVG illustration" — is what this is.
 *
 * Every scene is built from the same three layers so a grid of them reads as
 * one set rather than eighteen unrelated pictures:
 *
 *   1. a sector-tinted sky gradient,
 *   2. a shared desert horizon and arabesque lattice, which is what makes the
 *      whole catalog feel like one place,
 *   3. a motif specific to the sector.
 *
 * Within a sector, the star field and horizon offset vary deterministically by
 * career id, so 45 healthcare cards are recognisably a family without being 45
 * identical images. Nothing is random: the same career always draws the same
 * picture, which matters because these are also the social preview images.
 *
 * If the team later drops real photographs into public/images, SmartImage
 * prefers them and this becomes the fallback it was designed to be.
 */

const W = 400;
const H = 250;

function Motif({ sector, p }: { sector: string; p: ArtPalette }): ReactNode {
  const a = p.accent;
  const g = p.glow;

  switch (sector) {
    case "ai_data":
      return (
        <g>
          {[[150, 96], [250, 78], [200, 130], [118, 148], [282, 140], [200, 60]].map(
            ([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="4.5" fill={a} />
                <circle cx={x} cy={y} r="11" fill={a} opacity="0.16" />
              </g>
            ),
          )}
          <g stroke={a} strokeWidth="1.1" opacity="0.55" fill="none">
            <path d="M150 96 L250 78 M150 96 L200 130 M250 78 L200 130 M200 130 L118 148 M200 130 L282 140 M150 96 L200 60 M250 78 L200 60" />
          </g>
        </g>
      );

    case "cybersecurity":
      return (
        <g>
          <path
            d="M200 62 L252 84 V128 c0 30 -22 52 -52 62 c-30 -10 -52 -32 -52 -62 V84 Z"
            fill={g}
            opacity="0.24"
            stroke={a}
            strokeWidth="2"
          />
          <rect x="185" y="112" width="30" height="24" rx="4" fill={a} />
          <path d="M191 112 v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke={a} strokeWidth="2.6" />
          <g stroke={a} strokeWidth="1" opacity="0.4">
            <path d="M120 100 h34 M120 130 h24 M246 100 h34 M256 130 h24" />
          </g>
        </g>
      );

    case "software":
      return (
        <g>
          <rect x="126" y="70" width="148" height="104" rx="9" fill={g} opacity="0.2" stroke={a} strokeWidth="1.8" />
          <path d="M126 92 h148" stroke={a} strokeWidth="1.4" opacity="0.6" />
          {[138, 150, 162].map((x) => (
            <circle key={x} cx={x} cy="81" r="3" fill={a} opacity="0.75" />
          ))}
          <g stroke={a} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M172 118 l-14 14 l14 14" />
            <path d="M228 118 l14 14 l-14 14" />
            <path d="M208 112 l-16 46" opacity="0.7" />
          </g>
        </g>
      );

    case "energy":
      return (
        <g>
          <circle cx="286" cy="76" r="24" fill={a} opacity="0.85" />
          <circle cx="286" cy="76" r="36" fill={a} opacity="0.16" />
          <g stroke={a} strokeWidth="2.4" strokeLinecap="round">
            <path d="M150 176 V104" />
            <path d="M150 104 L118 74 M150 104 L192 92 M150 104 L140 148" />
          </g>
          <circle cx="150" cy="104" r="5" fill={a} />
          <g fill={g} opacity="0.6">
            <path d="M196 172 l24 -26 h44 l-24 26 Z" />
            <path d="M230 172 l24 -26 h44 l-24 26 Z" />
          </g>
        </g>
      );

    case "aviation":
      return (
        <g>
          <path
            d="M112 152 l86 -26 l22 -38 c4 -7 14 -7 16 1 l8 33 l50 -15 c8 -2 12 8 5 13 l-44 32 l6 34 c1 8 -9 12 -13 5 l-18 -30 l-84 26 c-8 2 -12 -8 -5 -13 Z"
            fill={a}
            opacity="0.92"
          />
          <path d="M96 178 q60 -14 118 -30" stroke={a} strokeWidth="1.6" opacity="0.35" fill="none" strokeDasharray="5 7" />
          <circle cx="316" cy="66" r="3" fill={a} opacity="0.6" />
        </g>
      );

    case "space":
      return (
        <g>
          <circle cx="292" cy="80" r="30" fill={g} opacity="0.5" />
          <ellipse cx="292" cy="80" rx="48" ry="12" fill="none" stroke={a} strokeWidth="2" opacity="0.7" transform="rotate(-18 292 80)" />
          <path
            d="M176 168 c-12 -34 -4 -66 24 -88 c28 22 36 54 24 88 Z"
            fill={a}
            opacity="0.9"
          />
          <circle cx="200" cy="112" r="8" fill={p.skyFrom} />
          <path d="M176 156 l-16 20 l22 -6 Z M224 156 l16 20 l-22 -6 Z" fill={g} />
          <path d="M192 178 q8 20 16 0" fill={a} opacity="0.55" />
        </g>
      );

    case "healthcare":
      return (
        <g>
          <path
            d="M96 132 h56 l14 -30 l20 62 l18 -46 l14 24 h86"
            fill="none"
            stroke={a}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g opacity="0.28" fill={g}>
            <rect x="252" y="72" width="18" height="54" rx="4" />
            <rect x="234" y="90" width="54" height="18" rx="4" />
          </g>
        </g>
      );

    case "finance":
      return (
        <g>
          <g stroke={a} strokeWidth="2.4" strokeLinecap="round">
            {[[132, 150, 176], [162, 120, 168], [192, 132, 156], [222, 96, 140], [252, 108, 128], [282, 74, 116]].map(
              ([x, top, bottom], i) => (
                <g key={i}>
                  <path d={`M${x} ${top} V${bottom}`} />
                  <rect x={x - 7} y={top + 8} width="14" height={Math.max(8, (bottom - top) * 0.55)} fill={a} opacity="0.55" stroke="none" />
                </g>
              ),
            )}
          </g>
          <path d="M120 172 L300 88" stroke={g} strokeWidth="2" opacity="0.65" strokeDasharray="6 6" fill="none" />
        </g>
      );

    case "tourism":
      return (
        <g>
          <circle cx="292" cy="72" r="26" fill={a} opacity="0.85" />
          <g stroke={a} strokeWidth="3.2" strokeLinecap="round" fill="none">
            <path d="M150 178 q4 -46 -2 -66" />
            <path d="M148 112 q-28 -16 -44 -4 M148 112 q28 -20 46 -6 M148 112 q-16 -30 -40 -32 M148 112 q22 -30 46 -26" />
          </g>
          <circle cx="148" cy="110" r="5" fill={g} />
        </g>
      );

    case "construction":
      return (
        <g>
          <g stroke={a} strokeWidth="2.6" fill="none" strokeLinejoin="round">
            <path d="M138 180 V72 h6 l100 -12" />
            <path d="M144 72 l-34 22" />
            <path d="M244 60 v34" />
          </g>
          <rect x="230" y="94" width="28" height="22" fill={g} opacity="0.75" />
          <g fill={a} opacity="0.35">
            <rect x="272" y="118" width="34" height="62" />
            <rect x="312" y="140" width="26" height="40" />
          </g>
        </g>
      );

    case "logistics":
      return (
        <g>
          <path d="M104 168 h196 l-20 26 h-156 Z" fill={a} opacity="0.85" />
          <g opacity="0.75">
            <rect x="140" y="126" width="40" height="20" fill={g} />
            <rect x="186" y="126" width="40" height="20" fill={a} opacity="0.7" />
            <rect x="163" y="102" width="40" height="20" fill={g} />
          </g>
          <path d="M96 194 q40 10 80 0 q40 -10 80 0 q40 10 80 0" stroke={a} strokeWidth="1.8" fill="none" opacity="0.45" />
        </g>
      );

    case "government":
      return (
        <g>
          <path d="M200 58 q34 24 34 46 h-68 q0 -22 34 -46 Z" fill={a} opacity="0.85" />
          <rect x="150" y="106" width="100" height="8" fill={a} opacity="0.7" />
          <g fill={g} opacity="0.65">
            {[160, 186, 212, 234].map((x) => (
              <rect key={x} x={x} y="118" width="12" height="52" />
            ))}
          </g>
          <rect x="140" y="172" width="120" height="10" fill={a} opacity="0.8" />
        </g>
      );

    case "education":
      return (
        <g>
          <path d="M200 70 l84 34 l-84 34 l-84 -34 Z" fill={a} opacity="0.9" />
          <path d="M148 122 v34 q52 26 104 0 v-34" fill={g} opacity="0.45" stroke={a} strokeWidth="1.6" />
          <path d="M284 104 v42" stroke={a} strokeWidth="2" />
          <circle cx="284" cy="150" r="5" fill={a} />
        </g>
      );

    case "media":
      return (
        <g>
          <circle cx="200" cy="120" r="46" fill="none" stroke={a} strokeWidth="2.4" />
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * Math.PI) / 3;
            return (
              <path
                key={i}
                d={`M200 120 L${200 + Math.cos(angle) * 46} ${120 + Math.sin(angle) * 46}`}
                stroke={a}
                strokeWidth="2"
                opacity="0.6"
              />
            );
          })}
          <circle cx="200" cy="120" r="16" fill={g} opacity="0.8" />
        </g>
      );

    case "entrepreneurship":
      return (
        <g>
          <path d="M200 66 c22 0 38 17 38 38 c0 17 -10 24 -14 34 h-48 c-4 -10 -14 -17 -14 -34 c0 -21 16 -38 38 -38 Z" fill={a} opacity="0.85" />
          <rect x="186" y="146" width="28" height="7" rx="3" fill={g} />
          <rect x="189" y="158" width="22" height="6" rx="3" fill={g} opacity="0.7" />
          <g stroke={a} strokeWidth="2" opacity="0.5" strokeLinecap="round">
            <path d="M132 82 l16 10 M268 82 l-16 10 M120 130 h18 M262 130 h18" />
          </g>
        </g>
      );

    case "engineering":
      return (
        <g>
          {[[168, 118, 34], [246, 96, 24], [232, 158, 18]].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={a} strokeWidth="3" />
              <circle cx={cx} cy={cy} r={r * 0.35} fill={g} opacity="0.7" />
              {Array.from({ length: 8 }, (_, k) => {
                const angle = (k * Math.PI) / 4;
                return (
                  <rect
                    key={k}
                    x={cx + Math.cos(angle) * r - 3}
                    y={cy + Math.sin(angle) * r - 3}
                    width="6"
                    height="6"
                    fill={a}
                    opacity="0.85"
                  />
                );
              })}
            </g>
          ))}
        </g>
      );

    case "law":
      return (
        <g>
          <path d="M200 64 v100" stroke={a} strokeWidth="3" />
          <path d="M138 92 h124" stroke={a} strokeWidth="3" />
          <circle cx="200" cy="64" r="5" fill={a} />
          <g fill={g} opacity="0.55" stroke={a} strokeWidth="1.6">
            <path d="M138 92 l-18 34 h36 Z" />
            <path d="M262 92 l-18 34 h36 Z" />
          </g>
          <rect x="172" y="164" width="56" height="10" rx="3" fill={a} opacity="0.85" />
        </g>
      );

    case "social":
      return (
        <g>
          {[[160, 108], [240, 108], [200, 150]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y - 16} r="12" fill={a} opacity="0.9" />
              <path d={`M${x - 20} ${y + 22} q20 -26 40 0 Z`} fill={g} opacity="0.7" />
            </g>
          ))}
          <g stroke={a} strokeWidth="1.6" opacity="0.5">
            <path d="M172 104 h56 M168 122 l24 20 M232 122 l-24 20" />
          </g>
        </g>
      );

    default:
      return (
        <g>
          <circle cx="200" cy="118" r="40" fill="none" stroke={a} strokeWidth="2.6" />
          <circle cx="200" cy="118" r="16" fill={g} opacity="0.7" />
        </g>
      );
  }
}

export default function CareerArt({
  sector,
  seed,
  className = "",
}: {
  sector: string;
  seed: string;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const p = SECTOR_ART[sector] ?? DEFAULT_ART;
  const n = seedOf(seed);

  // Deterministic variation: horizon height, star placement, lattice offset.
  const horizon = 186 + ((n >> 3) % 12);
  const latticeX = (n % 40) - 20;
  const stars = Array.from({ length: 9 }, (_, i) => ({
    x: ((n >> (i + 1)) % 380) + 10,
    y: ((n >> (i + 3)) % 110) + 12,
    r: ((n >> (i + 5)) % 3) * 0.5 + 0.7,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={p.skyTo} />
          <stop offset="100%" stopColor={p.skyFrom} />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="0.72" cy="0.28" r="0.6">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.5" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${uid})`}>
        <rect width={W} height={H} fill={`url(#sky-${uid})`} />
        <rect width={W} height={H} fill={`url(#glow-${uid})`} />

        {stars.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill={p.accent} opacity="0.5" />
        ))}

        {/* The eight-point star lattice that ties every scene together. */}
        <g
          opacity="0.1"
          stroke={p.accent}
          strokeWidth="0.9"
          fill="none"
          transform={`translate(${latticeX} -18)`}
        >
          {[0, 96, 192, 288, 384].map((x) =>
            [0, 96, 192].map((y) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                <rect x="20" y="20" width="56" height="56" />
                <rect x="20" y="20" width="56" height="56" transform="rotate(45 48 48)" />
              </g>
            )),
          )}
        </g>

        <Motif sector={sector} p={p} />

        {/* Shared desert horizon: two dune layers, drawn over the motif's feet
            so the illustration sits *in* the landscape rather than on top. */}
        <path
          d={`M0 ${horizon} q70 -22 140 -6 q80 18 150 -10 q60 -22 110 -2 V${H} H0 Z`}
          fill={p.land}
          opacity="0.92"
        />
        <path
          d={`M0 ${horizon + 22} q90 -18 180 2 q90 20 220 -8 V${H} H0 Z`}
          fill={p.skyFrom}
          opacity="0.85"
        />
      </g>
    </svg>
  );
}

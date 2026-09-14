"use client";

import { useState } from "react";

import CampusArt from "@/components/art/CampusArt";
import CareerArt from "@/components/art/CareerArt";
import { asset } from "@/lib/paths";

/**
 * An image that is never broken.
 *
 * Most of the ~200 photographs this project references do not exist in the repo
 * yet -- the team sources them separately (see scripts/fetch-images.md), and we
 * deliberately ship no scraped or copyrighted files. So the missing-image case
 * is the normal case, not the edge case, and it has to look deliberate.
 *
 * When src is null, or the file 404s at runtime, this renders a generated
 * placeholder instead: a gradient derived from a hash of the entity id (so the
 * same career is always the same colour), the entity's initials, and an
 * optional icon. Cards look finished either way.
 */

/** FNV-1a. Small, fast, and stable across reloads -- unlike Math.random. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return Math.abs(value);
}

/**
 * Hues are pulled from a curated band rather than the full wheel: the palette
 * is UAE green through teal and gulf blue, so a random hue would clash.
 */
const HUE_BAND = [128, 140, 150, 162, 174, 188, 200, 210] as const;

function initialsOf(label: string): string {
  const words = label
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Generated artwork to draw when there is no photograph. */
export type ArtSpec =
  | { kind: "career"; sector: string }
  | { kind: "campus"; type: string };

export default function SmartImage({
  src,
  alt,
  seed,
  className = "",
  aspect = "16 / 10",
  icon,
  rounded = true,
  art,
  credit,
}: {
  /** Path under /public, or null when the team has not supplied a photo. */
  src?: string | null;
  alt: string;
  /** Stable id so the generated placeholder does not change between renders. */
  seed?: string;
  className?: string;
  aspect?: string;
  icon?: React.ReactNode;
  rounded?: boolean;
  /**
   * What to draw when no photo exists. Without this the fallback is the
   * gradient-and-initials tile, which is fine for an avatar but reads as a
   * missing image on a card that should show a place or a job.
   */
  art?: ArtSpec;
  /**
   * Attribution for the photograph, rendered over it.
   *
   * Not optional in spirit: every photograph this project ships is CC BY or
   * CC BY-SA, and those licences are conditional on crediting the photographer.
   * An uncredited CC BY image is simply an unlicensed one. It renders only when
   * the real photo renders — a generated fallback has nobody to credit.
   */
  credit?: { source: string; license: string; url: string; author?: string } | null;
}) {
  const [failed, setFailed] = useState(false);
  const key = seed ?? alt;
  const showPlaceholder = !src || failed;

  if (showPlaceholder && art) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative overflow-hidden ${
          rounded ? "rounded-[var(--radius-card)]" : ""
        } ${className}`}
        style={{ aspectRatio: aspect }}
      >
        {art.kind === "career" ? (
          <CareerArt sector={art.sector} seed={key} className="h-full w-full" />
        ) : (
          <CampusArt type={art.type} seed={key} className="h-full w-full" />
        )}
      </div>
    );
  }

  if (showPlaceholder) {
    const h = hash(key);
    const hue = HUE_BAND[h % HUE_BAND.length];
    const hue2 = HUE_BAND[(h >> 3) % HUE_BAND.length];
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative grid place-items-center overflow-hidden ${
          rounded ? "rounded-[var(--radius-card)]" : ""
        } ${className}`}
        style={{
          aspectRatio: aspect,
          background: `linear-gradient(135deg,
            hsl(${hue} 46% 32%) 0%,
            hsl(${hue2} 38% 22%) 100%)`,
        }}
      >
        {/* A faint arabesque lattice so the placeholder reads as designed
            rather than as an empty coloured box. */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full opacity-[0.13]"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <g fill="none" stroke="#ffffff" strokeWidth="0.6">
            <rect x="28" y="28" width="44" height="44" />
            <rect
              x="28"
              y="28"
              width="44"
              height="44"
              transform="rotate(45 50 50)"
            />
            <circle cx="50" cy="50" r="30" />
          </g>
        </svg>
        <div className="relative flex flex-col items-center gap-1 text-white/90">
          {icon ? <span className="opacity-90">{icon}</span> : null}
          <span className="text-lg font-semibold tracking-wide">
            {initialsOf(alt)}
          </span>
        </div>
      </div>
    );
  }

  const image = (
    // A plain <img> rather than next/image: the optimizer is a server feature
    // and images are already `unoptimized` under static export, so next/image
    // would add weight without adding anything.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${
        rounded ? "rounded-[var(--radius-card)]" : ""
      } ${className}`}
      style={{ aspectRatio: aspect, width: "100%" }}
    />
  );

  if (!credit) return image;

  return (
    <div className={`relative ${rounded ? "rounded-[var(--radius-card)] overflow-hidden" : ""}`}>
      {image}
      {/* Bottom-right, small, and over a gradient rather than a solid bar:
          the credit is a legal requirement, not a caption anyone came to
          read, so it has to be present and legible without competing with
          the photograph. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-1.5 pt-6">
        <p className="text-end text-[10px] leading-tight text-white/85">
          <a
            href={credit.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="pointer-events-auto underline decoration-white/40 underline-offset-2"
          >
            {credit.author ? `${credit.author} · ` : ""}
            {credit.source}
          </a>
          {" · "}
          {credit.license}
        </p>
      </div>
    </div>
  );
}

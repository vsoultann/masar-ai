/**
 * Artwork palettes, one per sector.
 *
 * Each is a four-stop ramp: two for the sky gradient, one for the mid-ground
 * silhouette, one accent for the motif. They are derived from the sector
 * colours in the catalog but darkened and desaturated for the sky, because a
 * card's artwork has to sit *behind* text without competing with it.
 */

export interface ArtPalette {
  skyFrom: string;
  skyTo: string;
  land: string;
  accent: string;
  glow: string;
}

export const SECTOR_ART: Record<string, ArtPalette> = {
  ai_data:          { skyFrom: "#04231a", skyTo: "#0b6b45", land: "#052a20", accent: "#5ce6a6", glow: "#22c98a" },
  cybersecurity:    { skyFrom: "#04121f", skyTo: "#0b3d5c", land: "#04182a", accent: "#5ec8f0", glow: "#2b8fc4" },
  software:         { skyFrom: "#052018", skyTo: "#12684a", land: "#06251c", accent: "#7ee8b4", glow: "#25a06f" },
  energy:           { skyFrom: "#0d2207", skyTo: "#2f7a1e", land: "#112b0a", accent: "#b6e86a", glow: "#74c034" },
  aviation:         { skyFrom: "#041823", skyTo: "#155e75", land: "#05202e", accent: "#7dd3e8", glow: "#2d9cba" },
  space:            { skyFrom: "#0a0a20", skyTo: "#2e2b6e", land: "#0d0c26", accent: "#a99cf5", glow: "#6b5fd6" },
  healthcare:       { skyFrom: "#04202a", skyTo: "#0e7490", land: "#052733", accent: "#79e2f2", glow: "#2ab0cc" },
  finance:          { skyFrom: "#231a04", skyTo: "#8a6d1f", land: "#2a2008", accent: "#f0d78a", glow: "#c9a83f" },
  tourism:          { skyFrom: "#2a1604", skyTo: "#b45309", land: "#331c07", accent: "#fbc27a", glow: "#e08a2e" },
  construction:     { skyFrom: "#241d05", skyTo: "#7c5e10", land: "#2b2409", accent: "#e8cb7a", glow: "#c09a2e" },
  logistics:        { skyFrom: "#04161f", skyTo: "#1d4e6f", land: "#051d29", accent: "#84c5e8", glow: "#3183ad" },
  government:       { skyFrom: "#04190f", skyTo: "#0f5132", land: "#052014", accent: "#79d9a4", glow: "#2a9d63" },
  education:        { skyFrom: "#150a2a", skyTo: "#6d28d9", land: "#1a0d33", accent: "#c4a8ff", glow: "#8b5cf6" },
  media:            { skyFrom: "#2a0616", skyTo: "#9d174d", land: "#330a1c", accent: "#f8a8c8", glow: "#d94a80" },
  entrepreneurship: { skyFrom: "#2a0808", skyTo: "#b91c1c", land: "#330c0c", accent: "#fca5a5", glow: "#e05252" },
  engineering:      { skyFrom: "#14171c", skyTo: "#374151", land: "#191d23", accent: "#b8c4d4", glow: "#6b7a8f" },
  law:              { skyFrom: "#140629", skyTo: "#4c1d95", land: "#190a31", accent: "#c3aaf5", glow: "#7c53d4" },
  social:           { skyFrom: "#031a13", skyTo: "#065f46", land: "#04211a", accent: "#6ee7b7", glow: "#25a37a" },
};

export const DEFAULT_ART: ArtPalette = SECTOR_ART.ai_data;

/** FNV-1a: stable per-id variation that never shifts between renders. */
export function seedOf(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
}

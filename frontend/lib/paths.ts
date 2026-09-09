/**
 * Anything served from /public must go through here.
 *
 * In production the site lives under /masar-ai, so a bare "/images/x.jpg" would
 * 404 on GitHub Pages while working perfectly in development. asset() prefixes
 * the base path so the same string is correct in both places.
 *
 * Links between pages do NOT need this -- next/link applies basePath itself.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  if (!path) return path;
  // Leave absolute URLs and data URIs alone.
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const basePath = BASE;

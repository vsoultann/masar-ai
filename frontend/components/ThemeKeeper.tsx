"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

import { applyDisplaySettings } from "@/lib/theme";

/**
 * Puts the display settings back after a navigation that removes them.
 *
 * `ThemeScript` sets `data-theme`, `data-scheme` and `data-ui` on `<html>`
 * before the first paint, but it runs once per document load. Moving between
 * locales re-renders the locale layout, React reconciles the `<html>` element
 * it owns against a server tree that has none of those attributes, and strips
 * them — so a dark page turned white the moment a student switched to Arabic,
 * along with their chosen accent colour and interface style.
 *
 * `useLayoutEffect`, not `useEffect`: it runs after the DOM is updated but
 * before the browser paints, so the attributes are restored within the same
 * frame that removed them and nothing flashes. It renders nothing.
 */
export default function ThemeKeeper() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    applyDisplaySettings();
  }, [pathname]);

  return null;
}

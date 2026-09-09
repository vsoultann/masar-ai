"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import LivingBackground, {
  type BackgroundTheme,
} from "@/components/background/LivingBackground";
import { useSettings } from "@/lib/store/settings";

/**
 * Picks a background theme from the current route, unless the visitor has
 * chosen one explicitly in settings.
 *
 * The mapping is thematic rather than decorative: Constellation is the
 * "data being processed" theme and belongs to the assessment and results
 * journey; Dunes is the calm marketing/landing theme; Arabesque sits behind
 * the browsing and reference pages where content density is highest and the
 * background needs to recede furthest.
 */
function themeForPath(pathname: string): BackgroundTheme {
  // Drop the /en or /ar segment before matching.
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";

  if (rest === "/" || rest.startsWith("/about")) return "dunes";
  if (
    rest.startsWith("/assessment") ||
    rest.startsWith("/onboarding") ||
    rest.startsWith("/results") ||
    rest.startsWith("/skills") ||
    rest.startsWith("/model") ||
    rest.startsWith("/dashboard")
  ) {
    return "constellation";
  }
  return "arabesque";
}

export default function BackgroundForRoute() {
  const pathname = usePathname() ?? "/";
  const preference = useSettings((state) => state.background);

  // The persisted store is empty on the server and on the first client render.
  // Rendering the route default until it rehydrates keeps markup identical on
  // both sides and avoids a hydration mismatch.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const routeTheme = themeForPath(pathname);
  const theme =
    hydrated && preference !== "auto" ? preference : routeTheme;

  return <LivingBackground theme={theme} />;
}

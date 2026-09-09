"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import LivingBackground, {
  type BackgroundTheme,
} from "@/components/background/LivingBackground";
import { useScheme } from "@/lib/store/scheme";
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

  // The landing page gets the liveliest scene: it is the one screen whose job
  // is to make an impression before anyone has read a word.
  if (rest === "/") return "aurora";
  if (rest.startsWith("/about")) return "dunes";
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
  const ui = useScheme((state) => state.ui);

  // The persisted store is empty on the server and on the first client render.
  // Rendering the route default until it rehydrates keeps markup identical on
  // both sides and avoids a hydration mismatch.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const routeTheme = themeForPath(pathname);

  // The interface style overrides the route default, because the style is an
  // explicit choice and the route default is only a guess:
  //
  //  - Liquid glass is transparent by design, so it needs something worth
  //    seeing through it. Aurora everywhere, on every route.
  //  - Minimalist means quiet. Arabesque is the most restrained of the four,
  //    and its slow geometry does not fight flat opaque panels.
  //
  // A background chosen explicitly in settings still wins over both.
  const styleTheme: BackgroundTheme | null =
    ui === "glass" ? "aurora" : ui === "minimal" ? "arabesque" : null;

  const theme =
    hydrated && preference !== "auto"
      ? preference
      : (hydrated && styleTheme) || routeTheme;

  return <LivingBackground theme={theme} />;
}

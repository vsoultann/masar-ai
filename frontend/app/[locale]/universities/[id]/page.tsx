import type { Metadata } from "next";

import { universityIds } from "@/lib/data/build";
import { locales } from "@/lib/i18n";

import UniversityDetailView from "./UniversityDetailView";

/**
 * Pre-renders /[locale]/universities/[id] for every institution.
 *
 * Static export cannot resolve a dynamic segment on request, so each page has
 * to exist as a file. This is also what makes /universities/uaeu/ load as a
 * deep link instead of 404ing.
 */
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    universityIds().map((id) => ({ locale, id })),
  );
}

export const metadata: Metadata = { title: "Institution" };

export default function UniversityDetailPage() {
  return <UniversityDetailView />;
}

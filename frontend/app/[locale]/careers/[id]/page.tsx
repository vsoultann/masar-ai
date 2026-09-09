import type { Metadata } from "next";

import { careerIds } from "@/lib/data/build";
import { locales } from "@/lib/i18n";

import CareerDetailView from "./CareerDetailView";

/**
 * Pre-renders /[locale]/careers/[id] for every career in the catalog.
 *
 * Static export has no server to resolve a dynamic segment on request, so each
 * page has to exist as a real file at build time. This is also what makes a
 * deep link such as /careers/radiologist/ load directly instead of 404ing.
 */
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    careerIds().map((id) => ({ locale, id })),
  );
}

export const metadata: Metadata = {
  title: "Career",
};

export default function CareerDetailPage() {
  return <CareerDetailView />;
}

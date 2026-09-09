import careers from "@/public/data/careers.json";
import courses from "@/public/data/courses.json";
import sectors from "@/public/data/sectors.json";
import universities from "@/public/data/universities.json";

/**
 * Build-time catalog access, for generateStaticParams only.
 *
 * Importing the JSON pulls it into whatever bundle the importer belongs to, so
 * this module must never be reached from a client component -- it would ship
 * the entire catalog to the browser. Client code fetches the same files over
 * HTTP through lib/data/client.ts instead, which keeps them out of the JS
 * bundle and lets the browser cache them separately from the app code.
 *
 * The rule: `lib/data/build.ts` is for server components, `lib/data/client.ts`
 * is for everything else.
 */

interface IdOnly {
  id: string;
}

export function careerIds(): string[] {
  return (careers as IdOnly[]).map((career) => career.id);
}

export function courseIds(): string[] {
  return (courses as IdOnly[]).map((course) => course.id);
}

export function universityIds(): string[] {
  return (universities as IdOnly[]).map((university) => university.id);
}

export function sectorIds(): string[] {
  return (sectors as IdOnly[]).map((sector) => sector.id);
}

export const catalogCounts = {
  universities: (universities as IdOnly[]).length,
  careers: (careers as IdOnly[]).length,
  courses: (courses as IdOnly[]).length,
  sectors: (sectors as IdOnly[]).length,
};

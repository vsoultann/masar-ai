"use client";

import { asset } from "@/lib/paths";
import type { Career, Course } from "@/lib/types";

/**
 * Runtime catalog access for the browser.
 *
 * There is no API server any more, so the catalogs are plain JSON files served
 * as static assets. Each file is fetched at most once per page load and then
 * held in a module-level cache -- several components on the results page want
 * the career catalog, and refetching it per component would be wasteful even
 * though the browser would serve it from its own cache.
 *
 * In-flight requests are cached too, not just settled ones, so five components
 * mounting in the same tick share one request rather than starting five.
 */

const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(file: string): Promise<T> {
  const url = asset(`/data/${file}`);
  const existing = cache.get(url);
  if (existing) return existing as Promise<T>;

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load ${file} (${response.status})`);
      }
      return response.json() as Promise<T>;
    })
    .catch((error) => {
      // Drop the rejected promise so a later attempt can retry rather than
      // replaying the same failure forever.
      cache.delete(url);
      throw error;
    });

  cache.set(url, request);
  return request;
}

export const loadCareers = () => loadJson<Career[]>("careers.json");
export const loadCourses = () => loadJson<Course[]>("courses.json");

export async function loadCareer(id: string): Promise<Career | null> {
  const careers = await loadCareers();
  return careers.find((career) => career.id === id) ?? null;
}

export async function loadCoursesForSkills(
  skills: string[],
  perSkill = 3,
): Promise<Course[]> {
  const courses = await loadCourses();
  const seen = new Set<string>();
  const picked: Course[] = [];

  for (const skill of skills) {
    const matches = courses
      .filter((course) => skill in (course.skills ?? {}))
      .sort((a, b) => (b.skills[skill] ?? 0) - (a.skills[skill] ?? 0))
      .slice(0, perSkill);
    for (const course of matches) {
      if (seen.has(course.id)) continue;
      seen.add(course.id);
      picked.push(course);
    }
  }

  return picked;
}

/* -------------------------------------------------------------------------
   Joins
   -------------------------------------------------------------------------
   The FastAPI backend used to expand a career's sector, skill and initiative
   ids into full objects before sending it. With the server gone, that join
   moves here so the presentation components keep the shape they already
   expect and did not need rewriting.
   ------------------------------------------------------------------------- */

import type { Initiative, Sector, Skill } from "@/lib/types";

export const loadSectors = () => loadJson<Sector[]>("sectors.json");
export const loadSkills = () => loadJson<Skill[]>("skills.json");
export const loadInitiatives = () => loadJson<Initiative[]>("initiatives.json");

function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

/** Attaches sector_detail, skill_detail and initiative_detail to a career. */
export async function hydrateCareer(career: Career): Promise<Career> {
  const [sectors, skills, initiatives] = await Promise.all([
    loadSectors(),
    loadSkills(),
    loadInitiatives(),
  ]);

  const skillsById = byId(skills);
  const initiativesById = byId(initiatives);

  return {
    ...career,
    sector_detail: byId(sectors).get(career.sector),
    // Heaviest requirement first: the detail page renders these as a list of
    // meters, and an unsorted list buries what actually matters for the role.
    skill_detail: Object.entries(career.skills)
      .sort((a, b) => b[1] - a[1])
      .map(([id, weight]) => {
        const skill = skillsById.get(id);
        return skill ? { ...skill, weight } : null;
      })
      .filter((row): row is Skill & { weight: number } => row !== null),
    initiative_detail: career.initiatives
      .map((id) => initiativesById.get(id))
      .filter((row): row is Initiative => row !== undefined),
  };
}

/** The detail page's one call: fetch, join, done. */
export async function loadCareerDetail(id: string): Promise<Career | null> {
  const career = await loadCareer(id);
  return career ? hydrateCareer(career) : null;
}

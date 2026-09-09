"use client";

import { asset } from "@/lib/paths";
import type {
  Career, CareerSummary, Course, Initiative, Major, Questionnaire,
  Sector, Skill, University,
} from "@/lib/types";

/**
 * Runtime catalog access for the browser.
 *
 * There is no API server, so the catalogs are static JSON. Two things matter:
 *
 *  1. **Fetch the index, not the catalog.** careers-index.json is 39 KB
 *     gzipped and carries what a card renders; careers.json is 139 KB and
 *     carries every long description in both languages. A grid must never pull
 *     the second one.
 *  2. **Share in-flight requests.** The cache holds the promise, not just the
 *     settled value, so five components mounting in the same tick issue one
 *     request between them rather than five.
 */

const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(file: string): Promise<T> {
  const url = asset(`/data/${file}`);
  const existing = cache.get(url);
  if (existing) return existing as Promise<T>;

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
      return response.json() as Promise<T>;
    })
    .catch((error) => {
      // Drop the rejected promise so a retry is possible rather than replaying
      // the same failure for the rest of the session.
      cache.delete(url);
      throw error;
    });

  cache.set(url, request);
  return request;
}

export const loadCareerIndex = () => loadJson<CareerSummary[]>("careers-index.json");
export const loadCareers = () => loadJson<Career[]>("careers.json");
export const loadCourses = () => loadJson<Course[]>("courses.json");
export const loadUniversities = () => loadJson<University[]>("universities.json");
export const loadMajors = () => loadJson<Major[]>("majors.json");
export const loadSectors = () => loadJson<Sector[]>("sectors.json");
export const loadSkills = () => loadJson<Skill[]>("skills.json");
export const loadInitiatives = () => loadJson<Initiative[]>("initiatives.json");
export const loadRiasec = () => loadJson<Questionnaire>("questionnaire_riasec.json");
export const loadBigFive = () => loadJson<Questionnaire>("questionnaire_bigfive.json");

export async function loadCareer(id: string): Promise<Career | null> {
  const careers = await loadCareers();
  return careers.find((career) => career.id === id) ?? null;
}

export async function loadUniversity(id: string): Promise<University | null> {
  const universities = await loadUniversities();
  return universities.find((university) => university.id === id) ?? null;
}

/** id -> row, for the many places that need to resolve a reference. */
export function indexBy<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function loadCoursesByIds(ids: string[]): Promise<Course[]> {
  const courses = indexBy(await loadCourses());
  return ids.map((id) => courses.get(id)).filter((c): c is Course => c !== undefined);
}

export async function loadCareersByIds(ids: string[]): Promise<CareerSummary[]> {
  const careers = indexBy(await loadCareerIndex());
  return ids
    .map((id) => careers.get(id))
    .filter((c): c is CareerSummary => c !== undefined);
}

/**
 * Courses that teach the given skills, best first.
 *
 * Ranked by the course's proficiency gain weighted by how large the student's
 * gap in that skill is, so a strong course in a skill they already have never
 * outranks a decent course in one they lack.
 */
export async function loadCoursesForGaps(
  gaps: { skill: string; gap: number }[],
  limit = 8,
): Promise<Course[]> {
  const courses = await loadCourses();
  const weights = new Map(gaps.map((g) => [g.skill, g.gap]));

  return courses
    .map((course) => {
      let score = 0;
      for (const [skill, gain] of Object.entries(course.skills)) {
        score += gain * (weights.get(skill) ?? 0);
      }
      return { course, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.course);
}

import type { Career, InstitutionType, Profile, University } from "@/lib/types";

/**
 * Matches a recommended career to the institutions that teach it.
 *
 * The chain is career -> relatedMajors -> majorsOffered -> institution. Every
 * link is an id reference, and `validate-data` guarantees none of them dangles
 * — including that every career has at least one major somebody teaches, which
 * is the failure that would otherwise make this feature silently return an
 * empty list.
 *
 * Scoring weights are fixed here and documented in docs/ML_METHODOLOGY.md:
 *
 *   major match 0.40 + proximity 0.30 + eligibility 0.20 + type 0.10
 *
 * Eligibility is deliberately the smallest meaningful term. This is a guidance
 * tool for sixteen-year-olds, and burying an institution because a student is
 * currently a few percent below an indicative threshold would be both unkind
 * and wrong — the threshold is indicative, and their grades are not final.
 */

/** Approximate centroids, used when a student gives an emirate but no city. */
const EMIRATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  abu_dhabi: { lat: 24.4539, lng: 54.3773 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  sharjah: { lat: 25.3463, lng: 55.4209 },
  ajman: { lat: 25.4052, lng: 55.5136 },
  umm_al_quwain: { lat: 25.5647, lng: 55.5532 },
  ras_al_khaimah: { lat: 25.7895, lng: 55.9432 },
  fujairah: { lat: 25.1288, lng: 56.3265 },
};

/** Rough centres for the cities the wizard offers, where they differ. */
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  al_ain: { lat: 24.1302, lng: 55.8023 },
  al_dhafra: { lat: 23.6503, lng: 53.7006 },
  ruwais: { lat: 24.1103, lng: 52.7306 },
  hatta: { lat: 24.7996, lng: 56.1176 },
};

export type Eligibility = "likely_eligible" | "borderline" | "below_indicative";

export interface UniversityMatch {
  university: University;
  /** Majors this career needs that this institution actually teaches. */
  matchedMajors: string[];
  distanceKm: number | null;
  eligibility: Eligibility;
  score: number;
  group: "in_area" | "same_emirate" | "elsewhere";
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2
    + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Best available position for a student: exact, then city, then emirate. */
export function studentLocation(
  profile: Pick<Profile, "coordinates" | "city" | "emirate"> | null,
): { lat: number; lng: number } | null {
  if (!profile) return null;
  if (profile.coordinates) return profile.coordinates;
  if (profile.city && CITY_CENTROIDS[profile.city]) return CITY_CENTROIDS[profile.city];
  if (profile.emirate && EMIRATE_CENTROIDS[profile.emirate]) {
    return EMIRATE_CENTROIDS[profile.emirate];
  }
  return null;
}

/**
 * Compares a student against an institution's indicative requirements.
 *
 * Returns "borderline" rather than a rejection whenever they are close, and
 * treats missing information as borderline too: a student who has not entered
 * EmSAT scores has not failed anything, and the UI must not imply they have.
 */
export function assessEligibility(
  university: University,
  profile: Pick<Profile, "grades" | "emsat" | "track"> | null,
): Eligibility {
  if (!profile) return "borderline";

  const grades = Object.values(profile.grades ?? {}).filter((v) => typeof v === "number");
  if (grades.length === 0) return "borderline";

  const average = grades.reduce((a, b) => a + b, 0) / grades.length;
  const required = university.admission.minHighSchoolPercent;

  // Track is a gate rather than a score: some programmes genuinely are not open
  // to the general stream. It still only softens the verdict, never hardens it
  // past "below indicative".
  const trackOk =
    !profile.track
    || university.admission.trackRequired.length === 0
    || university.admission.trackRequired.includes(profile.track);

  let emsatShortfall = 0;
  let emsatChecked = 0;
  for (const [subject, threshold] of Object.entries(university.admission.emsatRequirements)) {
    const score = profile.emsat?.[subject];
    if (typeof score !== "number") continue;
    emsatChecked += 1;
    if (score < threshold) emsatShortfall += 1;
  }

  const meetsGrades = average >= required;
  const nearGrades = average >= required - 8;
  const emsatWeak = emsatChecked > 0 && emsatShortfall > emsatChecked / 2;

  if (meetsGrades && trackOk && !emsatWeak) return "likely_eligible";
  if (nearGrades || !trackOk || emsatWeak) return "borderline";
  return "below_indicative";
}

const ELIGIBILITY_SCORE: Record<Eligibility, number> = {
  likely_eligible: 1,
  borderline: 0.6,
  below_indicative: 0.2,
};

/**
 * Institution-type preference.
 *
 * Public and federal institutions score highest because they are the
 * affordable default for most UAE students; this is a small 0.10 term, so it
 * breaks ties rather than deciding the ranking.
 */
const TYPE_SCORE: Record<InstitutionType, number> = {
  federal_public: 1,
  local_public: 0.9,
  technical: 0.7,
  private: 0.6,
  international_branch: 0.55,
};

/** Beyond this, extra distance stops mattering much — the UAE is small. */
const DISTANCE_HORIZON_KM = 180;

export function matchUniversities(
  career: Pick<Career, "educationPath">,
  universities: University[],
  profile: Pick<Profile, "grades" | "emsat" | "track" | "emirate" | "city" | "coordinates"> | null,
): UniversityMatch[] {
  const wanted = new Set(career.educationPath.relatedMajors);
  const location = studentLocation(profile);

  const matches: UniversityMatch[] = [];

  for (const university of universities) {
    const matchedMajors = university.majorsOffered.filter((major) => wanted.has(major));
    if (matchedMajors.length === 0) continue;

    const distanceKm = location ? haversineKm(location, university.coordinates) : null;
    const eligibility = assessEligibility(university, profile);

    // Share of the career's majors this institution covers. An institution
    // teaching both routes into a career is a better answer than one teaching
    // only a partial route.
    const majorScore = matchedMajors.length / wanted.size;
    const proximityScore =
      distanceKm === null ? 0.5 : Math.max(0, 1 - distanceKm / DISTANCE_HORIZON_KM);

    const score =
      0.4 * majorScore
      + 0.3 * proximityScore
      + 0.2 * ELIGIBILITY_SCORE[eligibility]
      + 0.1 * TYPE_SCORE[university.type];

    const sameEmirate = profile?.emirate === university.emirate;
    const group: UniversityMatch["group"] =
      distanceKm !== null && distanceKm <= 35
        ? "in_area"
        : sameEmirate
          ? "same_emirate"
          : "elsewhere";

    matches.push({ university, matchedMajors, distanceKm, eligibility, score, group });
  }

  return matches.sort((a, b) => b.score - a.score);
}

const GROUP_ORDER: UniversityMatch["group"][] = ["in_area", "same_emirate", "elsewhere"];

/** The three presentation buckets, in order, with empty groups dropped. */
export function groupMatches(
  matches: UniversityMatch[],
): { group: UniversityMatch["group"]; matches: UniversityMatch[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    matches: matches.filter((match) => match.group === group),
  })).filter((bucket) => bucket.matches.length > 0);
}

/**
 * Shapes of the static catalogs in public/data, plus the client-side profile.
 *
 * v1 typed the FastAPI responses. v2 has no API: these describe the JSON files
 * the browser fetches directly, so a change to data/v2/build.py surfaces here
 * as a type error rather than as an undefined at runtime.
 */

export type Lang = "en" | "ar";

/** Every user-facing string in the catalogs is a bilingual pair. */
export interface Bilingual {
  en: string;
  ar: string;
}

export type Demand = "very_high" | "high" | "moderate";

/* ----------------------------------------------------------- AI resistance */

/** Bands run exposed -> anchored. The thresholds live in the glossary. */
export type ResistanceBand = "exposed" | "mixed" | "resilient" | "anchored";

/**
 * One career's exposure to automation.
 *
 * Carries the number and the *keys* that select the copy -- the phrasing is
 * identical across all 184 careers and lives in ai-resistance.json, because
 * repeating it per career added half a megabyte to a file phones download.
 */
export interface AiResistance {
  score: number;
  band: ResistanceBand;
  /** Phrasing groups for "what AI already does here", in the role's weight order. */
  exposedGroups: string[];
  /** Phrasing groups for "what holds". */
  protectedGroups: string[];
  /** Skill ids worth building to move the score up. */
  hedgeSkills: string[];
  /** The audit trail: each component's signed contribution to the score. */
  drivers: { id: string; effect: number }[];
}

/** The shared copy behind every aiResistance block. */
export interface AiResistanceGlossary {
  basis: Bilingual;
  method: Bilingual;
  bands: Record<ResistanceBand, { label: Bilingual; summary: Bilingual }>;
  groups: Record<string, { exposed: Bilingual; protected: Bilingual }>;
  drivers: Record<string, Bilingual>;
  thresholds: { from: number; band: ResistanceBand }[];
}

/* ------------------------------------------------------------ scholarships */

export type ScholarshipKind =
  | "government"
  | "university"
  | "employer"
  | "foundation"
  | "sector";

export type ScholarshipAudience = "uae_nationals" | "residents" | "all";

export type ScholarshipCoverage =
  | "full_plus_stipend"
  | "full_tuition"
  | "free_for_nationals"
  | "partial_tuition"
  | "sponsored_with_bond";

export type StudyLevel = "undergraduate" | "postgraduate";

export interface Scholarship {
  id: string;
  name: Bilingual;
  provider: Bilingual;
  kind: ScholarshipKind;
  audience: ScholarshipAudience;
  coverage: ScholarshipCoverage;
  levels: StudyLevel[];
  /** An emirate id, or "all" for a nationwide programme. */
  emirate: string;
  fields: string[];
  about: Bilingual;
  eligibility: {
    /** null where selection is by aptitude, portfolio or need rather than a score. */
    minHighSchoolPercent: number | null;
    trackRequired: string[];
    notes: Bilingual;
  };
  /** What the programme asks for in return — a service bond, typically. */
  obligation: Bilingual | null;
  relatedUniversities: string[];
  website: string;
  indicative: Bilingual;
}

export interface Sector {
  id: string;
  name_en: string;
  name_ar: string;
  color: string;
  career_count?: number;
}

export interface Skill {
  id: string;
  name_en: string;
  name_ar: string;
  family: string;
}

export interface Initiative {
  id: string;
  name_en: string;
  name_ar: string;
  summary_en: string;
  summary_ar: string;
}

export interface Major {
  id: string;
  name: Bilingual;
  family: string;
  level: string;
}

export interface RequiredSkill {
  skill: string;
  weight: number;
  requiredLevel: number;
}

export interface IdealProfile {
  riasec: Record<string, number>;
  bigfive: Record<string, number>;
  subjects: Record<string, number>;
}

export interface Career {
  id: string;
  title: Bilingual;
  sector: string;
  shortDescription: Bilingual;
  longDescription: Bilingual;
  dayInTheLife: Bilingual;
  requiredSkills: RequiredSkill[];
  idealProfile: IdealProfile;
  educationPath: {
    minimumQualification: Bilingual;
    typicalYears: number;
    relatedMajors: string[];
    licensingBodies: Bilingual[];
  };
  salaryAED: {
    entry: number;
    mid: number;
    senior: number;
    period: string;
    currency: string;
    note: Bilingual;
  };
  demandOutlook: Demand;
  growthTrend: number[];
  workEnvironment: string[];
  uaeRelevance: Bilingual;
  strategicInitiatives: string[];
  employers: { en: string[]; ar: string[] };
  media: {
    hero: string | null;
    thumbnail: string | null;
    icon: string;
    video: string | null;
    credit: { source: string; license: string; url: string } | null;
  };
  relatedCareers: string[];
  topCourses: string[];
  /** Flat skill weights, kept for the ML pipeline. */
  skills: Record<string, number>;
  demand: Demand;
  aiResistance: AiResistance;
}

/** The lightweight record card grids use, from careers-index.json. */
export interface CareerSummary {
  id: string;
  title: Bilingual;
  sector: string;
  shortDescription: Bilingual;
  demandOutlook: Demand;
  salary: { entry: number; senior: number };
  growthTrend: number[];
  icon: string;
  thumbnail: string | null;
  majors: string[];
  topSkills: string[];
  /** Score and band only — a card shows a badge, not the breakdown. */
  aiResistance: Pick<AiResistance, "score" | "band">;
}

export interface Course {
  id: string;
  title_en: string;
  title_ar: string;
  provider: string;
  provider_type: "global" | "uae";
  level: "beginner" | "intermediate" | "advanced";
  cost: "free" | "paid";
  language: Lang | "both";
  duration_weeks: number;
  skills: Record<string, number>;
  description_en: string;
  description_ar: string;
  search_query: string;
}

export type InstitutionType =
  | "federal_public"
  | "local_public"
  | "private"
  | "international_branch"
  | "technical";

export type TuitionBand =
  | "free_for_nationals"
  | "public_subsidised"
  | "mid"
  | "premium";

export interface University {
  id: string;
  name: Bilingual;
  shortName: Bilingual;
  type: InstitutionType;
  emirate: string;
  city: string;
  coordinates: { lat: number; lng: number };
  address: Bilingual;
  website: string;
  established: number;
  accreditation: string;
  languageOfInstruction: Lang[];
  majorsOffered: string[];
  admission: {
    minHighSchoolPercent: number;
    emsatRequirements: Record<string, number>;
    trackRequired: string[];
    notes: Bilingual;
  };
  tuitionBand: TuitionBand;
  campusLife: Bilingual;
  media: {
    hero: string | null;
    thumbnail: string | null;
    gallery: string[];
    credit: { source: string; license: string; url: string } | null;
  };
}

export interface QuestionnaireItem {
  id: string;
  dimension: string;
  reverse: boolean;
  text_en: string;
  text_ar: string;
}

export interface Questionnaire {
  id: string;
  name_en: string;
  name_ar: string;
  scale: { value: number; label_en: string; label_ar: string }[];
  dimensions: { code: string; name_en: string; name_ar: string }[];
  items: QuestionnaireItem[];
}

/** The locally stored student profile. There is no server account in v2. */
export interface Profile {
  id: string;
  version: 2;
  fullName: string;
  emirate: string | null;
  city: string | null;
  coordinates: { lat: number; lng: number } | null;
  locationSource: "manual" | "geolocation" | null;
  school: string | null;
  gradeLevel: string | null;
  track: string | null;
  grades: Record<string, number>;
  emsat: Record<string, number>;
  riasec: Record<string, number>;
  bigfive: Record<string, number>;
  riasecAnswers: Record<string, number>;
  bigfiveAnswers: Record<string, number>;
  completedSteps: number;
  savedCareers: string[];
  savedUniversities: string[];
  role: "student" | "admin";
  createdAt: string;
  updatedAt: string;
}

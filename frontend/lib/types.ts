/** Shapes returned by the FastAPI backend. Kept in one place so a change to
 *  the API surfaces as a type error rather than a runtime undefined. */

export type Lang = "en" | "ar";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "student" | "admin";
  preferred_language: Lang;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: User;
}

export interface Profile {
  full_name: string;
  emirate: string | null;
  school: string | null;
  grade_level: string | null;
  track: string | null;
  grades: Record<string, number>;
  emsat: Record<string, number>;
  riasec: Record<string, number>;
  bigfive: Record<string, number>;
  riasec_answers: Record<string, number>;
  bigfive_answers: Record<string, number>;
  completed_steps: number;
  is_complete: boolean;
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

export interface Career {
  id: string;
  title_en: string;
  title_ar: string;
  sector: string;
  demand: "very_high" | "high" | "moderate";
  description_en: string;
  description_ar: string;
  skills: Record<string, number>;
  salary_aed: { min: number; max: number; note_en: string; note_ar: string };
  degrees_en: string[];
  degrees_ar: string[];
  employers_en: string[];
  employers_ar: string[];
  initiatives: string[];
  sector_detail?: Sector;
  skill_detail?: (Skill & { weight: number })[];
  initiative_detail?: Initiative[];
}

export interface Course {
  id: string;
  title_en: string;
  title_ar: string;
  provider: string;
  provider_type: "global" | "uae";
  level: "beginner" | "intermediate" | "advanced";
  cost: "free" | "paid";
  language: "en" | "ar" | "both";
  duration_weeks: number;
  skills: Record<string, number>;
  description_en: string;
  description_ar: string;
  search_query: string;
}

export interface Reason {
  factor: string;
  label_en: string;
  label_ar: string;
  student_value: number;
  career_ideal: number;
  contribution: number;
}

export interface Recommendation {
  rank: number;
  career_id: string;
  sector: string;
  match: number;
  confidence: "high" | "moderate" | "low";
  components: {
    sector_probability: number;
    sector_score: number;
    similarity: number;
    demand: number;
  };
  reasons: Reason[];
  career: Career;
  sector_name_en: string;
  sector_name_ar: string;
  sector_color: string;
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  sector_probabilities: {
    sector: string;
    name_en: string;
    name_ar: string;
    color: string;
    probability: number;
  }[];
  model: { name: string; trained_at: string; weights: Record<string, number> };
}

export interface GapEntry {
  skill_id: string;
  name_en: string;
  name_ar: string;
  current: number;
  required: number;
  gap: number;
  priority: number;
}

export interface SkillGap {
  career_id: string;
  career_title_en: string;
  career_title_ar: string;
  skills: GapEntry[];
  readiness: number;
  strengths: string[];
  top_gaps: string[];
}

export interface RoadmapCourse extends Course {
  for_skill: string;
  skill_name_en: string;
  skill_name_ar: string;
  kind: "close_gap" | "strengthen";
}

export interface Roadmap {
  career_id: string;
  career_title_en: string;
  career_title_ar: string;
  readiness: number;
  total_courses: number;
  total_weeks: number;
  free_courses: number;
  phases: {
    id: string;
    label_en: string;
    label_ar: string;
    focus_skills: string[];
    courses: RoadmapCourse[];
  }[];
}

export interface EstimatedSkill {
  skill_id: string;
  name_en: string;
  name_ar: string;
  family: string;
  value: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  language: Lang;
  mode: string;
  created_at: string;
}

export interface ChatReply {
  reply: string;
  language: Lang;
  mode: string;
  suggestions: string[];
}

export interface AdminStats {
  users: {
    total: number;
    students: number;
    admins: number;
    profiles_completed: number;
    completion_rate: number;
  };
  activity: { recommendation_runs: number; saved_careers: number; chat_messages: number };
  catalog: { careers: number; courses: number; skills: number; sectors: number };
  most_recommended: { career_id: string; count: number; title_en: string; title_ar: string }[];
  sector_distribution: {
    sector: string;
    count: number;
    name_en: string;
    name_ar: string;
    color: string;
  }[];
  mentor_mode: string;
}

export interface AdminStudent {
  reference: string;
  emirate: string | null;
  track: string | null;
  grade_level: string | null;
  completed_steps: number;
  is_complete: boolean;
  registered_at: string;
  last_top_career: string | null;
  last_top_sector: string | null;
}

export interface ModelMetrics {
  available: boolean;
  generated_at?: string;
  dataset?: { rows: number; features: number; classes: string[] };
  protocol?: { split: string; cross_validation: string; seed: number };
  model_comparison?: Record<
    string,
    {
      cv_accuracy_mean: number;
      cv_accuracy_std: number;
      cv_macro_f1_mean: number;
      test: { accuracy: number; macro_f1: number };
    }
  >;
  selected_model?: {
    name: string;
    reason: string;
    test: {
      accuracy: number;
      macro_f1: number;
      per_sector: Record<
        string,
        { precision: number; recall: number; f1: number; support: number }
      >;
    };
  };
}

export interface ModelInfo {
  available: boolean;
  name?: string;
  trained_at?: string;
  labels?: string[];
  features?: number;
  dataset_rows?: number;
  seed?: number;
  sklearn_version?: string;
  skills_mapped?: number;
}

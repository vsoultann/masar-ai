import type { QuestionnaireItem } from "@/lib/types";

/**
 * Questionnaire scoring, ported from recommender.score_questionnaire.
 *
 * The backend used to do this. It is a small, exactly-specified calculation,
 * so it moves to the browser rather than becoming an approximation:
 *
 *  - reverse-keyed items are flipped (6 - x on the 1-5 Likert scale) before
 *    averaging, or a "I dislike working alone" item would count the wrong way;
 *  - each dimension is rescaled from its 1-5 mean onto 0-100;
 *  - unanswered items are skipped rather than treated as neutral, because a
 *    student who has answered eight of ten items has given eight opinions, not
 *    eight opinions plus two shrugs.
 *
 * A dimension with no answers at all falls back to 50 — the midpoint — since
 * the feature vector has to be complete for the model to score at all.
 */
export function scoreQuestionnaire(
  answers: Record<string, number>,
  items: QuestionnaireItem[],
): Record<string, number> {
  const buckets = new Map<string, number[]>();

  for (const item of items) {
    const raw = answers[item.id];
    if (raw === undefined || raw === null) continue;
    const value = item.reverse ? 6 - Number(raw) : Number(raw);
    const bucket = buckets.get(item.dimension);
    if (bucket) bucket.push(value);
    else buckets.set(item.dimension, [value]);
  }

  const scores: Record<string, number> = {};
  for (const dimension of new Set(items.map((item) => item.dimension))) {
    const values = buckets.get(dimension);
    if (!values || values.length === 0) {
      scores[dimension] = 50;
      continue;
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    scores[dimension] = Math.round(((mean - 1) / 4) * 100 * 10) / 10;
  }
  return scores;
}

/** Fraction of a questionnaire that has been answered, 0-1. */
export function completeness(
  answers: Record<string, number>,
  items: QuestionnaireItem[],
): number {
  if (items.length === 0) return 1;
  const answered = items.filter((item) => answers[item.id] !== undefined).length;
  return answered / items.length;
}

/**
 * Estimates current skill proficiency from the profile, mirroring
 * ml/skill_map.py. Weights live in the model bundle so the two cannot drift.
 */
export function estimateSkills(
  featureRow: Record<string, number>,
  weights: Record<string, Record<string, number>>,
  inverted: string[] = ["big5_N"],
): Record<string, number> {
  const estimates: Record<string, number> = {};

  for (const [skill, featureWeights] of Object.entries(weights)) {
    let totalWeight = 0;
    let totalValue = 0;
    for (const [feature, weight] of Object.entries(featureWeights)) {
      const raw = featureRow[feature];
      if (raw === undefined || Number.isNaN(raw)) continue;
      const value = inverted.includes(feature) ? 100 - raw : raw;
      totalValue += value * weight;
      totalWeight += weight;
    }
    // Renormalise by the weight actually used, so a student missing an EmSAT
    // score is not scored as though they had answered zero on it.
    estimates[skill] = totalWeight > 0
      ? Math.round((totalValue / totalWeight) * 10) / 10
      : 50;
  }
  return estimates;
}

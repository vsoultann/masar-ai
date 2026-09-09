/**
 * In-browser career recommendation.
 *
 * This is a direct port of ml/recommender.py. The Python pipeline remains the
 * thing that is trained and evaluated; this reproduces its *inference* so the
 * app can run with no server.
 *
 * The port must be exact, not approximate. Two test suites assert that against
 * the same 50 fixed profiles: ml/tests/test_parity.py generates expectations
 * from the Python implementation, and tests/inference-parity.test.ts checks
 * this implementation against them at a 1e-6 tolerance. If you change any
 * arithmetic here, regenerate the fixtures and expect the tolerance to hold —
 * a drift means the app is quietly giving different advice than the model that
 * was evaluated.
 *
 * The four stages, in order:
 *   1. profile  -> feature row      (defaults, EmSAT rescale, fallbacks)
 *   2. row      -> vector           (median impute, standardise, one-hot)
 *   3. vector   -> sector p(y|x)    (multinomial logistic regression)
 *   4. blend    -> ranked careers   (sector + centred cosine + demand)
 */

import { asset } from "@/lib/paths";

export interface StudentProfile {
  grades?: Record<string, number | null>;
  emsat?: Record<string, number | null>;
  riasec?: Record<string, number>;
  bigfive?: Record<string, number>;
  track?: string | null;
  emirate?: string | null;
}

export interface Reason {
  factor: string;
  label: { en: string; ar: string };
  studentValue: number;
  careerIdeal: number;
  contribution: number;
}

export interface Recommendation {
  rank: number;
  careerId: string;
  sector: string;
  match: number;
  confidence: "high" | "moderate" | "low";
  components: {
    sectorProbability: number;
    sectorScore: number;
    similarity: number;
    demand: number;
  };
  reasons: Reason[];
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  sectorProbabilities: Record<string, number>;
  model: { name: string; trainedAt: string; weights: Record<string, number> };
}

interface ModelBundle {
  contract: number;
  generatedFrom: { model: string; trainedAt: string; seed: number; datasetRows: number };
  features: {
    order: string[];
    numeric: string[];
    subjects: string[];
    tracks: string[];
    emirates: string[];
    emirateWeight: number;
    emsatMin: number;
    emsatMax: number;
    subjectDefault: number;
    questionnaireDefault: number;
  };
  preprocess: {
    imputerMedians: number[];
    scalerMean: number[];
    scalerScale: number[];
  };
  classifier: {
    classes: string[];
    coefficients: number[][];
    intercepts: number[];
  };
  similarity: {
    dimensions: string[];
    careerVectors: Record<string, number[]>;
    careerSectors: Record<string, string>;
    careerDemand: Record<string, string>;
  };
  blend: {
    sector: number;
    similarity: number;
    demand: number;
    demandScores: Record<string, number>;
  };
  featureLabels: Record<string, { en: string; ar: string }>;
  metrics: Record<string, unknown>;
}

const SUPPORTED_CONTRACT = 1;

let cached: Promise<ModelBundle> | null = null;

/** Fetches and caches model.v1.json. ~55 KB, so one fetch per session. */
export function loadModel(): Promise<ModelBundle> {
  if (!cached) {
    cached = fetch(asset("/model/model.v1.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`model load failed (${response.status})`);
        return response.json() as Promise<ModelBundle>;
      })
      .then((bundle) => {
        if (bundle.contract !== SUPPORTED_CONTRACT) {
          throw new Error(
            `model contract ${bundle.contract} is not supported by this build `
            + `(expected ${SUPPORTED_CONTRACT})`,
          );
        }
        return bundle;
      })
      .catch((error) => {
        cached = null;   // let a later attempt retry rather than replay the failure
        throw error;
      });
  }
  return cached;
}

/* ------------------------------------------------------------------ stage 1 */

const EMSAT_KEYS = ["english", "math", "physics", "arabic"] as const;
const RIASEC_KEYS = ["R", "I", "A", "S", "E", "C"] as const;
const BIGFIVE_KEYS = ["O", "C", "E", "A", "N"] as const;

/**
 * Builds the numeric feature row, mirroring pipeline.profile_to_row.
 *
 * NaN is used for a missing EmSAT score rather than 0, because the imputer has
 * to be able to tell "not provided" from "scored zero" — they mean opposite
 * things, and conflating them would push every student without EmSAT scores
 * towards the bottom of the distribution.
 */
export function profileToRow(
  profile: StudentProfile,
  features: ModelBundle["features"],
): { numeric: number[]; track: string; emirate: string } {
  const grades = profile.grades ?? {};
  const emsat = profile.emsat ?? {};
  const riasec = profile.riasec ?? {};
  const bigfive = profile.bigfive ?? {};

  const numeric: number[] = [];

  for (const subject of features.subjects) {
    const value = grades[subject];
    numeric.push(value === null || value === undefined ? features.subjectDefault : Number(value));
  }

  let provided = 0;
  const emsatValues: number[] = [];
  for (const key of EMSAT_KEYS) {
    const raw = emsat[key];
    if (raw === null || raw === undefined || raw === ("" as unknown as number)) {
      emsatValues.push(Number.NaN);
    } else {
      const scaled = Math.min(
        100,
        Math.max(0, ((Number(raw) - features.emsatMin) / (features.emsatMax - features.emsatMin)) * 100),
      );
      emsatValues.push(scaled);
      provided = 1;
    }
  }
  numeric.push(...emsatValues);

  for (const key of RIASEC_KEYS) {
    numeric.push(Number(riasec[key] ?? features.questionnaireDefault));
  }
  for (const key of BIGFIVE_KEYS) {
    numeric.push(Number(bigfive[key] ?? features.questionnaireDefault));
  }

  numeric.push(provided);

  const track = String(profile.track ?? "general").toLowerCase();
  const emirate = String(profile.emirate ?? "abu_dhabi").toLowerCase();

  return {
    numeric,
    track: features.tracks.includes(track) ? track : "general",
    emirate: features.emirates.includes(emirate) ? emirate : "abu_dhabi",
  };
}

/* ------------------------------------------------------------------ stage 2 */

/** Median impute, standardise, then append the two one-hot blocks. */
export function buildVector(profile: StudentProfile, bundle: ModelBundle): number[] {
  const { features, preprocess } = bundle;
  const row = profileToRow(profile, features);

  const vector: number[] = [];
  for (let i = 0; i < row.numeric.length; i++) {
    const raw = Number.isNaN(row.numeric[i]) ? preprocess.imputerMedians[i] : row.numeric[i];
    // A zero scale means the column was constant in training; scikit-learn
    // stores 1.0 there, but guard anyway rather than emit NaN.
    const scale = preprocess.scalerScale[i] || 1;
    vector.push((raw - preprocess.scalerMean[i]) / scale);
  }

  for (const track of features.tracks) vector.push(row.track === track ? 1 : 0);
  for (const emirate of features.emirates) {
    vector.push(row.emirate === emirate ? features.emirateWeight : 0);
  }

  return vector;
}

/* ------------------------------------------------------------------ stage 3 */

/**
 * Multinomial logistic regression: softmax(Xw + b).
 *
 * The max is subtracted before exponentiating. Without it a logit around 750
 * overflows to Infinity and the whole distribution becomes NaN; subtracting a
 * constant from every logit leaves the softmax unchanged.
 */
export function sectorProbabilities(
  vector: number[],
  bundle: ModelBundle,
): Record<string, number> {
  const { classes, coefficients, intercepts } = bundle.classifier;

  const logits = coefficients.map((row, k) => {
    let sum = intercepts[k];
    for (let i = 0; i < row.length; i++) sum += row[i] * vector[i];
    return sum;
  });

  const max = Math.max(...logits);
  const exponentials = logits.map((logit) => Math.exp(logit - max));
  const total = exponentials.reduce((a, b) => a + b, 0);

  const probabilities: Record<string, number> = {};
  classes.forEach((label, k) => {
    probabilities[label] = exponentials[k] / total;
  });
  return probabilities;
}

/* ------------------------------------------------------------------ stage 4 */

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Cosine similarity on mean-centred vectors, rescaled to [0, 1].
 *
 * Centring matters: raw cosine between two all-positive profile vectors sits
 * near 1 for every pair, so it cannot separate careers at all. Centring makes
 * the comparison about the *shape* of a profile rather than its magnitude.
 */
export function centeredCosine(a: number[], b: number[]): number {
  const aMean = mean(a);
  const bMean = mean(b);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - aMean;
    const db = b[i] - bMean;
    dot += da * db;
    normA += da * da;
    normB += db * db;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0.5;
  return (dot / denominator + 1) / 2;
}

/** The student's profile in the similarity layer's dimension order. */
function studentProfileVector(profile: StudentProfile, bundle: ModelBundle): number[] {
  const { features } = bundle;
  const row = profileToRow(profile, features);
  // profileToRow lays out subjects, then EmSAT, then RIASEC, then Big Five.
  // The similarity layer wants RIASEC, Big Five, subjects.
  const subjectCount = features.subjects.length;
  const riasecStart = subjectCount + EMSAT_KEYS.length;
  const bigfiveStart = riasecStart + RIASEC_KEYS.length;
  return [
    ...row.numeric.slice(riasecStart, riasecStart + RIASEC_KEYS.length),
    ...row.numeric.slice(bigfiveStart, bigfiveStart + BIGFIVE_KEYS.length),
    ...row.numeric.slice(0, subjectCount),
  ];
}

function explain(
  studentVector: number[],
  idealVector: number[],
  bundle: ModelBundle,
  topK = 3,
): Reason[] {
  const dimensions = bundle.similarity.dimensions;
  const studentMean = mean(studentVector);
  const idealMean = mean(idealVector);

  const rows = dimensions.map((dimension, index) => {
    const studentDeviation = studentVector[index] - studentMean;
    const careerDeviation = idealVector[index] - idealMean;
    return {
      index,
      dimension,
      studentDeviation,
      careerDeviation,
      contribution: studentDeviation * careerDeviation,
    };
  });

  // Contribution descending, then dimension index ascending. The explicit
  // tiebreak matches recommender.explain: a flat profile makes every
  // contribution equal, and without a defined tie order the two
  // implementations disagree on which factors to show.
  rows.sort((a, b) => b.contribution - a.contribution || a.index - b.index);

  const reasons: Reason[] = [];
  for (const row of rows) {
    if (reasons.length >= topK) break;
    if (row.contribution <= 0) break;
    // Two negative deviations also multiply to a positive contribution, and
    // they genuinely raise similarity. But "you match because you both score
    // low on helping people" is not something to show a sixteen-year-old, so
    // only shared strengths are surfaced as reasons.
    if (row.studentDeviation <= 0 || row.careerDeviation <= 0) continue;
    reasons.push({
      factor: row.dimension,
      label: bundle.featureLabels[row.dimension] ?? { en: row.dimension, ar: row.dimension },
      studentValue: round(studentVector[row.index], 1),
      careerIdeal: round(idealVector[row.index], 1),
      contribution: round(row.contribution, 1),
    });
  }
  return reasons;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function confidenceFor(match: number, sectorProbability: number,
                       allMatches: number[], classCount: number): "high" | "moderate" | "low" {
  // Expressed as a multiple of chance rather than an absolute threshold: with
  // 18 sectors chance is 1/18, and a fixed cutoff would silently change meaning
  // if a sector were added or removed.
  const chance = 1 / Math.max(1, classCount);
  const average = mean(allMatches);
  const separation = match - average;

  // Thresholds mirror CareerRecommender._confidence exactly, including the
  // asymmetry: "high" needs both signals, "moderate" needs either one.
  if (sectorProbability >= 3.0 * chance && separation >= 8.0) return "high";
  if (sectorProbability >= 1.5 * chance || separation >= 4.0) return "moderate";
  return "low";
}

/** The whole pipeline: profile in, ranked careers out. */
export function recommend(
  profile: StudentProfile,
  bundle: ModelBundle,
  topN = 10,
): RecommendationResult {
  const vector = buildVector(profile, bundle);
  const probabilities = sectorProbabilities(vector, bundle);
  const studentVector = studentProfileVector(profile, bundle);

  const maxProbability = Math.max(...Object.values(probabilities)) || 1;
  const { careerVectors, careerSectors, careerDemand } = bundle.similarity;
  const { sector: wSector, similarity: wSimilarity, demand: wDemand, demandScores } = bundle.blend;

  const scored = Object.keys(careerVectors).map((careerId) => {
    const ideal = careerVectors[careerId];
    const sector = careerSectors[careerId];
    const similarity = centeredCosine(studentVector, ideal);
    const sectorProbability = probabilities[sector] ?? 0;
    const sectorScore = sectorProbability / maxProbability;
    const demand = demandScores[careerDemand[careerId]] ?? 0.4;
    const score = wSector * sectorScore + wSimilarity * similarity + wDemand * demand;
    return {
      careerId,
      sector,
      match: round(score * 100, 1),
      components: {
        sectorProbability: round(sectorProbability, 4),
        sectorScore: round(sectorScore, 4),
        similarity: round(similarity, 4),
        demand,
      },
    };
  });

  // Sort on match alone. Array.prototype.sort is stable, so ties keep catalog
  // order — which is exactly what Python's stable sort does. Adding a
  // tiebreaker here would order ties differently and break parity.
  scored.sort((a, b) => b.match - a.match);

  const allMatches = scored.map((item) => item.match);
  const recommendations: Recommendation[] = scored.slice(0, topN).map((item, index) => ({
    ...item,
    rank: index + 1,
    reasons: explain(studentVector, careerVectors[item.careerId], bundle),
    confidence: confidenceFor(
      item.match,
      item.components.sectorProbability,
      allMatches,
      bundle.classifier.classes.length,
    ),
  }));

  const sortedProbabilities = Object.fromEntries(
    Object.entries(probabilities)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => [label, round(value, 4)]),
  );

  return {
    recommendations,
    sectorProbabilities: sortedProbabilities,
    model: {
      name: bundle.generatedFrom.model,
      trainedAt: bundle.generatedFrom.trainedAt,
      weights: { sector: wSector, similarity: wSimilarity, demand: wDemand },
    },
  };
}

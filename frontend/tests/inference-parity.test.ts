/**
 * Asserts that the browser recommender reproduces the Python model.
 *
 * Fixtures come from ml/tests/test_parity.py, which runs 50 fixed profiles
 * through the real scikit-learn pipeline. If this suite fails, the app is
 * giving students different advice than the model that was trained, evaluated
 * and documented — which is the one bug in this project that would otherwise
 * produce no visible symptom at all.
 *
 * Regenerate fixtures with:  pytest ml/tests/test_parity.py
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

import {
  buildVector,
  centeredCosine,
  recommend,
  sectorProbabilities,
  type StudentProfile,
} from "@/lib/ml/inference";

interface Fixture {
  tolerance: number;
  cases: {
    profile: StudentProfile;
    sectorProbabilities: Record<string, number>;
    recommendations: {
      rank: number;
      careerId: string;
      sector: string;
      match: number;
      confidence: string;
      components: {
        sectorProbability: number;
        sectorScore: number;
        similarity: number;
        demand: number;
      };
      reasons: string[];
    }[];
  }[];
}

const ROOT = join(process.cwd(), "..");
const fixture: Fixture = JSON.parse(
  readFileSync(join(process.cwd(), "tests", "fixtures", "parity.json"), "utf8"),
);
const bundle = JSON.parse(
  readFileSync(join(process.cwd(), "public", "model", "model.v1.json"), "utf8"),
);

const TOLERANCE = fixture.tolerance;

describe("model bundle", () => {
  it("declares the contract the code supports", () => {
    expect(bundle.contract).toBe(1);
  });

  it("is the logistic regression, matching the exporter's expectation", () => {
    expect(bundle.classifier.kind).toBe("multinomial_logistic_regression");
    expect(bundle.generatedFrom.model).toBe("logistic_regression");
  });

  it("has a coefficient matrix matching the declared feature layout", () => {
    const width =
      bundle.features.numeric.length
      + bundle.features.tracks.length
      + bundle.features.emirates.length;
    expect(bundle.classifier.coefficients).toHaveLength(bundle.classifier.classes.length);
    for (const row of bundle.classifier.coefficients) {
      expect(row).toHaveLength(width);
    }
    expect(bundle.classifier.intercepts).toHaveLength(bundle.classifier.classes.length);
  });

  it("carries a vector for every career", () => {
    const vectors = Object.keys(bundle.similarity.careerVectors);
    expect(vectors.length).toBeGreaterThanOrEqual(140);
    for (const id of vectors) {
      expect(bundle.similarity.careerVectors[id]).toHaveLength(
        bundle.similarity.dimensions.length,
      );
      expect(bundle.similarity.careerSectors[id]).toBeTruthy();
      expect(bundle.similarity.careerDemand[id]).toBeTruthy();
    }
  });
});

describe("centeredCosine", () => {
  it("returns 1 for identical shapes and 0 for inverted ones", () => {
    const a = [1, 2, 3, 4];
    expect(centeredCosine(a, a)).toBeCloseTo(1, 10);
    expect(centeredCosine(a, [4, 3, 2, 1])).toBeCloseTo(0, 10);
  });

  it("returns 0.5 when a vector has no variation at all", () => {
    // A flat profile centres to all zeros, so the denominator vanishes. The
    // Python implementation returns 0.5 here rather than NaN.
    expect(centeredCosine([50, 50, 50], [1, 2, 3])).toBe(0.5);
  });

  it("is scale-invariant, since only shape should matter", () => {
    const a = [10, 20, 30, 40];
    const b = [1, 2, 3, 4];
    expect(centeredCosine(a, b)).toBeCloseTo(1, 10);
  });
});

describe("sector probabilities", () => {
  it("produces a distribution that sums to 1", () => {
    for (const testCase of fixture.cases) {
      const vector = buildVector(testCase.profile, bundle);
      const probabilities = sectorProbabilities(vector, bundle);
      const total = Object.values(probabilities).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it("matches scikit-learn's predict_proba for all 50 profiles", () => {
    for (const [index, testCase] of fixture.cases.entries()) {
      const vector = buildVector(testCase.profile, bundle);
      const probabilities = sectorProbabilities(vector, bundle);
      for (const [sector, expected] of Object.entries(testCase.sectorProbabilities)) {
        // Fixtures store probabilities rounded to 4 decimal places, so the
        // comparison is against that rounding rather than the raw float.
        const actual = Math.round(probabilities[sector] * 1e4) / 1e4;
        expect(
          Math.abs(actual - expected),
          `case ${index}, sector ${sector}: ts=${actual} py=${expected}`,
        ).toBeLessThanOrEqual(TOLERANCE);
      }
    }
  });
});

describe("recommendations", () => {
  it("reproduces the Python ranking exactly for all 50 profiles", () => {
    for (const [index, testCase] of fixture.cases.entries()) {
      const result = recommend(testCase.profile, bundle, 10);
      expect(result.recommendations, `case ${index}: length`).toHaveLength(
        testCase.recommendations.length,
      );

      for (const [rank, expected] of testCase.recommendations.entries()) {
        const actual = result.recommendations[rank];
        expect(actual.careerId, `case ${index}, rank ${rank + 1}: career`).toBe(
          expected.careerId,
        );
        expect(actual.sector).toBe(expected.sector);
        expect(actual.rank).toBe(expected.rank);
        expect(
          Math.abs(actual.match - expected.match),
          `case ${index}, rank ${rank + 1}: match ts=${actual.match} py=${expected.match}`,
        ).toBeLessThanOrEqual(TOLERANCE);

        for (const key of ["sectorProbability", "sectorScore", "similarity", "demand"] as const) {
          expect(
            Math.abs(actual.components[key] - expected.components[key]),
            `case ${index}, rank ${rank + 1}: ${key}`,
          ).toBeLessThanOrEqual(TOLERANCE);
        }
      }
    }
  });

  it("reproduces the Python confidence label", () => {
    for (const [index, testCase] of fixture.cases.entries()) {
      const result = recommend(testCase.profile, bundle, 10);
      for (const [rank, expected] of testCase.recommendations.entries()) {
        expect(
          result.recommendations[rank].confidence,
          `case ${index}, rank ${rank + 1}`,
        ).toBe(expected.confidence);
      }
    }
  });

  it("reproduces the Python explanation factors", () => {
    for (const [index, testCase] of fixture.cases.entries()) {
      const result = recommend(testCase.profile, bundle, 10);
      for (const [rank, expected] of testCase.recommendations.entries()) {
        expect(
          result.recommendations[rank].reasons.map((r) => r.factor),
          `case ${index}, rank ${rank + 1}`,
        ).toEqual(expected.reasons);
      }
    }
  });

  it("never returns a match outside 0-100", () => {
    for (const testCase of fixture.cases) {
      for (const item of recommend(testCase.profile, bundle, 10).recommendations) {
        expect(item.match).toBeGreaterThanOrEqual(0);
        expect(item.match).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("degenerate input", () => {
  it("handles an entirely empty profile without throwing", () => {
    const result = recommend({}, bundle, 10);
    expect(result.recommendations).toHaveLength(10);
    expect(Number.isFinite(result.recommendations[0].match)).toBe(true);
  });

  it("falls back on an unknown track and emirate rather than throwing", () => {
    const result = recommend(
      { track: "not_a_track", emirate: "atlantis" }, bundle, 5,
    );
    expect(result.recommendations).toHaveLength(5);
  });
});

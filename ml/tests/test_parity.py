"""Python/TypeScript inference parity.

The app no longer runs the Python model: `frontend/lib/ml/inference.ts` scores
students in the browser. That makes a silent divergence between the two
implementations the most dangerous bug in the project — the model that gets
evaluated, documented and defended would not be the model giving students
advice, and nothing would fail.

So the two are pinned together:

  1. This module builds 50 deterministic student profiles spanning the input
     space, runs them through the real Python recommender, and writes the
     results to frontend/tests/fixtures/parity.json.
  2. tests/inference-parity.test.ts replays the same profiles through the
     TypeScript port and asserts agreement to 1e-6.

Run `pytest ml/tests/test_parity.py` to regenerate the fixtures after any change
to the model or the scoring blend, then run the Vitest suite. If the tolerance
fails, the port has drifted and the app is giving different advice than the
model that was measured.
"""
from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
ML = ROOT / "ml"
sys.path.insert(0, str(ML))

from pipeline import EMIRATES, SUBJECTS, TRACKS      # noqa: E402
from recommender import CareerRecommender            # noqa: E402

DATA = ROOT / "frontend" / "public" / "data"
FIXTURES = ROOT / "frontend" / "tests" / "fixtures" / "parity.json"
N_PROFILES = 50


def _load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def build_profiles(n: int = N_PROFILES) -> list[dict]:
    """Deterministic profiles that between them exercise every input path.

    Coverage is deliberate rather than purely random: the fixed first three
    cases pin the edges that a random draw would almost never produce — all
    grades at the floor, all at the ceiling, and a profile with no EmSAT scores
    at all, which is the branch where the imputer and the `emsat_provided` flag
    actually do something.
    """
    rng = np.random.default_rng(20260909)
    profiles: list[dict] = []

    def make(grades, emsat, riasec, bigfive, track, emirate):
        return {
            "grades": grades, "emsat": emsat, "riasec": riasec,
            "bigfive": bigfive, "track": track, "emirate": emirate,
        }

    # --- pinned edge cases ------------------------------------------------
    profiles.append(make(
        {s: 0.0 for s in SUBJECTS},
        {"english": 500, "math": 500, "physics": 500, "arabic": 500},
        {k: 0.0 for k in "RIASEC"}, {k: 0.0 for k in "OCEAN"},
        "general", "abu_dhabi"))
    profiles.append(make(
        {s: 100.0 for s in SUBJECTS},
        {"english": 1500, "math": 1500, "physics": 1500, "arabic": 1500},
        {k: 100.0 for k in "RIASEC"}, {k: 100.0 for k in "OCEAN"},
        "elite", "dubai"))
    profiles.append(make(
        {s: 70.0 for s in SUBJECTS}, {},                    # no EmSAT at all
        {k: 50.0 for k in "RIASEC"}, {k: 50.0 for k in "OCEAN"},
        "advanced", "sharjah"))
    # An unknown track and emirate must fall back rather than throw.
    profiles.append(make(
        {s: 65.0 for s in SUBJECTS}, {"math": 1100},
        {k: 55.0 for k in "RIASEC"}, {k: 45.0 for k in "OCEAN"},
        "not_a_track", "atlantis"))
    # Partially missing subjects.
    profiles.append(make(
        {"math": 90.0, "physics": 85.0}, {"english": 1250},
        {k: 60.0 for k in "RIASEC"}, {k: 50.0 for k in "OCEAN"},
        "advanced", "ajman"))

    while len(profiles) < n:
        grades = {s: float(round(rng.uniform(40, 100), 1)) for s in SUBJECTS}
        # Drop EmSAT entirely about a third of the time, matching the real
        # missingness rate in the training data.
        if rng.random() < 0.35:
            emsat = {}
        else:
            emsat = {k: float(round(rng.uniform(700, 1500)))
                     for k in ("english", "math", "physics", "arabic")
                     if rng.random() < 0.8}
        riasec = {k: float(round(rng.uniform(0, 100), 1)) for k in "RIASEC"}
        bigfive = {k: float(round(rng.uniform(0, 100), 1)) for k in "OCEAN"}
        profiles.append(make(
            grades, emsat, riasec, bigfive,
            str(rng.choice(TRACKS)), str(rng.choice(EMIRATES))))

    return profiles


@pytest.fixture(scope="module")
def recommender() -> CareerRecommender:
    import joblib
    bundle = joblib.load(ML / "artifacts" / "model.joblib")
    return CareerRecommender(
        bundle, _load("careers.json"), _load("courses.json"), _load("skills.json"))


def test_writes_parity_fixtures(recommender: CareerRecommender) -> None:
    """Generate the fixtures the TypeScript suite checks against."""
    profiles = build_profiles()
    cases = []
    for profile in profiles:
        result = recommender.recommend(profile, top_n=10)
        cases.append({
            "profile": profile,
            "sectorProbabilities": result["sector_probabilities"],
            "recommendations": [
                {
                    "rank": item["rank"],
                    "careerId": item["career_id"],
                    "sector": item["sector"],
                    "match": item["match"],
                    "confidence": item["confidence"],
                    "components": {
                        "sectorProbability": item["components"]["sector_probability"],
                        "sectorScore": item["components"]["sector_score"],
                        "similarity": item["components"]["similarity"],
                        "demand": item["components"]["demand"],
                    },
                    "reasons": [r["factor"] for r in item["reasons"]],
                }
                for item in result["recommendations"]
            ],
        })

    FIXTURES.parent.mkdir(parents=True, exist_ok=True)
    FIXTURES.write_text(
        json.dumps({"tolerance": 1e-6, "cases": cases}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8")

    assert len(cases) == N_PROFILES
    assert all(len(case["recommendations"]) == 10 for case in cases)


def test_profiles_are_deterministic() -> None:
    """The generator must not drift, or the fixtures stop being comparable."""
    assert build_profiles() == build_profiles()


def test_edge_profiles_do_not_degenerate(recommender: CareerRecommender) -> None:
    """The pinned edge cases must still produce a usable ranking.

    A floor or ceiling profile is where a centred cosine can collapse: every
    dimension deviates from the mean by zero, the denominator goes to zero, and
    similarity silently becomes a constant for every career. The recommender
    returns 0.5 in that case by design; what matters is that the ranking is
    still produced and the sector classifier still separates.
    """
    for profile in build_profiles()[:3]:
        result = recommender.recommend(profile, top_n=10)
        assert len(result["recommendations"]) == 10
        matches = [item["match"] for item in result["recommendations"]]
        assert matches == sorted(matches, reverse=True)
        assert all(0.0 <= m <= 100.0 for m in matches)
        probabilities = result["sector_probabilities"]
        assert abs(sum(probabilities.values()) - 1.0) < 1e-3

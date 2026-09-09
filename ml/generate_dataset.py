#!/usr/bin/env python3
"""Deterministic synthetic dataset generator for Masar AI.

Why synthetic?
--------------
No public dataset links UAE secondary-school grades, RIASEC interests and Big
Five traits to an eventual career sector.  Rather than claim a real dataset we
do not have, we generate one from an explicit causal story and document that
story.  This is honest and reproducible: the same seed always yields the same
5,000 rows, so every number in ml/artifacts/metrics.json can be re-derived.

The generative story
--------------------
1.  A latent "true sector" is drawn for each student, with a prior that
    reflects how many places the UAE job market actually offers per sector.
2.  Each sector has an *ideal profile* -- the average of the ideal profiles of
    the careers in that sector, taken straight from data/careers.json.  This is
    the only place the two artefacts are coupled, and it is deliberate: the
    classifier and the similarity layer then speak the same language.
3.  The student's grades, RIASEC scores and Big Five scores are drawn around
    that ideal profile with substantial Gaussian noise, then clipped to 0-100.
4.  The MOE track shifts academic attainment (elite > advanced > general) and
    is itself correlated with the sampled grades, as it is in reality.
5.  EmSAT scores are generated from the matching subject grade plus noise, and
    are missing for 35% of students -- the same optionality the product has.
6.  Finally 8% of labels are resampled uniformly.  Real students take jobs that
    do not match their profile; without this noise the task is too easy and the
    reported accuracy would be a fiction.

Limitations (repeated in docs/ML_METHODOLOGY.md)
------------------------------------------------
* The model can only learn the correlations we put in.  High accuracy here is
  evidence that the *pipeline* works, not that the recommendations are
  externally valid.
* The ideal profiles are expert judgement by the project team, not measured.
* Real interest inventories show much messier structure than Gaussian noise.

Usage:  python ml/generate_dataset.py [--n 5000] [--seed 42]
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pipeline import (  # noqa: E402
    BIGFIVE, EMIRATES, EMSAT_MAX, EMSAT_MIN, FEATURE_COLUMNS, RIASEC,
    SUBJECTS, TARGET, TRACKS,
)

ROOT = pathlib.Path(__file__).resolve().parent.parent
# The catalogs moved to the app's public directory in v2: static export
# serves them directly to the browser, so that is the single source of
# truth and the ML pipeline reads the same files the app does.
DATA_DIR = ROOT / "frontend" / "public" / "data"
OUT_DIR = pathlib.Path(__file__).resolve().parent / "data"

# Prior over sectors: relative share of the synthetic cohort.  Larger sectors
# employ more people, so more students end up there.
# Healthcare's share rises sharply from v1: it is now 45 of the 184 careers,
# and a prior that ignored that would train a classifier which almost never
# predicts the largest sector in the catalog.
SECTOR_PRIOR: dict[str, float] = {
    "healthcare": 0.150, "software": 0.080, "ai_data": 0.070, "finance": 0.070,
    "engineering": 0.070, "construction": 0.060, "energy": 0.060,
    "education": 0.055, "government": 0.055, "media": 0.055, "tourism": 0.055,
    "logistics": 0.045, "law": 0.040, "cybersecurity": 0.035,
    "entrepreneurship": 0.035, "social": 0.030, "aviation": 0.025,
    "space": 0.010,
}
assert abs(sum(SECTOR_PRIOR.values()) - 1.0) < 1e-9, "sector prior must sum to 1"

# Population-weighted emirate distribution (approximate published shares).
EMIRATE_PRIOR = np.array([0.31, 0.38, 0.12, 0.05, 0.01, 0.09, 0.04])

# How strongly the track shifts grades, and its prior.
TRACK_PRIOR = np.array([0.45, 0.40, 0.15])
TRACK_GRADE_SHIFT = {"general": -6.0, "advanced": +3.0, "elite": +9.0}

# Spread of the Gaussian noise around the sector ideal profile.
SUBJECT_SIGMA = 12.0
RIASEC_SIGMA = 14.0
BIGFIVE_SIGMA = 15.0
EMSAT_SIGMA = 9.0
LABEL_NOISE = 0.08
EMSAT_MISSING_RATE = 0.35


def sector_ideal_profiles() -> dict[str, dict[str, dict[str, float]]]:
    """Average the ideal profile of every career inside each sector."""
    careers = json.loads((DATA_DIR / "careers.json").read_text(encoding="utf-8"))
    buckets: dict[str, list[dict]] = {}
    for career in careers:
        buckets.setdefault(career["sector"], []).append(career["idealProfile"])

    ideals: dict[str, dict[str, dict[str, float]]] = {}
    for sector, profiles in buckets.items():
        ideals[sector] = {
            "riasec": {k: float(np.mean([p["riasec"][k] for p in profiles]))
                       for k in "RIASEC"},
            "bigfive": {k: float(np.mean([p["bigfive"][k] for p in profiles]))
                        for k in "OCEAN"},
            "subjects": {k: float(np.mean([p["subjects"][k] for p in profiles]))
                         for k in SUBJECTS if k in profiles[0]["subjects"]},
        }
    return ideals


def generate(n: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    ideals = sector_ideal_profiles()

    sectors = list(SECTOR_PRIOR)
    prior = np.array([SECTOR_PRIOR[s] for s in sectors], dtype=float)
    prior /= prior.sum()
    missing = [s for s in ideals if s not in SECTOR_PRIOR]
    assert not missing, f"sector prior is missing {missing}"

    true_sectors = rng.choice(sectors, size=n, p=prior)
    emirates = rng.choice(EMIRATES, size=n, p=EMIRATE_PRIOR / EMIRATE_PRIOR.sum())

    rows: list[dict] = []
    for i in range(n):
        sector = true_sectors[i]
        ideal = ideals[sector]
        row: dict[str, object] = {}

        # --- track: sampled first, then used to shift academic attainment ---
        track = str(rng.choice(TRACKS, p=TRACK_PRIOR))
        shift = TRACK_GRADE_SHIFT[track]

        # --- subject grades around the sector ideal --------------------------
        for subject in SUBJECTS:
            mean = ideal["subjects"].get(subject, 55.0) + shift
            row[subject] = float(np.clip(rng.normal(mean, SUBJECT_SIGMA), 0, 100))

        # --- EmSAT: generated from the matching grade, optional --------------
        pairs = {"emsat_english": "english", "emsat_math": "math",
                 "emsat_physics": "physics", "emsat_arabic": "arabic"}
        has_emsat = rng.random() > EMSAT_MISSING_RATE
        for column, subject in pairs.items():
            if not has_emsat:
                row[column] = np.nan
                continue
            grade = float(row[subject])
            scaled = float(np.clip(rng.normal(grade, EMSAT_SIGMA), 0, 100))
            # store on the official 500-1500 band, as a student would type it
            row[column] = round(EMSAT_MIN + scaled / 100.0 * (EMSAT_MAX - EMSAT_MIN))
        row["emsat_provided"] = float(has_emsat)

        # --- interests and personality ---------------------------------------
        for column in RIASEC:
            mean = ideal["riasec"][column.removeprefix("riasec_")]
            row[column] = float(np.clip(rng.normal(mean, RIASEC_SIGMA), 0, 100))
        for column in BIGFIVE:
            mean = ideal["bigfive"][column.removeprefix("big5_")]
            row[column] = float(np.clip(rng.normal(mean, BIGFIVE_SIGMA), 0, 100))

        row["track"] = track
        row["emirate"] = str(emirates[i])

        # --- label, with realistic mismatch ----------------------------------
        label = sector if rng.random() > LABEL_NOISE else str(rng.choice(sectors))
        row[TARGET] = label
        rows.append(row)

    frame = pd.DataFrame(rows)
    # EmSAT is stored raw (500-1500) in the CSV for readability; the pipeline
    # rescales it, so rescale here too to keep train and serve identical.
    for column in pairs:
        frame[column] = frame[column].apply(
            lambda v: np.nan if pd.isna(v) else (v - EMSAT_MIN) / (EMSAT_MAX - EMSAT_MIN) * 100.0)
    return frame[FEATURE_COLUMNS + [TARGET]]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--n", type=int, default=8000, help="number of profiles")
    parser.add_argument("--seed", type=int, default=42, help="random seed")
    parser.add_argument("--out", type=pathlib.Path, default=OUT_DIR / "students.csv")
    args = parser.parse_args()

    frame = generate(args.n, args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.out, index=False)

    try:
        shown = args.out.resolve().relative_to(ROOT)
    except ValueError:
        shown = args.out
    print(f"wrote {shown}  rows={len(frame)}  cols={frame.shape[1]}")
    print(f"seed={args.seed}  label noise={LABEL_NOISE:.0%}  "
          f"EmSAT missing={frame['emsat_math'].isna().mean():.1%}")
    print("\nsector distribution:")
    counts = frame[TARGET].value_counts()
    for sector, count in counts.items():
        print(f"  {sector:<18} {count:>5}  {count / len(frame):6.1%}")


if __name__ == "__main__":
    main()

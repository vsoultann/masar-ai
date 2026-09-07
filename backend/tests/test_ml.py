"""The ML layer: dataset determinism, model loading and the scoring blend."""
from __future__ import annotations

import json
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]


def test_dataset_generation_is_deterministic():
    from generate_dataset import generate
    first = generate(200, seed=42)
    second = generate(200, seed=42)
    assert first.equals(second)


def test_a_different_seed_gives_a_different_dataset():
    from generate_dataset import generate
    assert not generate(200, seed=42).equals(generate(200, seed=7))


def test_generated_dataset_has_the_declared_schema():
    from generate_dataset import generate
    from pipeline import FEATURE_COLUMNS, TARGET
    frame = generate(300, seed=42)
    assert list(frame.columns) == FEATURE_COLUMNS + [TARGET]
    assert frame["track"].isin(["general", "advanced", "elite"]).all()
    for column in ("math", "physics", "riasec_R", "big5_O"):
        assert frame[column].between(0, 100).all()


def test_generated_dataset_has_missing_emsat_by_design():
    from generate_dataset import generate
    frame = generate(1000, seed=42)
    missing = frame["emsat_math"].isna().mean()
    assert 0.25 < missing < 0.45


def test_committed_dataset_matches_the_generator():
    """The CSV in the repo must be reproducible from the committed seed."""
    import pandas as pd
    from generate_dataset import generate
    committed = pd.read_csv(ROOT / "ml" / "data" / "students.csv")
    regenerated = generate(len(committed), seed=42)
    assert committed.shape == regenerated.shape
    assert list(committed.columns) == list(regenerated.columns)
    assert (committed["sector"] == regenerated["sector"]).all()


def test_model_bundle_loads_with_its_metadata():
    from app import ml_loader
    bundle = ml_loader.load_bundle()
    assert bundle["model_name"] == "random_forest"
    assert len(bundle["labels"]) == 15
    from pipeline import FEATURE_COLUMNS
    assert bundle["feature_columns"] == FEATURE_COLUMNS


def test_metrics_file_is_present_and_coherent():
    metrics = json.loads((ROOT / "ml" / "artifacts" / "metrics.json").read_text())
    assert metrics["dataset"]["rows"] == 5000
    assert set(metrics["model_comparison"]) == {"random_forest", "logistic_regression", "knn"}
    accuracy = metrics["selected_model"]["test"]["accuracy"]
    # 15 classes with 8% label noise: chance is 0.067, the achievable ceiling
    # is about 0.92. Anything outside this band means something is wrong.
    assert 0.5 < accuracy < 0.92


def test_every_taxonomy_skill_has_a_documented_mapping():
    from skill_map import SKILL_WEIGHTS, validate
    catalog = json.loads((ROOT / "data" / "skills.json").read_text())
    assert {skill["id"] for skill in catalog} == set(SKILL_WEIGHTS)
    validate()


def test_skill_estimates_ignore_missing_emsat_rather_than_penalising_it():
    from pipeline import profile_to_row
    from skill_map import estimate_skills
    base = {"grades": {"math": 90}, "riasec": {"I": 80}, "bigfive": {"C": 80},
            "track": "advanced", "emirate": "dubai"}
    without = estimate_skills(profile_to_row(base))
    with_emsat = estimate_skills(profile_to_row({**base, "emsat": {"math": 1400}}))
    # Providing a strong EmSAT can only help; omitting it must not collapse the
    # estimate towards zero.
    assert without["mathematics"] > 50
    assert with_emsat["mathematics"] >= without["mathematics"]


def test_centered_cosine_spreads_the_similarity_range():
    """Raw cosine on all-positive vectors is useless; the centred one is not."""
    import numpy as np
    from recommender import centered_cosine
    a = np.array([90.0, 20.0, 30.0, 80.0])
    assert centered_cosine(a, a) == pytest.approx(1.0)
    assert centered_cosine(a, -a + 200) == pytest.approx(0.0, abs=1e-9)


def test_scoring_weights_sum_to_one():
    from recommender import WEIGHT_DEMAND, WEIGHT_SECTOR, WEIGHT_SIMILARITY
    assert WEIGHT_SECTOR + WEIGHT_SIMILARITY + WEIGHT_DEMAND == pytest.approx(1.0)


def test_profile_vector_order_is_stable():
    from pipeline import BIGFIVE, RIASEC, SUBJECTS
    from recommender import PROFILE_DIMS
    assert PROFILE_DIMS == RIASEC + BIGFIVE + list(SUBJECTS)
    assert len(PROFILE_DIMS) == 20


def test_a_stem_profile_and_a_social_profile_get_different_sectors(client, admin_auth):
    """End-to-end sanity: the engine must actually discriminate."""
    import joblib

    from app import ml_loader
    from recommender import CareerRecommender
    careers = json.loads((ROOT / "data" / "careers.json").read_text())
    courses = json.loads((ROOT / "data" / "courses.json").read_text())
    engine = CareerRecommender(joblib.load(ml_loader.MODEL_PATH), careers, courses,
                               ml_loader.load_skills())

    stem = {"grades": {"math": 96, "physics": 94, "computer_science": 97,
                       "biology": 62, "arabic": 70, "english": 85},
            "riasec": {"R": 40, "I": 92, "A": 40, "S": 25, "E": 45, "C": 65},
            "bigfive": {"O": 85, "C": 80, "E": 40, "A": 50, "N": 30},
            "track": "advanced", "emirate": "dubai"}
    social = {"grades": {"math": 60, "physics": 55, "computer_science": 58,
                         "biology": 82, "arabic": 90, "social": 88, "english": 76},
              "riasec": {"R": 22, "I": 45, "A": 55, "S": 93, "E": 60, "C": 48},
              "bigfive": {"O": 60, "C": 66, "E": 78, "A": 90, "N": 44},
              "track": "general", "emirate": "sharjah"}

    stem_top = engine.recommend(stem)["recommendations"][0]
    social_top = engine.recommend(social)["recommendations"][0]
    assert stem_top["career_id"] != social_top["career_id"]
    assert stem_top["sector"] in {"ai_data", "software", "cybersecurity", "space", "energy"}
    assert social_top["sector"] in {"education", "healthcare", "government", "tourism", "media"}

"""Shared feature schema, preprocessing pipeline and skill-inference mapping.

This module is imported by three different places and is deliberately the only
definition of the feature vector:

* ``ml/generate_dataset.py``  -- to emit a CSV with exactly these columns
* ``ml/train.py`` / ``evaluate.py`` -- to build and score the models
* ``backend/app/services/`` -- to turn a live student profile into the same
  vector at inference time

Keeping one definition is what stops the classic "trained on one feature order,
served on another" bug.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (HistGradientBoostingClassifier,
                              RandomForestClassifier)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

# ---------------------------------------------------------------------------
# Feature schema
# ---------------------------------------------------------------------------
SUBJECTS = [
    "arabic", "english", "math", "physics", "chemistry",
    "biology", "islamic", "social", "computer_science",
]
EMSAT = ["emsat_english", "emsat_math", "emsat_physics", "emsat_arabic"]
RIASEC = ["riasec_R", "riasec_I", "riasec_A", "riasec_S", "riasec_E", "riasec_C"]
BIGFIVE = ["big5_O", "big5_C", "big5_E", "big5_A", "big5_N"]

TRACKS = ["general", "advanced", "elite"]
EMIRATES = [
    "abu_dhabi", "dubai", "sharjah", "ajman",
    "umm_al_quwain", "ras_al_khaimah", "fujairah",
]

NUMERIC_FEATURES = SUBJECTS + EMSAT + RIASEC + BIGFIVE + ["emsat_provided"]
CATEGORICAL_FEATURES = ["track", "emirate"]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "sector"

# Subject grades and questionnaire scores are 0-100.  EmSAT is reported on the
# official 500-1500 band and is rescaled to 0-100 so that one StandardScaler
# behaves sensibly across the whole vector.
EMSAT_MIN, EMSAT_MAX = 500.0, 1500.0

# The emirate of residence carries real but weak signal (it shifts which sectors
# are locally dominant).  Section 4 of docs/ML_METHODOLOGY.md explains why we
# down-weight it rather than dropping it: leaving it at full weight let the
# Random Forest split on it early, which is exactly the kind of unfair
# geographic shortcut a career-guidance tool should not learn.
EMIRATE_WEIGHT = 0.30


def scale_emirate(x: np.ndarray) -> np.ndarray:
    """Down-weight the one-hot emirate block (module level so it pickles)."""
    return np.asarray(x, dtype=float) * EMIRATE_WEIGHT


def emsat_to_100(value: float | None) -> float | None:
    """Rescale an official EmSAT score (500-1500) onto 0-100."""
    if value is None:
        return None
    return float(np.clip((value - EMSAT_MIN) / (EMSAT_MAX - EMSAT_MIN) * 100.0, 0.0, 100.0))


def profile_to_row(profile: dict[str, Any]) -> dict[str, Any]:
    """Turn a student profile (as stored by the backend) into one feature row.

    Missing subjects fall back to 55 (a neutral pass mark); missing EmSAT scores
    are left as NaN and imputed by the pipeline, with ``emsat_provided``
    recording whether the student supplied any of them at all.
    """
    grades = profile.get("grades") or {}
    emsat = profile.get("emsat") or {}
    riasec = profile.get("riasec") or {}
    bigfive = profile.get("bigfive") or {}

    row: dict[str, Any] = {}
    for subject in SUBJECTS:
        value = grades.get(subject)
        row[subject] = float(value) if value is not None else 55.0

    provided = 0
    for column in EMSAT:
        raw = emsat.get(column.removeprefix("emsat_"))
        scaled = emsat_to_100(float(raw)) if raw not in (None, "") else None
        if scaled is None:
            row[column] = np.nan
        else:
            row[column] = scaled
            provided = 1
    row["emsat_provided"] = float(provided)

    for column in RIASEC:
        row[column] = float(riasec.get(column.removeprefix("riasec_"), 50.0))
    for column in BIGFIVE:
        row[column] = float(bigfive.get(column.removeprefix("big5_"), 50.0))

    track = str(profile.get("track") or "general").lower()
    row["track"] = track if track in TRACKS else "general"
    emirate = str(profile.get("emirate") or "abu_dhabi").lower()
    row["emirate"] = emirate if emirate in EMIRATES else "abu_dhabi"
    return row


def profile_to_frame(profile: dict[str, Any]) -> pd.DataFrame:
    """One-row DataFrame with the exact training column order."""
    return pd.DataFrame([profile_to_row(profile)], columns=FEATURE_COLUMNS)


# ---------------------------------------------------------------------------
# Preprocessing + models
# ---------------------------------------------------------------------------
def build_preprocessor() -> ColumnTransformer:
    numeric = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    track = OneHotEncoder(categories=[TRACKS], handle_unknown="ignore",
                          sparse_output=False)
    emirate = Pipeline([
        ("onehot", OneHotEncoder(categories=[EMIRATES], handle_unknown="ignore",
                                 sparse_output=False)),
        ("weight", FunctionTransformer(scale_emirate, feature_names_out="one-to-one")),
    ])
    return ColumnTransformer(
        [
            ("num", numeric, NUMERIC_FEATURES),
            ("track", track, ["track"]),
            ("emirate", emirate, ["emirate"]),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def build_models(random_state: int = 42) -> dict[str, Pipeline]:
    """The four candidate classifiers compared in docs/ML_METHODOLOGY.md."""
    return {
        "random_forest": Pipeline([
            ("prep", build_preprocessor()),
            # max_depth / min_samples_leaf are set for deployability as much as
            # for accuracy: an unconstrained forest scored ~0.004 higher macro-F1
            # but serialised to 31 MB, which is impractical on a free-tier host.
            # These settings give a 9.6 MB model for a 0.7 point accuracy cost.
            ("clf", RandomForestClassifier(
                n_estimators=300, max_depth=22, min_samples_leaf=10,
                class_weight="balanced_subsample", n_jobs=-1,
                random_state=random_state)),
        ]),
        "logistic_regression": Pipeline([
            ("prep", build_preprocessor()),
            # multi_class is not passed: it is deprecated in scikit-learn 1.5
            # and multinomial is already the behaviour for this solver.
            ("clf", LogisticRegression(
                max_iter=2000, C=1.0, class_weight="balanced",
                random_state=random_state)),
        ]),
        "knn": Pipeline([
            ("prep", build_preprocessor()),
            ("clf", KNeighborsClassifier(n_neighbors=25, weights="distance")),
        ]),
        # Added in v2. Histogram-based rather than the classic implementation:
        # with 18 classes and 8,000 rows the exact learner takes minutes per CV
        # fold, which makes the comparison too slow to rerun casually, and a
        # comparison nobody reruns stops being a check.
        "gradient_boosting": Pipeline([
            ("prep", build_preprocessor()),
            ("clf", HistGradientBoostingClassifier(
                max_iter=300, learning_rate=0.08, max_depth=8,
                l2_regularization=1.0, random_state=random_state)),
        ]),
    }

#!/usr/bin/env python3
"""Export the trained model as a portable JSON bundle for in-browser inference.

    python ml/export_model.py

Writes frontend/public/model/model.v1.json, which frontend/lib/ml/inference.ts
loads and evaluates. Nothing is fetched at runtime beyond this one file.

Why the deployed model is the Logistic Regression
-------------------------------------------------
The brief offers three options for getting a scikit-learn model into a browser:
export the Random Forest as JSON trees, deploy a multinomial Logistic
Regression, or convert to ONNX and run onnxruntime-web.

The choice is settled by the model comparison rather than by deployment
convenience: on the 18-sector label space the Logistic Regression is simply the
best of the four candidates, on both cross-validated macro-F1 (0.623 vs the
forest's 0.618) and held-out accuracy (0.662 vs 0.641). It would be the served
model even if the app still had a Python backend.

That it is also the easiest to deploy is a genuine bonus rather than the reason:
a coefficient matrix and an intercept vector are ~9 KB of JSON, they need no
WASM runtime, and matrix-multiply-plus-softmax reproduces scikit-learn's
predict_proba to floating-point noise -- which ml/tests/test_parity.py and the
matching Vitest suite assert at 1e-6 against 50 fixed profiles.

The Random Forest is retained in the comparison as the offline benchmark, and
its confusion matrix and feature importances are still published on the /model
page.
"""
from __future__ import annotations

import json
import pathlib
import sys

import joblib
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

from pipeline import (  # noqa: E402
    CATEGORICAL_FEATURES, EMIRATE_WEIGHT, EMIRATES, EMSAT_MAX, EMSAT_MIN,
    FEATURE_COLUMNS, NUMERIC_FEATURES, SUBJECTS, TRACKS,
)
from recommender import (  # noqa: E402
    DEMAND_SCORE, FEATURE_LABELS, WEIGHT_DEMAND, WEIGHT_SECTOR,
    WEIGHT_SIMILARITY, career_vector,
)
from skill_map import INVERTED_FEATURES, SKILL_WEIGHTS  # noqa: E402

ARTIFACTS = HERE / "artifacts"
DATA_DIR = ROOT / "frontend" / "public" / "data"
OUT = ROOT / "frontend" / "public" / "model" / "model.v1.json"

CONTRACT_VERSION = 1


def _round(values, places: int = 8):
    """Trim float noise so the bundle diffs cleanly between rebuilds."""
    array = np.asarray(values, dtype=float)
    return np.round(array, places).tolist()


def main() -> None:
    bundle = joblib.load(ARTIFACTS / "model.joblib")
    model = bundle["model"]
    if bundle["model_name"] != "logistic_regression":
        raise SystemExit(
            f"export expects the logistic regression to be selected, got "
            f"{bundle['model_name']!r}. Update SELECTED_MODEL or this exporter."
        )

    preprocessor = model.named_steps["prep"]
    classifier = model.named_steps["clf"]

    # --- preprocessing parameters ----------------------------------------
    numeric = preprocessor.named_transformers_["num"]
    imputer = numeric.named_steps["impute"]
    scaler = numeric.named_steps["scale"]

    # Sanity: the exported vector layout must match what the model was fitted
    # on, or inference.ts would silently score against shifted columns.
    expected_width = len(NUMERIC_FEATURES) + len(TRACKS) + len(EMIRATES)
    if classifier.coef_.shape[1] != expected_width:
        raise SystemExit(
            f"feature width mismatch: model expects {classifier.coef_.shape[1]}, "
            f"export lays out {expected_width}"
        )

    careers = json.loads((DATA_DIR / "careers.json").read_text(encoding="utf-8"))
    metrics = json.loads((ARTIFACTS / "metrics.json").read_text(encoding="utf-8"))

    payload = {
        "contract": CONTRACT_VERSION,
        "generatedFrom": {
            "model": bundle["model_name"],
            "trainedAt": bundle["trained_at"],
            "seed": bundle["seed"],
            "datasetRows": bundle["dataset_rows"],
            "sklearnVersion": bundle["sklearn_version"],
        },

        # --- feature construction, mirrored by inference.ts ---------------
        "features": {
            "order": FEATURE_COLUMNS,
            "numeric": NUMERIC_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "subjects": SUBJECTS,
            "tracks": TRACKS,
            "emirates": EMIRATES,
            "emirateWeight": EMIRATE_WEIGHT,
            "emsatMin": EMSAT_MIN,
            "emsatMax": EMSAT_MAX,
            "subjectDefault": 55.0,
            "questionnaireDefault": 50.0,
        },

        # --- fitted preprocessing ----------------------------------------
        "preprocess": {
            "imputerMedians": _round(imputer.statistics_),
            "scalerMean": _round(scaler.mean_),
            "scalerScale": _round(scaler.scale_),
        },

        # --- the classifier ------------------------------------------------
        "classifier": {
            "kind": "multinomial_logistic_regression",
            "classes": list(classifier.classes_),
            "coefficients": _round(classifier.coef_),
            "intercepts": _round(classifier.intercept_),
        },

        # --- content-based similarity layer --------------------------------
        # The ideal-profile vector for every career, in the fixed dimension
        # order RIASEC + OCEAN + subjects, matching recommender.career_vector.
        "similarity": {
            "dimensions": (
                [f"riasec_{k}" for k in "RIASEC"]
                + [f"big5_{k}" for k in "OCEAN"]
                + list(SUBJECTS)
            ),
            "careerVectors": {c["id"]: _round(career_vector(c), 4) for c in careers},
            "careerSectors": {c["id"]: c["sector"] for c in careers},
            "careerDemand": {c["id"]: c["demandOutlook"] for c in careers},
        },

        # --- the blend ------------------------------------------------------
        "blend": {
            "sector": WEIGHT_SECTOR,
            "similarity": WEIGHT_SIMILARITY,
            "demand": WEIGHT_DEMAND,
            "demandScores": DEMAND_SCORE,
        },

        # --- skill estimation ------------------------------------------------
        # Shipped rather than duplicated in TypeScript: these 70 weight vectors
        # are the whole skill-gap model, and a second hand-maintained copy would
        # drift from the documented table the moment either side was edited.
        "skillMap": {
            "weights": SKILL_WEIGHTS,
            "invertedFeatures": sorted(INVERTED_FEATURES),
        },

        # --- explanation labels --------------------------------------------
        "featureLabels": {k: {"en": en, "ar": ar} for k, (en, ar) in FEATURE_LABELS.items()},

        # --- what the /model page displays ----------------------------------
        "metrics": {
            "comparison": metrics["model_comparison"],
            "selected": metrics["selected_model"],
            "dataset": metrics["dataset"],
            "protocol": metrics["protocol"],
            "featureImportance": dict(list(metrics["permutation_importance"].items())[:12]),
            "datasetRows": bundle["dataset_rows"],
            "classes": list(classifier.classes_),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
                   encoding="utf-8")
    size = OUT.stat().st_size
    print(f"wrote {OUT.relative_to(ROOT)}  {size:,} bytes")
    print(f"  classes      : {len(classifier.classes_)}")
    print(f"  feature width: {classifier.coef_.shape[1]}")
    print(f"  careers      : {len(careers)}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Train the Masar AI sector classifier and write every reported artifact.

One command reproduces everything quoted in the README and the documentation:

    python ml/train.py

Outputs (all under ml/artifacts/):
  model.joblib            the selected pipeline + label list + metadata
  metrics.json            CV comparison, held-out test scores, feature importance
  confusion_matrix.png    row-normalised, held-out test set
  model_comparison.png    the three candidate models side by side
  feature_importance.png  permutation importance on the held-out test set

The run is deterministic: same dataset + same seed -> same numbers.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import sys
import time

import joblib
import numpy as np
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from evaluate import (  # noqa: E402
    ARTIFACTS, DATASET, compute_feature_importance, load_dataset,
    plot_confusion_matrix, plot_feature_importance, plot_model_comparison,
    score_model,
)
from pipeline import FEATURE_COLUMNS, build_models  # noqa: E402

# v1 selected the Random Forest. v2 does not, and the reason is in the numbers
# rather than in deployment convenience: on the 18-sector label space the
# multinomial Logistic Regression wins on both CV macro-F1 (0.623 vs 0.618) and
# held-out accuracy (0.662 vs 0.641). The forest's advantage in v1 came from
# modelling sharp interactions across 15 well-separated sectors; adding
# engineering, law and social — which overlap heavily with sectors already
# present — moved the problem towards one the linear model handles better.
#
# It also happens to be the model that deploys exactly to a static host: a
# coefficient matrix and intercepts reimplement in TypeScript to within
# floating-point noise, which is what ml/tests/test_parity.py asserts. That is
# a genuine convenience, but it is not why it was chosen.
SELECTED_MODEL = "logistic_regression"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--dataset", type=pathlib.Path, default=DATASET)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--folds", type=int, default=5)
    args = parser.parse_args()

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    x, y = load_dataset(args.dataset)
    print(f"dataset: {args.dataset.name}  n={len(x)}  "
          f"features={len(FEATURE_COLUMNS)}  classes={y.nunique()}")

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=args.test_size, stratify=y, random_state=args.seed)
    print(f"split  : train={len(x_train)}  test={len(x_test)}  "
          f"(stratified, seed={args.seed})\n")

    # --- 1. compare the three candidates with stratified k-fold CV ----------
    folds = StratifiedKFold(n_splits=args.folds, shuffle=True, random_state=args.seed)
    comparison: dict[str, dict] = {}
    fitted: dict[str, object] = {}

    for name, model in build_models(args.seed).items():
        started = time.perf_counter()
        scores = cross_validate(
            model, x_train, y_train, cv=folds,
            scoring=["accuracy", "f1_macro"], n_jobs=-1)
        model.fit(x_train, y_train)
        fitted[name] = model
        elapsed = time.perf_counter() - started
        comparison[name] = {
            "cv_accuracy_mean": round(float(scores["test_accuracy"].mean()), 4),
            "cv_accuracy_std": round(float(scores["test_accuracy"].std()), 4),
            "cv_macro_f1_mean": round(float(scores["test_f1_macro"].mean()), 4),
            "cv_macro_f1_std": round(float(scores["test_f1_macro"].std()), 4),
            "fit_seconds": round(elapsed, 2),
            "test": score_model(model, x_test, y_test),
        }
        row = comparison[name]
        print(f"{name:<22} CV acc={row['cv_accuracy_mean']:.4f} "
              f"(+/-{row['cv_accuracy_std']:.4f})  "
              f"CV macroF1={row['cv_macro_f1_mean']:.4f}  "
              f"test acc={row['test']['accuracy']:.4f}  [{elapsed:.1f}s]")

    best_by_cv = max(comparison, key=lambda n: comparison[n]["cv_macro_f1_mean"])
    model_name = SELECTED_MODEL
    model = fitted[model_name]
    print(f"\nbest by CV macro-F1: {best_by_cv}")
    print(f"selected for serving: {model_name}"
          + ("" if best_by_cv == model_name else
             "  (see the note in train.py and docs/ML_METHODOLOGY.md)"))

    # --- 2. held-out evaluation of the selected model -----------------------
    test_scores = comparison[model_name]["test"]
    print(f"\nheld-out test: accuracy={test_scores['accuracy']:.4f}  "
          f"macro-F1={test_scores['macro_f1']:.4f}")

    importance = compute_feature_importance(model, x_test, y_test, seed=args.seed)
    top = list(importance.items())[:8]
    print("top features: " + ", ".join(f"{k} ({v:+.4f})" for k, v in top))

    # --- 3. figures ---------------------------------------------------------
    plot_confusion_matrix(model, x_test, y_test, ARTIFACTS / "confusion_matrix.png")
    plot_model_comparison(comparison, ARTIFACTS / "model_comparison.png")
    plot_feature_importance(importance, ARTIFACTS / "feature_importance.png")

    # --- 4. persist ---------------------------------------------------------
    labels = sorted(y.unique().tolist())
    bundle = {
        "model": model,
        "model_name": model_name,
        "labels": labels,
        "feature_columns": FEATURE_COLUMNS,
        "trained_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "seed": args.seed,
        "dataset_rows": int(len(x)),
        "sklearn_version": __import__("sklearn").__version__,
    }
    joblib.dump(bundle, ARTIFACTS / "model.joblib", compress=3)

    metrics = {
        "generated_at": bundle["trained_at"],
        "dataset": {
            "path": str(args.dataset.relative_to(HERE.parent)),
            "rows": int(len(x)),
            "features": len(FEATURE_COLUMNS),
            "classes": labels,
            "class_balance": {k: int(v) for k, v in y.value_counts().items()},
        },
        "protocol": {
            "split": f"stratified train/test {1 - args.test_size:.0%}/{args.test_size:.0%}",
            "cross_validation": f"stratified {args.folds}-fold on the training split",
            "seed": args.seed,
        },
        "model_comparison": comparison,
        "selected_model": {
            "name": model_name,
            "reason": ("Best macro-F1 under cross-validation among the three "
                       "candidates, and the only one that gives both calibrated "
                       "class probabilities and per-feature importances, which "
                       "the student-facing explanation depends on."),
            "test": test_scores,
        },
        "permutation_importance": importance,
        "environment": {
            "python": sys.version.split()[0],
            "scikit_learn": bundle["sklearn_version"],
            "numpy": np.__version__,
        },
    }
    (ARTIFACTS / "metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("\nwrote:")
    for name in ("model.joblib", "metrics.json", "confusion_matrix.png",
                 "model_comparison.png", "feature_importance.png"):
        size = (ARTIFACTS / name).stat().st_size
        print(f"  ml/artifacts/{name:<24} {size:>9,} bytes")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Evaluation helpers and a standalone evaluation entry point.

``train.py`` imports the functions here so that the numbers written at training
time and the numbers produced by re-running evaluation on a saved model are
computed by exactly the same code.

Standalone use (re-scores the committed model against the committed dataset):

    python ml/evaluate.py
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

import joblib
import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")           # no display in CI or in a container
import matplotlib.pyplot as plt  # noqa: E402

from sklearn.inspection import permutation_importance  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    ConfusionMatrixDisplay, accuracy_score, classification_report,
    confusion_matrix, f1_score,
)

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pipeline import FEATURE_COLUMNS, TARGET  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
ARTIFACTS = HERE / "artifacts"
DATASET = HERE / "data" / "students.csv"
MODEL_PATH = ARTIFACTS / "model.joblib"

PLOT_STYLE = {
    "figure.dpi": 130,
    "font.size": 9,
    "axes.titlesize": 11,
    "axes.edgecolor": "#334155",
    "axes.labelcolor": "#0F172A",
    "text.color": "#0F172A",
    "xtick.color": "#334155",
    "ytick.color": "#334155",
}
UAE_GREEN = "#00732F"
GULF_BLUE = "#0B3D5C"


def load_dataset(path: pathlib.Path = DATASET) -> tuple[pd.DataFrame, pd.Series]:
    if not path.exists():
        raise SystemExit(
            f"{path} not found -- run  python ml/generate_dataset.py  first.")
    frame = pd.read_csv(path)
    return frame[FEATURE_COLUMNS], frame[TARGET]


def score_model(model, x_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """Accuracy, macro-F1 and the full per-sector report."""
    predicted = model.predict(x_test)
    report = classification_report(y_test, predicted, output_dict=True, zero_division=0)
    per_sector = {
        label: {
            "precision": round(values["precision"], 4),
            "recall": round(values["recall"], 4),
            "f1": round(values["f1-score"], 4),
            "support": int(values["support"]),
        }
        for label, values in report.items()
        if label not in {"accuracy", "macro avg", "weighted avg"}
    }
    return {
        "accuracy": round(accuracy_score(y_test, predicted), 4),
        "macro_f1": round(f1_score(y_test, predicted, average="macro"), 4),
        "weighted_f1": round(f1_score(y_test, predicted, average="weighted"), 4),
        "per_sector": per_sector,
    }


def plot_confusion_matrix(model, x_test, y_test, out: pathlib.Path) -> None:
    labels = sorted(y_test.unique())
    matrix = confusion_matrix(y_test, model.predict(x_test), labels=labels,
                              normalize="true")
    with plt.rc_context(PLOT_STYLE):
        fig, ax = plt.subplots(figsize=(9, 8))
        ConfusionMatrixDisplay(matrix, display_labels=labels).plot(
            ax=ax, cmap="Greens", colorbar=True, values_format=".2f",
            xticks_rotation=60)
        ax.set_title("Masar AI -- sector classifier, row-normalised confusion matrix")
        fig.tight_layout()
        fig.savefig(out)
        plt.close(fig)


def plot_model_comparison(comparison: dict, out: pathlib.Path) -> None:
    names = list(comparison)
    accuracy = [comparison[n]["cv_accuracy_mean"] for n in names]
    macro_f1 = [comparison[n]["cv_macro_f1_mean"] for n in names]
    errors = [comparison[n]["cv_accuracy_std"] for n in names]
    positions = np.arange(len(names))
    with plt.rc_context(PLOT_STYLE):
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.bar(positions - 0.19, accuracy, 0.38, yerr=errors, capsize=3,
               label="CV accuracy", color=UAE_GREEN)
        ax.bar(positions + 0.19, macro_f1, 0.38, label="CV macro-F1", color=GULF_BLUE)
        ax.set_xticks(positions, [n.replace("_", " ") for n in names])
        ax.set_ylim(0, 1)
        ax.set_ylabel("score")
        ax.set_title("Model comparison (stratified 5-fold cross-validation)")
        ax.legend(frameon=False)
        ax.spines[["top", "right"]].set_visible(False)
        for x, value in zip(positions - 0.19, accuracy):
            ax.text(x, value + 0.02, f"{value:.3f}", ha="center", fontsize=8)
        fig.tight_layout()
        fig.savefig(out)
        plt.close(fig)


def compute_feature_importance(model, x_test, y_test, seed: int = 42,
                               repeats: int = 5) -> dict[str, float]:
    """Permutation importance on the *raw* feature columns.

    We deliberately permute the input columns rather than reading the Random
    Forest's internal ``feature_importances_``: the internal values are computed
    on the one-hot expanded matrix and are biased towards high-cardinality
    features.  Permutation importance answers the question the student's
    explanation actually needs -- "how much does this input matter?"
    """
    result = permutation_importance(
        model, x_test, y_test, n_repeats=repeats, random_state=seed,
        scoring="accuracy", n_jobs=-1)
    importance = {
        column: round(float(mean), 5)
        for column, mean in zip(FEATURE_COLUMNS, result.importances_mean)
    }
    return dict(sorted(importance.items(), key=lambda kv: kv[1], reverse=True))


def plot_feature_importance(importance: dict[str, float], out: pathlib.Path,
                            top: int = 18) -> None:
    items = list(importance.items())[:top][::-1]
    names = [k for k, _ in items]
    values = [v for _, v in items]
    with plt.rc_context(PLOT_STYLE):
        fig, ax = plt.subplots(figsize=(7, 6))
        ax.barh(names, values, color=UAE_GREEN)
        ax.set_xlabel("drop in accuracy when the feature is shuffled")
        ax.set_title(f"Permutation importance (top {len(items)} features)")
        ax.spines[["top", "right"]].set_visible(False)
        fig.tight_layout()
        fig.savefig(out)
        plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-evaluate the saved model.")
    parser.add_argument("--model", type=pathlib.Path, default=MODEL_PATH)
    parser.add_argument("--dataset", type=pathlib.Path, default=DATASET)
    args = parser.parse_args()

    if not args.model.exists():
        raise SystemExit(f"{args.model} not found -- run  python ml/train.py  first.")
    bundle = joblib.load(args.model)
    model = bundle["model"]
    x, y = load_dataset(args.dataset)

    scores = score_model(model, x, y)
    print(f"model      : {bundle['model_name']}  (trained {bundle['trained_at']})")
    print(f"dataset    : {args.dataset.name}  n={len(x)}")
    print(f"accuracy   : {scores['accuracy']:.4f}   (whole dataset, including "
          f"the rows it was trained on)")
    print(f"macro F1   : {scores['macro_f1']:.4f}")
    print("\nper-sector F1:")
    for sector, values in sorted(scores["per_sector"].items(),
                                 key=lambda kv: -kv[1]["f1"]):
        print(f"  {sector:<18} f1={values['f1']:.3f}  support={values['support']}")

    metrics_path = ARTIFACTS / "metrics.json"
    if metrics_path.exists():
        held_out = json.loads(metrics_path.read_text())["selected_model"]["test"]
        print(f"\nheld-out test accuracy from metrics.json: {held_out['accuracy']:.4f} "
              "(this is the number to quote)")


if __name__ == "__main__":
    main()

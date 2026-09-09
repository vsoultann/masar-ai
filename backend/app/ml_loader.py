"""Loads the trained model and hands out a ready-to-use recommender.

The ``ml/`` directory is the single source of truth for the feature schema and
the ranking logic; the backend adds it to ``sys.path`` and imports it rather
than reimplementing anything.  See docs/ARCHITECTURE.md.

The recommender is cached because building it means loading a ~10 MB joblib
bundle and 180 catalog rows.  The cache is keyed on a version counter that the
admin CRUD endpoints bump, so an edited career takes effect on the next request
without a restart.
"""
from __future__ import annotations

import json
import sys
import threading
from typing import Any

import joblib
from sqlalchemy.orm import Session

from app.core.config import ARTIFACTS_DIR, DATA_DIR, ML_DIR

if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from recommender import CareerRecommender  # noqa: E402
from skill_map import SKILL_WEIGHTS  # noqa: E402

MODEL_PATH = ARTIFACTS_DIR / "model.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"

_lock = threading.Lock()
_bundle: dict[str, Any] | None = None
_recommender: CareerRecommender | None = None
_cached_version = -1
_catalog_version = 0


class ModelNotTrainedError(RuntimeError):
    """Raised when the joblib artifact is missing."""


def bump_catalog_version() -> int:
    """Invalidate the cached recommender after a catalog edit."""
    global _catalog_version
    with _lock:
        _catalog_version += 1
        return _catalog_version


def load_bundle(force: bool = False) -> dict[str, Any]:
    global _bundle
    with _lock:
        if _bundle is None or force:
            if not MODEL_PATH.exists():
                raise ModelNotTrainedError(
                    f"{MODEL_PATH} is missing. Run:  python ml/train.py")
            _bundle = joblib.load(MODEL_PATH)
        return _bundle


def load_skills() -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / "skills.json").read_text(encoding="utf-8"))


def load_sectors() -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / "sectors.json").read_text(encoding="utf-8"))


def load_initiatives() -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / "initiatives.json").read_text(encoding="utf-8"))


def load_questionnaire(name: str) -> dict[str, Any]:
    """``name`` is ``riasec`` or ``bigfive``."""
    path = DATA_DIR / f"questionnaire_{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def get_recommender(db: Session) -> CareerRecommender:
    """A recommender built from the catalogs currently in the database."""
    global _recommender, _cached_version
    from app.models import Career, Course          # local import: avoids a cycle

    with _lock:
        if _recommender is not None and _cached_version == _catalog_version:
            return _recommender

    bundle = load_bundle()
    careers = [row.to_dict() for row in db.query(Career).all()]
    courses = [row.to_dict() for row in db.query(Course).all()]
    if not careers:
        raise RuntimeError("No careers in the database. Run:  python backend/seed.py")

    recommender = CareerRecommender(bundle, careers, courses, load_skills())
    with _lock:
        _recommender = recommender
        _cached_version = _catalog_version
    return recommender


def reload_model() -> dict[str, Any]:
    """Re-read the joblib bundle from disk (used by the admin retrain button)."""
    global _recommender
    load_bundle(force=True)
    with _lock:
        _recommender = None
    return model_info()


def model_info() -> dict[str, Any]:
    """Metadata about the served model, safe to expose to an admin."""
    try:
        bundle = load_bundle()
    except ModelNotTrainedError as error:
        return {"available": False, "error": str(error)}
    return {
        "available": True,
        "name": bundle.get("model_name"),
        "trained_at": bundle.get("trained_at"),
        "labels": bundle.get("labels", []),
        "features": len(bundle.get("feature_columns", [])),
        "dataset_rows": bundle.get("dataset_rows"),
        "seed": bundle.get("seed"),
        "sklearn_version": bundle.get("sklearn_version"),
        "skills_mapped": len(SKILL_WEIGHTS),
    }


def metrics() -> dict[str, Any]:
    """The contents of ml/artifacts/metrics.json, or an explanatory stub."""
    if not METRICS_PATH.exists():
        return {"available": False,
                "error": "ml/artifacts/metrics.json is missing. Run: python ml/train.py"}
    payload = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    payload["available"] = True
    return payload

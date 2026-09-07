"""Admin panel: statistics, catalog CRUD, model metrics and retraining."""
from __future__ import annotations

import subprocess
import sys
from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import ml_loader
from app.core.config import ML_DIR, ROOT_DIR, settings
from app.core.database import get_db
from app.models import (
    Career, ChatMessage, Course, RecommendationRun, SavedCareer, StudentProfile, User,
)
from app.routers.deps import current_admin
from app.schemas.catalog import CareerUpsert, CourseUpsert

router = APIRouter(prefix="/admin", tags=["admin"],
                   dependencies=[Depends(current_admin)])


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------
@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict[str, Any]:
    sectors = {sector["id"]: sector for sector in ml_loader.load_sectors()}
    runs = db.query(RecommendationRun).all()

    top_careers = Counter(run.top_career_id for run in runs)
    sector_spread = Counter(run.top_sector for run in runs)
    career_titles = {row.id: (row.title_en, row.title_ar)
                     for row in db.query(Career).all()}

    completed = (db.query(func.count(StudentProfile.id))
                 .filter(StudentProfile.completed_steps >= 4).scalar() or 0)
    total_students = db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0

    return {
        "users": {
            "total": db.query(func.count(User.id)).scalar() or 0,
            "students": total_students,
            "admins": db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0,
            "profiles_completed": completed,
            "completion_rate": round(completed / total_students, 3) if total_students else 0.0,
        },
        "activity": {
            "recommendation_runs": len(runs),
            "saved_careers": db.query(func.count(SavedCareer.id)).scalar() or 0,
            "chat_messages": db.query(func.count(ChatMessage.id)).scalar() or 0,
        },
        "catalog": {
            "careers": db.query(func.count(Career.id)).scalar() or 0,
            "courses": db.query(func.count(Course.id)).scalar() or 0,
            "skills": len(ml_loader.load_skills()),
            "sectors": len(sectors),
        },
        "most_recommended": [
            {"career_id": career_id, "count": count,
             "title_en": career_titles.get(career_id, (career_id, career_id))[0],
             "title_ar": career_titles.get(career_id, (career_id, career_id))[1]}
            for career_id, count in top_careers.most_common(10)
        ],
        "sector_distribution": [
            {"sector": sector_id, "count": count,
             "name_en": sectors.get(sector_id, {}).get("name_en", sector_id),
             "name_ar": sectors.get(sector_id, {}).get("name_ar", sector_id),
             "color": sectors.get(sector_id, {}).get("color", "#00732F")}
            for sector_id, count in sector_spread.most_common()
        ],
        "mentor_mode": settings.mentor_mode,
    }


@router.get("/students")
def list_students(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Anonymised student list.

    Names and email addresses are never returned: an admin needs aggregate
    oversight, not the ability to read an individual student's identity
    alongside their personality scores.
    """
    rows = (db.query(User, StudentProfile)
            .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
            .filter(User.role == "student").order_by(User.id).all())
    latest = {
        run.user_id: run for run in
        db.query(RecommendationRun).order_by(RecommendationRun.created_at.asc()).all()
    }
    students = []
    for user, profile in rows:
        run = latest.get(user.id)
        students.append({
            "reference": f"STU-{user.id:04d}",
            "emirate": profile.emirate if profile else None,
            "track": profile.track if profile else None,
            "grade_level": profile.grade_level if profile else None,
            "completed_steps": profile.completed_steps if profile else 0,
            "is_complete": profile.is_complete if profile else False,
            "registered_at": user.created_at,
            "last_top_career": run.top_career_id if run else None,
            "last_top_sector": run.top_sector if run else None,
        })
    return {"total": len(students), "students": students}


# ---------------------------------------------------------------------------
# Catalog CRUD
# ---------------------------------------------------------------------------
def _career_columns(payload: CareerUpsert) -> tuple[dict, dict]:
    data = payload.model_dump()
    columns = {key: data.pop(key) for key in ("id", "title_en", "title_ar",
                                              "sector", "demand")}
    return columns, data


@router.post("/careers", status_code=status.HTTP_201_CREATED)
def create_career(payload: CareerUpsert, db: Session = Depends(get_db)) -> dict[str, Any]:
    if db.get(Career, payload.id):
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"A career with id '{payload.id}' already exists")
    columns, rest = _career_columns(payload)
    row = Career(**columns, payload=rest)
    db.add(row)
    db.commit()
    ml_loader.bump_catalog_version()
    return row.to_dict()


@router.put("/careers/{career_id}")
def update_career(career_id: str, payload: CareerUpsert,
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(Career, career_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown career: {career_id}")
    if payload.id != career_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "The career id cannot be changed")
    columns, rest = _career_columns(payload)
    for key, value in columns.items():
        setattr(row, key, value)
    row.payload = rest
    db.commit()
    ml_loader.bump_catalog_version()
    return row.to_dict()


@router.delete("/careers/{career_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_career(career_id: str, db: Session = Depends(get_db)) -> None:
    row = db.get(Career, career_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown career: {career_id}")
    db.delete(row)
    db.commit()
    ml_loader.bump_catalog_version()


def _course_columns(payload: CourseUpsert) -> tuple[dict, dict]:
    data = payload.model_dump()
    columns = {key: data.pop(key) for key in
               ("id", "title_en", "title_ar", "provider", "provider_type",
                "level", "cost", "language", "duration_weeks")}
    return columns, data


@router.post("/courses", status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseUpsert, db: Session = Depends(get_db)) -> dict[str, Any]:
    if db.get(Course, payload.id):
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"A course with id '{payload.id}' already exists")
    columns, rest = _course_columns(payload)
    row = Course(**columns, payload=rest)
    db.add(row)
    db.commit()
    ml_loader.bump_catalog_version()
    return row.to_dict()


@router.put("/courses/{course_id}")
def update_course(course_id: str, payload: CourseUpsert,
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(Course, course_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown course: {course_id}")
    if payload.id != course_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "The course id cannot be changed")
    columns, rest = _course_columns(payload)
    for key, value in columns.items():
        setattr(row, key, value)
    row.payload = rest
    db.commit()
    ml_loader.bump_catalog_version()
    return row.to_dict()


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: str, db: Session = Depends(get_db)) -> None:
    row = db.get(Course, course_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown course: {course_id}")
    db.delete(row)
    db.commit()
    ml_loader.bump_catalog_version()


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
@router.get("/model")
def model() -> dict[str, Any]:
    return {"model": ml_loader.model_info(), "metrics": ml_loader.metrics()}


@router.post("/model/retrain")
def retrain() -> dict[str, Any]:
    """Run ml/train.py and reload the model.

    This is a synchronous subprocess on purpose.  Training takes a few seconds
    on the 5,000-row dataset, and a background job queue would be a lot of
    machinery for a button the project team presses occasionally.  The 10-minute
    timeout is there so a wedged run cannot hold the worker forever.
    """
    process = subprocess.run(
        [sys.executable, str(ML_DIR / "train.py")],
        capture_output=True, text=True, cwd=str(ROOT_DIR), timeout=600,
    )
    if process.returncode != 0:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            {"message": "Training failed", "stderr": process.stderr[-2000:]})
    info = ml_loader.reload_model()
    return {"status": "retrained", "model": info,
            "log": process.stdout[-4000:],
            "metrics": ml_loader.metrics()}

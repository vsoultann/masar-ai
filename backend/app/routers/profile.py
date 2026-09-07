"""The four-step onboarding wizard, saved one step at a time."""
from __future__ import annotations

import sys
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import ml_loader
from app.core.config import ML_DIR
from app.core.database import get_db
from app.models import StudentProfile, User
from app.routers.deps import current_profile, current_user
from app.schemas.profile import AcademicStep, PersonalStep, ProfileOut, QuestionnaireStep

if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))
from recommender import completeness, score_questionnaire  # noqa: E402

router = APIRouter(prefix="/profile", tags=["profile"])


def _out(profile: StudentProfile) -> ProfileOut:
    return ProfileOut(
        full_name=profile.full_name, emirate=profile.emirate, school=profile.school,
        grade_level=profile.grade_level, track=profile.track,
        grades=profile.grades or {}, emsat=profile.emsat or {},
        riasec=profile.riasec or {}, bigfive=profile.bigfive or {},
        riasec_answers=profile.riasec_answers or {},
        bigfive_answers=profile.bigfive_answers or {},
        completed_steps=profile.completed_steps, is_complete=profile.is_complete,
    )


def _advance(profile: StudentProfile, step: int) -> None:
    """Steps are cumulative: reaching step N implies 1..N are done."""
    profile.completed_steps = max(profile.completed_steps, step)


@router.get("", response_model=ProfileOut)
def read_profile(profile: StudentProfile = Depends(current_profile)) -> ProfileOut:
    return _out(profile)


@router.put("/step1", response_model=ProfileOut)
def save_personal(payload: PersonalStep, db: Session = Depends(get_db),
                  profile: StudentProfile = Depends(current_profile),
                  user: User = Depends(current_user)) -> ProfileOut:
    profile.full_name = payload.full_name.strip()
    profile.emirate = payload.emirate
    profile.school = payload.school.strip()
    profile.grade_level = payload.grade_level
    profile.track = payload.track
    _advance(profile, 1)
    # Keep the account name in step with the profile name.
    user.full_name = profile.full_name
    db.commit()
    db.refresh(profile)
    return _out(profile)


@router.put("/step2", response_model=ProfileOut)
def save_academic(payload: AcademicStep, db: Session = Depends(get_db),
                  profile: StudentProfile = Depends(current_profile)) -> ProfileOut:
    profile.grades = {k: float(v) for k, v in payload.grades.items()}
    profile.emsat = {k: float(v) for k, v in payload.emsat.items()}
    _advance(profile, 2)
    db.commit()
    db.refresh(profile)
    return _out(profile)


def _save_questionnaire(profile: StudentProfile, db: Session, payload: QuestionnaireStep,
                        name: str, step: int) -> ProfileOut:
    questionnaire = ml_loader.load_questionnaire(name)
    items = questionnaire["items"]
    scores = score_questionnaire(payload.answers, items)
    filled = completeness(payload.answers, items)

    if name == "riasec":
        profile.riasec_answers = payload.answers
        profile.riasec = scores
    else:
        profile.bigfive_answers = payload.answers
        profile.bigfive = scores

    # A partially answered questionnaire is stored (so the student can resume)
    # but does not count as a completed step.
    if filled >= 0.999:
        _advance(profile, step)
    db.commit()
    db.refresh(profile)
    return _out(profile)


@router.put("/step3", response_model=ProfileOut)
def save_riasec(payload: QuestionnaireStep, db: Session = Depends(get_db),
                profile: StudentProfile = Depends(current_profile)) -> ProfileOut:
    return _save_questionnaire(profile, db, payload, "riasec", 3)


@router.put("/step4", response_model=ProfileOut)
def save_bigfive(payload: QuestionnaireStep, db: Session = Depends(get_db),
                 profile: StudentProfile = Depends(current_profile)) -> ProfileOut:
    return _save_questionnaire(profile, db, payload, "bigfive", 4)


@router.get("/questionnaires/{name}")
def read_questionnaire(name: str) -> dict[str, Any]:
    """``name`` is ``riasec`` or ``bigfive``."""
    if name not in {"riasec", "bigfive"}:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown questionnaire")
    return ml_loader.load_questionnaire(name)

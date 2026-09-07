"""Recommendations, skill gap, learning pathway and saved careers."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import RecommendationRun, SavedCareer, StudentProfile, User
from app.routers.deps import complete_profile, current_user
from app.services import recommendation

router = APIRouter(tags=["recommendations"])


@router.get("/recommendations")
def get_recommendations(
    top_n: int = Query(10, ge=1, le=60),
    save: bool = Query(True, description="record this run for dashboard/admin stats"),
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(complete_profile),
) -> dict[str, Any]:
    payload = recommendation.recommend(db, profile, top_n=top_n)
    if save:
        recommendation.persist_run(db, profile, payload)
    return payload


@router.get("/skill-gap/{career_id}")
def get_skill_gap(career_id: str, db: Session = Depends(get_db),
                  profile: StudentProfile = Depends(complete_profile)) -> dict[str, Any]:
    try:
        return recommendation.skill_gap(db, profile, career_id)
    except KeyError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown career: {career_id}")


@router.get("/learning-path/{career_id}")
def get_learning_path(career_id: str, db: Session = Depends(get_db),
                      profile: StudentProfile = Depends(complete_profile)) -> dict[str, Any]:
    try:
        return recommendation.learning_pathway(db, profile, career_id)
    except KeyError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown career: {career_id}")


@router.get("/skills/me")
def get_my_skills(db: Session = Depends(get_db),
                  profile: StudentProfile = Depends(complete_profile)) -> dict[str, Any]:
    return {"skills": recommendation.current_skills(db, profile)}


# --- saved careers ---------------------------------------------------------
@router.get("/saved")
def list_saved(db: Session = Depends(get_db),
               user: User = Depends(current_user)) -> dict[str, Any]:
    from app import ml_loader
    recommender = ml_loader.get_recommender(db)
    rows = (db.query(SavedCareer).filter(SavedCareer.user_id == user.id)
            .order_by(SavedCareer.created_at.desc()).all())
    return {"saved": [
        {"career_id": row.career_id, "saved_at": row.created_at,
         "career": recommender.career(row.career_id)}
        for row in rows if recommender.career(row.career_id)
    ]}


@router.post("/saved/{career_id}", status_code=status.HTTP_201_CREATED)
def save_career(career_id: str, db: Session = Depends(get_db),
                user: User = Depends(current_user)) -> dict[str, str]:
    from app import ml_loader
    if ml_loader.get_recommender(db).career(career_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown career: {career_id}")
    existing = (db.query(SavedCareer)
                .filter(SavedCareer.user_id == user.id,
                        SavedCareer.career_id == career_id).one_or_none())
    if existing is None:
        db.add(SavedCareer(user_id=user.id, career_id=career_id))
        db.commit()
    return {"career_id": career_id, "status": "saved"}


@router.delete("/saved/{career_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_career(career_id: str, db: Session = Depends(get_db),
                  user: User = Depends(current_user)) -> None:
    (db.query(SavedCareer)
     .filter(SavedCareer.user_id == user.id, SavedCareer.career_id == career_id)
     .delete())
    db.commit()


@router.get("/history")
def recommendation_history(db: Session = Depends(get_db),
                           user: User = Depends(current_user)) -> dict[str, Any]:
    rows = (db.query(RecommendationRun)
            .filter(RecommendationRun.user_id == user.id)
            .order_by(RecommendationRun.created_at.desc()).limit(20).all())
    return {"runs": [
        {"id": row.id, "created_at": row.created_at,
         "top_career_id": row.top_career_id, "top_sector": row.top_sector,
         "top10": row.result.get("top10", [])}
        for row in rows
    ]}

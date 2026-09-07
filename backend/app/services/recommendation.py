"""Turns database rows into the API-shaped payloads the frontend consumes.

Everything the student sees -- the dashboard, the PDF and the chatbot's context
-- is built from the functions here, so the three can never disagree about what
was recommended.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app import ml_loader
from app.models import Career, RecommendationRun, StudentProfile


def _sector_names(lang_neutral: bool = True) -> dict[str, dict[str, str]]:
    return {sector["id"]: sector for sector in ml_loader.load_sectors()}


def recommend(db: Session, profile: StudentProfile, top_n: int = 10) -> dict[str, Any]:
    """Top-N careers, each enriched with its full catalog record."""
    recommender = ml_loader.get_recommender(db)
    sectors = _sector_names()
    result = recommender.recommend(profile.to_feature_profile(), top_n=top_n)

    enriched: list[dict[str, Any]] = []
    for item in result["recommendations"]:
        career = recommender.career(item["career_id"])
        if career is None:                       # career deleted mid-session
            continue
        sector = sectors.get(career["sector"], {})
        enriched.append({
            **item,
            "career": career,
            "sector_name_en": sector.get("name_en", career["sector"]),
            "sector_name_ar": sector.get("name_ar", career["sector"]),
            "sector_color": sector.get("color", "#00732F"),
        })

    return {
        "recommendations": enriched,
        "sector_probabilities": [
            {
                "sector": sector_id,
                "name_en": sectors.get(sector_id, {}).get("name_en", sector_id),
                "name_ar": sectors.get(sector_id, {}).get("name_ar", sector_id),
                "color": sectors.get(sector_id, {}).get("color", "#00732F"),
                "probability": probability,
            }
            for sector_id, probability in result["sector_probabilities"].items()
        ],
        "model": result["model"],
        "generated_for": profile.user_id,
    }


def persist_run(db: Session, profile: StudentProfile, payload: dict[str, Any]) -> None:
    """Store a compact record of the run for the dashboard and admin stats."""
    if not payload["recommendations"]:
        return
    top = payload["recommendations"][0]
    run = RecommendationRun(
        user_id=profile.user_id,
        top_career_id=top["career_id"],
        top_sector=top["career"]["sector"],
        result={
            "generated_at_model": payload["model"],
            "top10": [
                {"career_id": item["career_id"], "match": item["match"],
                 "sector": item["career"]["sector"], "confidence": item["confidence"]}
                for item in payload["recommendations"]
            ],
        },
    )
    db.add(run)
    db.commit()


def skill_gap(db: Session, profile: StudentProfile, career_id: str) -> dict[str, Any]:
    recommender = ml_loader.get_recommender(db)
    if recommender.career(career_id) is None:
        raise KeyError(career_id)
    gap = recommender.skill_gap(profile.to_feature_profile(), career_id)
    career = recommender.career(career_id)
    gap["career_title_en"] = career["title_en"]
    gap["career_title_ar"] = career["title_ar"]
    return gap


def learning_pathway(db: Session, profile: StudentProfile, career_id: str) -> dict[str, Any]:
    recommender = ml_loader.get_recommender(db)
    if recommender.career(career_id) is None:
        raise KeyError(career_id)
    roadmap = recommender.learning_pathway(profile.to_feature_profile(), career_id)
    career = recommender.career(career_id)
    roadmap["career_title_en"] = career["title_en"]
    roadmap["career_title_ar"] = career["title_ar"]
    return roadmap


def current_skills(db: Session, profile: StudentProfile) -> list[dict[str, Any]]:
    """Every estimated skill, named in both languages, highest first."""
    recommender = ml_loader.get_recommender(db)
    estimates = recommender.current_skills(profile.to_feature_profile())
    catalog = {skill["id"]: skill for skill in ml_loader.load_skills()}
    rows = [
        {
            "skill_id": skill_id,
            "name_en": catalog.get(skill_id, {}).get("name_en", skill_id),
            "name_ar": catalog.get(skill_id, {}).get("name_ar", skill_id),
            "family": catalog.get(skill_id, {}).get("family", "other"),
            "value": value,
        }
        for skill_id, value in estimates.items()
    ]
    rows.sort(key=lambda row: row["value"], reverse=True)
    return rows


def report_payload(db: Session, profile: StudentProfile, lang: str) -> dict[str, Any]:
    """Everything the PDF needs, in one structure."""
    if not profile.is_complete:
        return {
            "student": {"full_name": profile.full_name},
            "profile": _profile_block(profile),
            "recommendations": [],
        }

    recommendations = recommend(db, profile, top_n=10)
    top = recommendations["recommendations"][0]
    gap = skill_gap(db, profile, top["career_id"])
    roadmap = learning_pathway(db, profile, top["career_id"])

    for item in recommendations["recommendations"]:
        item["sector_name"] = item[f"sector_name_{lang}"]

    return {
        "student": {"full_name": profile.full_name or "-"},
        "profile": _profile_block(profile),
        "recommendations": recommendations["recommendations"],
        "gap": gap,
        "roadmap": roadmap,
        "top_career_title": top["career"][f"title_{lang}"],
    }


def _profile_block(profile: StudentProfile) -> dict[str, Any]:
    return {
        "emirate": profile.emirate or "",
        "school": profile.school or "",
        "grade_level": profile.grade_level or "",
        "track": profile.track or "",
        "grades": profile.grades or {},
        "emsat": profile.emsat or {},
        "riasec": profile.riasec or {},
        "bigfive": profile.bigfive or {},
    }


def chat_context(db: Session, profile: StudentProfile | None) -> dict[str, Any]:
    """The student data injected into both mentor modes."""
    if profile is None:
        return {}
    context: dict[str, Any] = {
        "name": profile.full_name or None,
        "emirate": profile.emirate,
        "track": profile.track,
        "grades": profile.grades or {},
        "riasec": profile.riasec or {},
        "bigfive": profile.bigfive or {},
    }
    if not profile.is_complete:
        return context

    payload = recommend(db, profile, top_n=5)
    context["top_careers"] = [item["career"] for item in payload["recommendations"]]
    context["top_reasons"] = payload["recommendations"][0]["reasons"]

    top_id = payload["recommendations"][0]["career_id"]
    gap = skill_gap(db, profile, top_id)
    context["gaps"] = [entry for entry in gap["skills"] if entry["gap"] > 0][:6]
    roadmap = learning_pathway(db, profile, top_id)
    context["roadmap_courses"] = [course for phase in roadmap["phases"]
                                  for course in phase["courses"]]
    return context


def catalog_careers(db: Session) -> list[dict[str, Any]]:
    return [row.to_dict() for row in db.query(Career).order_by(Career.title_en).all()]

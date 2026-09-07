"""Public catalog browsing: careers, courses, sectors, skills, initiatives.

Deliberately unauthenticated -- the Careers Explorer has to work for a visitor
who has not signed up, which is one of the project's stated requirements.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import ml_loader
from app.core.database import get_db
from app.models import Career, Course

router = APIRouter(tags=["catalog"])


@router.get("/sectors")
def list_sectors(db: Session = Depends(get_db)) -> dict[str, Any]:
    counts = {sector: 0 for sector in (s["id"] for s in ml_loader.load_sectors())}
    for (sector,) in db.query(Career.sector).all():
        counts[sector] = counts.get(sector, 0) + 1
    return {"sectors": [{**sector, "career_count": counts.get(sector["id"], 0)}
                        for sector in ml_loader.load_sectors()]}


@router.get("/skills")
def list_skills() -> dict[str, Any]:
    return {"skills": ml_loader.load_skills()}


@router.get("/initiatives")
def list_initiatives() -> dict[str, Any]:
    return {"initiatives": ml_loader.load_initiatives()}


@router.get("/careers")
def list_careers(
    q: str | None = Query(None, description="free-text search, English or Arabic"),
    sector: str | None = None,
    demand: str | None = None,
    limit: int = Query(60, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    query = db.query(Career)
    if sector:
        query = query.filter(Career.sector == sector)
    if demand:
        query = query.filter(Career.demand == demand)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Career.title_en.ilike(pattern),
                                 Career.title_ar.ilike(pattern),
                                 Career.id.ilike(pattern)))
    total = query.count()
    rows = query.order_by(Career.title_en).offset(offset).limit(limit).all()
    return {"total": total, "count": len(rows),
            "careers": [row.to_dict() for row in rows]}


@router.get("/careers/{career_id}")
def read_career(career_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(Career, career_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown career: {career_id}")
    career = row.to_dict()
    sectors = {s["id"]: s for s in ml_loader.load_sectors()}
    skills = {s["id"]: s for s in ml_loader.load_skills()}
    initiatives = {i["id"]: i for i in ml_loader.load_initiatives()}
    career["sector_detail"] = sectors.get(career["sector"])
    career["skill_detail"] = [
        {**skills.get(skill_id, {"id": skill_id}), "weight": weight}
        for skill_id, weight in sorted(career.get("skills", {}).items(),
                                       key=lambda kv: -kv[1])
    ]
    career["initiative_detail"] = [initiatives[i] for i in career.get("initiatives", [])
                                   if i in initiatives]
    return career


@router.get("/courses")
def list_courses(
    q: str | None = None,
    skill: str | None = None,
    level: str | None = None,
    cost: str | None = None,
    language: str | None = None,
    limit: int = Query(120, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    query = db.query(Course)
    if level:
        query = query.filter(Course.level == level)
    if cost:
        query = query.filter(Course.cost == cost)
    if language:
        query = query.filter(Course.language == language)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Course.title_en.ilike(pattern),
                                 Course.title_ar.ilike(pattern),
                                 Course.provider.ilike(pattern)))
    rows = query.order_by(Course.title_en).all()
    # The skill filter lives inside the JSON payload, so it is applied in Python.
    # With 120 rows this is cheaper than a portable JSON query across SQLite and
    # PostgreSQL, and it keeps the two backends behaving identically.
    records = [row.to_dict() for row in rows]
    if skill:
        records = [record for record in records if skill in record.get("skills", {})]
    total = len(records)
    return {"total": total, "count": len(records[offset:offset + limit]),
            "courses": records[offset:offset + limit]}


@router.get("/courses/{course_id}")
def read_course(course_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(Course, course_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown course: {course_id}")
    return row.to_dict()

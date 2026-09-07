from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CareerUpsert(BaseModel):
    """Admin CRUD payload for a career.

    ``skills`` and ``profile`` are validated loosely on purpose: the admin panel
    is a maintenance tool for the project team, and over-tight validation here
    makes the catalog impossible to extend without a code change.  The
    recommender tolerates missing optional keys.
    """

    id: str = Field(min_length=2, max_length=64, pattern="^[a-z0-9_]+$")
    title_en: str = Field(min_length=2, max_length=200)
    title_ar: str = Field(min_length=2, max_length=200)
    sector: str = Field(min_length=2, max_length=40)
    demand: str = Field(pattern="^(very_high|high|moderate)$")
    description_en: str = ""
    description_ar: str = ""
    skills: dict[str, int] = Field(default_factory=dict)
    profile: dict[str, Any] = Field(default_factory=dict)
    salary_aed: dict[str, Any] = Field(default_factory=dict)
    degrees_en: list[str] = Field(default_factory=list)
    degrees_ar: list[str] = Field(default_factory=list)
    employers_en: list[str] = Field(default_factory=list)
    employers_ar: list[str] = Field(default_factory=list)
    initiatives: list[str] = Field(default_factory=list)


class CourseUpsert(BaseModel):
    id: str = Field(min_length=2, max_length=64, pattern="^[a-z0-9_]+$")
    title_en: str = Field(min_length=2, max_length=200)
    title_ar: str = Field(min_length=2, max_length=200)
    provider: str = Field(min_length=2, max_length=80)
    provider_type: str = Field(default="global", pattern="^(global|uae)$")
    level: str = Field(pattern="^(beginner|intermediate|advanced)$")
    cost: str = Field(pattern="^(free|paid)$")
    language: str = Field(pattern="^(en|ar|both)$")
    duration_weeks: int = Field(ge=1, le=104)
    skills: dict[str, int] = Field(default_factory=dict)
    description_en: str = ""
    description_ar: str = ""
    search_query: str = ""

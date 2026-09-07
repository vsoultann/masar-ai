from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

SUBJECTS = {"arabic", "english", "math", "physics", "chemistry",
            "biology", "islamic", "social", "computer_science"}
EMSAT_SUBJECTS = {"english", "math", "physics", "arabic"}
EMIRATES = {"abu_dhabi", "dubai", "sharjah", "ajman",
            "umm_al_quwain", "ras_al_khaimah", "fujairah"}
TRACKS = {"general", "advanced", "elite"}


class PersonalStep(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    emirate: str
    school: str = Field(min_length=2, max_length=160)
    grade_level: str = Field(pattern="^(10|11|12|graduate)$")
    track: str

    @field_validator("emirate")
    @classmethod
    def known_emirate(cls, value: str) -> str:
        if value not in EMIRATES:
            raise ValueError(f"Emirate must be one of: {', '.join(sorted(EMIRATES))}")
        return value

    @field_validator("track")
    @classmethod
    def known_track(cls, value: str) -> str:
        if value not in TRACKS:
            raise ValueError(f"Track must be one of: {', '.join(sorted(TRACKS))}")
        return value


class AcademicStep(BaseModel):
    grades: dict[str, float]
    emsat: dict[str, float] = Field(default_factory=dict)

    @field_validator("grades")
    @classmethod
    def valid_grades(cls, value: dict[str, float]) -> dict[str, float]:
        unknown = set(value) - SUBJECTS
        if unknown:
            raise ValueError(f"Unknown subject(s): {', '.join(sorted(unknown))}")
        for subject, grade in value.items():
            if not 0 <= grade <= 100:
                raise ValueError(f"Grade for {subject} must be between 0 and 100")
        return value

    @field_validator("emsat")
    @classmethod
    def valid_emsat(cls, value: dict[str, float]) -> dict[str, float]:
        unknown = set(value) - EMSAT_SUBJECTS
        if unknown:
            raise ValueError(f"Unknown EmSAT subject(s): {', '.join(sorted(unknown))}")
        for subject, score in value.items():
            if not 500 <= score <= 1500:
                raise ValueError(f"EmSAT {subject} score must be between 500 and 1500")
        return value


class QuestionnaireStep(BaseModel):
    """Raw Likert answers keyed by item id, e.g. ``{"riasec_01": 4}``."""

    answers: dict[str, int]

    @field_validator("answers")
    @classmethod
    def valid_answers(cls, value: dict[str, int]) -> dict[str, int]:
        if not value:
            raise ValueError("At least one answer is required")
        for item, score in value.items():
            if not 1 <= score <= 5:
                raise ValueError(f"Answer for {item} must be between 1 and 5")
        return value


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    emirate: str | None
    school: str | None
    grade_level: str | None
    track: str | None
    grades: dict[str, Any]
    emsat: dict[str, Any]
    riasec: dict[str, Any]
    bigfive: dict[str, Any]
    riasec_answers: dict[str, Any]
    bigfive_answers: dict[str, Any]
    completed_steps: int
    is_complete: bool

from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StudentProfile(Base):
    """One row per student: everything the onboarding wizard collects.

    The wizard saves after every step, so each block is nullable and
    ``completed_steps`` records how far the student got.  Raw questionnaire
    answers are kept alongside the scored dimensions so that a change to the
    scoring rules can be re-applied to existing students without asking them to
    retake anything.
    """

    __tablename__ = "student_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"),
                                         unique=True, index=True, nullable=False)

    # step 1 -- personal
    full_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    emirate: Mapped[str | None] = mapped_column(String(40))
    school: Mapped[str | None] = mapped_column(String(160))
    grade_level: Mapped[str | None] = mapped_column(String(20))
    track: Mapped[str | None] = mapped_column(String(20))

    # step 2 -- academic
    grades: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    emsat: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # steps 3 and 4 -- questionnaires (raw answers + scored dimensions)
    riasec_answers: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    bigfive_answers: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    riasec: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    bigfive: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    completed_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(),
        nullable=False)

    user = relationship("User", back_populates="profile")

    # -- helpers -----------------------------------------------------------
    def to_feature_profile(self) -> dict[str, Any]:
        """The exact dict shape ``ml.pipeline.profile_to_row`` expects."""
        return {
            "grades": self.grades or {},
            "emsat": self.emsat or {},
            "riasec": self.riasec or {},
            "bigfive": self.bigfive or {},
            "track": self.track or "general",
            "emirate": self.emirate or "abu_dhabi",
        }

    @property
    def is_complete(self) -> bool:
        """Ready for a recommendation: all four steps done."""
        return (self.completed_steps >= 4
                and bool(self.grades) and bool(self.riasec) and bool(self.bigfive))

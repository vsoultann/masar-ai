from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class _CatalogItem(Base):
    """Shared shape for the two editable catalogs.

    Frequently filtered fields are real columns so the API can query them; the
    rest of the record lives in ``payload``.  ``to_dict`` merges the two back
    into the flat shape the recommender and the frontend expect, which keeps
    data/careers.json and the database interchangeable.
    """

    __abstract__ = True

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title_en: Mapped[str] = mapped_column(String(200), nullable=False)
    title_ar: Mapped[str] = mapped_column(String(200), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(),
        nullable=False)

    def to_dict(self) -> dict[str, Any]:
        record = dict(self.payload or {})
        record.update({"id": self.id, "title_en": self.title_en,
                       "title_ar": self.title_ar})
        return record


class Career(_CatalogItem):
    __tablename__ = "careers"

    sector: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    demand: Mapped[str] = mapped_column(String(20), index=True, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        record = super().to_dict()
        record.update({"sector": self.sector, "demand": self.demand})
        return record


class Course(_CatalogItem):
    __tablename__ = "courses"

    provider: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    provider_type: Mapped[str] = mapped_column(String(10), nullable=False, default="global")
    level: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    cost: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    language: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    duration_weeks: Mapped[int] = mapped_column(Integer, nullable=False, default=4)

    def to_dict(self) -> dict[str, Any]:
        record = super().to_dict()
        record.update({
            "provider": self.provider, "provider_type": self.provider_type,
            "level": self.level, "cost": self.cost, "language": self.language,
            "duration_weeks": self.duration_weeks,
        })
        return record

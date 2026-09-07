from __future__ import annotations

import datetime as dt

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    preferred_language: Mapped[str] = mapped_column(String(2), nullable=False, default="en")
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("StudentProfile", back_populates="user", uselist=False,
                           cascade="all, delete-orphan")
    saved_careers = relationship("SavedCareer", back_populates="user",
                                 cascade="all, delete-orphan")
    runs = relationship("RecommendationRun", back_populates="user",
                        cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="user",
                            cascade="all, delete-orphan")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

"""Shared FastAPI dependencies: current user, current admin, current profile."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import StudentProfile, User

bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"})
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})
    user = db.query(User).filter(User.email == payload["sub"]).one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def current_admin(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            "This endpoint requires an administrator account")
    return user


def get_or_create_profile(db: Session, user: User) -> StudentProfile:
    profile = (db.query(StudentProfile)
               .filter(StudentProfile.user_id == user.id).one_or_none())
    if profile is None:
        profile = StudentProfile(user_id=user.id, full_name=user.full_name,
                                 grades={}, emsat={}, riasec={}, bigfive={},
                                 riasec_answers={}, bigfive_answers={})
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def current_profile(user: User = Depends(current_user),
                    db: Session = Depends(get_db)) -> StudentProfile:
    return get_or_create_profile(db, user)


def complete_profile(profile: StudentProfile = Depends(current_profile)) -> StudentProfile:
    """Guards the endpoints that cannot work on a half-finished profile."""
    if not profile.is_complete:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"code": "profile_incomplete",
             "message_en": "Complete all four onboarding steps to get recommendations.",
             "message_ar": "أكمل خطوات الملف الأربع للحصول على الترشيحات.",
             "completed_steps": profile.completed_steps})
    return profile

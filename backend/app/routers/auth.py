"""Registration, login and the current-user endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import StudentProfile, User
from app.routers.deps import current_user
from app.schemas.auth import TokenOut, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user.email, user.role),
        expires_in_minutes=settings.access_token_expire_minutes,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenOut:
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).one_or_none():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"code": "email_taken",
             "message_en": "An account with this email already exists.",
             "message_ar": "يوجد حساب مسجّل بهذا البريد الإلكتروني بالفعل."})

    user = User(email=email, hashed_password=hash_password(payload.password),
                full_name=payload.full_name.strip(), role="student",
                preferred_language=payload.preferred_language)
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create the (empty) profile immediately so the wizard has somewhere to save.
    db.add(StudentProfile(user_id=user.id, full_name=user.full_name, grades={},
                          emsat={}, riasec={}, bigfive={}, riasec_answers={},
                          bigfive_answers={}))
    db.commit()
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenOut:
    user = db.query(User).filter(User.email == payload.email.lower().strip()).one_or_none()
    # Same message and same work for both failure modes, so the endpoint cannot
    # be used to discover which email addresses are registered.
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            {"code": "invalid_credentials",
             "message_en": "Incorrect email or password.",
             "message_ar": "البريد الإلكتروني أو كلمة المرور غير صحيحة."})
    return _token_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    """Stateless logout.

    JWTs are self-contained, so the server has nothing to revoke; the client
    discards the token.  The endpoint exists so the frontend has one obvious
    place to call, and so a future deployment can add a deny-list here without
    changing the client.
    """
    return None


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut.model_validate(user)

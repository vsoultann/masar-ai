"""The AI Virtual Mentor endpoint."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import ml_loader
from app.core.config import settings
from app.core.database import get_db
from app.models import ChatMessage, Course, StudentProfile, User
from app.routers.deps import current_profile, current_user
from app.schemas.chat import ChatMessageOut, ChatReply, ChatRequest
from app.services import chatbot, recommendation

router = APIRouter(prefix="/chat", tags=["chat"])

_offline_cache: dict[str, Any] = {"version": None, "engine": None}


def _offline_engine(db: Session) -> chatbot.OfflineMentor:
    """Rebuilt only when the catalogs change."""
    version = ml_loader._catalog_version                   # noqa: SLF001
    if _offline_cache["engine"] is None or _offline_cache["version"] != version:
        _offline_cache["engine"] = chatbot.OfflineMentor(
            recommendation.catalog_careers(db),
            [row.to_dict() for row in db.query(Course).all()],
            ml_loader.load_skills(), ml_loader.load_sectors())
        _offline_cache["version"] = version
    return _offline_cache["engine"]


@router.get("/history", response_model=list[ChatMessageOut])
def history(db: Session = Depends(get_db),
            user: User = Depends(current_user)) -> list[ChatMessage]:
    return (db.query(ChatMessage).filter(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.created_at.asc()).limit(100).all())


@router.post("", response_model=ChatReply)
def send(payload: ChatRequest, db: Session = Depends(get_db),
         user: User = Depends(current_user),
         profile: StudentProfile = Depends(current_profile)) -> ChatReply:
    previous = (db.query(ChatMessage).filter(ChatMessage.user_id == user.id)
                .order_by(ChatMessage.created_at.desc()).limit(8).all())[::-1]
    conversation = [{"role": message.role, "content": message.content}
                    for message in previous]

    context = recommendation.chat_context(db, profile)
    text, mode = chatbot.reply(payload.message, payload.language, context,
                               conversation, _offline_engine(db))

    db.add(ChatMessage(user_id=user.id, role="user", content=payload.message,
                       language=payload.language, mode=mode))
    db.add(ChatMessage(user_id=user.id, role="assistant", content=text,
                       language=payload.language, mode=mode))
    db.commit()

    return ChatReply(reply=text, language=payload.language, mode=mode,
                     suggestions=chatbot.SUGGESTIONS[payload.language])


@router.delete("/history", status_code=204)
def clear_history(db: Session = Depends(get_db),
                  user: User = Depends(current_user)) -> None:
    db.query(ChatMessage).filter(ChatMessage.user_id == user.id).delete()
    db.commit()


@router.get("/suggestions")
def suggestions(language: str = "en") -> dict[str, Any]:
    language = "ar" if language == "ar" else "en"
    return {"suggestions": chatbot.SUGGESTIONS[language],
            "mentor_available": True}

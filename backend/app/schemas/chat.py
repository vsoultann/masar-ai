from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: str = Field(default="en", pattern="^(en|ar)$")


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    language: str
    mode: str
    created_at: dt.datetime


class ChatReply(BaseModel):
    reply: str
    language: str
    mode: str
    suggestions: list[str] = []

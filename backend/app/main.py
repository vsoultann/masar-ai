"""Masar AI -- FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import ml_loader
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.routers import admin, auth, catalog, chat, profile, recommend, report

logger = logging.getLogger("masar")
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")

DESCRIPTION = """
**Masar AI** (مسار) is an AI career-guidance system for students in the United
Arab Emirates. It analyses school grades, EmSAT scores, Holland RIASEC interests
and Big Five personality traits, and returns ranked career recommendations with
an explanation, a skill-gap analysis and a phased learning roadmap.

Everything is bilingual (English / Modern Standard Arabic). The virtual mentor
runs against the Anthropic API when `ANTHROPIC_API_KEY` is set and against a
local retrieval engine otherwise, so the system never depends on an external
service to function.

Graduation project, 2026.
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    if settings.auto_seed:
        from seed import seed_all                       # noqa: PLC0415
        with SessionLocal() as db:
            counts = seed_all(db, quiet=True)
        if any(counts.values()):
            logger.info("seeded %s", counts)
    try:
        info = ml_loader.model_info()
        logger.info("model: %s trained %s", info.get("name"), info.get("trained_at"))
    except Exception as error:                          # noqa: BLE001
        logger.warning("model unavailable: %s -- run  python ml/train.py", error)
    logger.info("mentor mode: %s", settings.mentor_mode)
    yield


app = FastAPI(
    title="Masar AI API",
    description=DESCRIPTION,
    version="1.0.0",
    contact={"name": "Masar AI Team"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, error: RequestValidationError) -> JSONResponse:
    """Bilingual validation errors.

    FastAPI's default body is English-only and shaped for developers.  The
    frontend needs something it can show a student in either language, so each
    field error is returned with both a field path and a translated message.
    """
    details = []
    for item in error.errors():
        field = ".".join(str(part) for part in item["loc"] if part != "body")
        message = item.get("msg", "Invalid value")
        details.append({
            "field": field,
            "message_en": message,
            "message_ar": f"قيمة غير صالحة في الحقل «{field}»: {message}",
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"code": "validation_error",
                 "message_en": "Please check the highlighted fields.",
                 "message_ar": "يرجى مراجعة الحقول المحدّدة.",
                 "details": details},
    )


api = settings.api_v1_prefix
app.include_router(auth.router, prefix=api)
app.include_router(profile.router, prefix=api)
app.include_router(recommend.router, prefix=api)
app.include_router(catalog.router, prefix=api)
app.include_router(chat.router, prefix=api)
app.include_router(report.router, prefix=api)
app.include_router(admin.router, prefix=api)


@app.get("/health", tags=["meta"])
def health() -> dict[str, Any]:
    """Liveness probe.  Render and docker-compose both use this."""
    info = ml_loader.model_info()
    return {"status": "ok", "model_available": info.get("available", False),
            "mentor_mode": settings.mentor_mode}


@app.get(f"{api}/meta", tags=["meta"])
def meta() -> dict[str, Any]:
    """Everything the frontend needs to render before a user logs in."""
    return {
        "app": settings.app_name,
        "version": app.version,
        "environment": settings.environment,
        "mentor_mode": settings.mentor_mode,
        "model": ml_loader.model_info(),
        "team": ["Mubarak Awad Alamro", "Saif Qais", "Zayed Saif",
                 "Khaled Mohammed", "Mansor Buti"],
        "academic_year": "2026",
    }


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"name": "Masar AI API", "docs": "/docs", "health": "/health"}

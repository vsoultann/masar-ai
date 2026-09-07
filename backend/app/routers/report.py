"""PDF career report download."""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import StudentProfile
from app.routers.deps import complete_profile
from app.services import pdf_report, recommendation

router = APIRouter(prefix="/report", tags=["report"])


@router.get("/pdf")
def download_report(
    lang: str = Query("en", pattern="^(en|ar)$"),
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(complete_profile),
) -> Response:
    payload = recommendation.report_payload(db, profile, lang)
    pdf = pdf_report.build_report(payload, lang)
    stamp = dt.date.today().isoformat()
    filename = f"masar-ai-career-report-{lang}-{stamp}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"',
                 "Content-Length": str(len(pdf))},
    )

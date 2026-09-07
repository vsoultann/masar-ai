"""The virtual mentor (offline mode) and the PDF report."""
from __future__ import annotations


def test_mentor_answers_in_english(client, student_auth):
    body = client.post("/api/chat", headers=student_auth, json={
        "message": "why was this career recommended to me?", "language": "en"}).json()
    assert body["mode"] == "offline"
    assert body["reply"].strip()
    assert body["suggestions"]


def test_mentor_answers_in_arabic(client, student_auth):
    body = client.post("/api/chat", headers=student_auth, json={
        "message": "ما المهارات التي يحتاجها محلل الأمن السيبراني؟",
        "language": "ar"}).json()
    reply = body["reply"]
    assert body["language"] == "ar"
    # The reply must actually be Arabic, not an English string echoed back.
    assert any("؀" <= ch <= "ۿ" for ch in reply)
    assert "الأمن السيبراني" in reply


def test_mentor_works_without_an_api_key(client, student_auth):
    """The offline engine is the default and must never fail."""
    from app.core.config import settings
    assert settings.mentor_mode == "offline"
    for message in ["hello", "what is a data scientist?", "salary of a pilot",
                    "which universities?", "which sectors are hiring?",
                    "asdkjhaskjdh"]:
        body = client.post("/api/chat", headers=student_auth,
                           json={"message": message, "language": "en"}).json()
        assert body["reply"].strip(), message


def test_mentor_handles_the_arabic_definite_article(client, student_auth):
    """"الطاقة المتجددة" must find the career stored as "طاقة متجددة"."""
    body = client.post("/api/chat", headers=student_auth, json={
        "message": "كم راتب مهندس الطاقة المتجددة؟", "language": "ar"}).json()
    assert "طاقة متجددة" in body["reply"]


def test_mentor_treats_free_as_a_filter_not_a_search_term(client, student_auth):
    body = client.post("/api/chat", headers=student_auth, json={
        "message": "what free courses should I start now?", "language": "en"}).json()
    assert "free" in body["reply"].lower()
    # Every suggested course must actually be free.
    assert "paid." not in body["reply"]


def test_chat_history_is_stored_and_clearable(client, fresh_user):
    headers, _ = fresh_user
    client.post("/api/chat", headers=headers,
                json={"message": "hello", "language": "en"})
    history = client.get("/api/chat/history", headers=headers).json()
    assert [message["role"] for message in history] == ["user", "assistant"]
    assert client.delete("/api/chat/history", headers=headers).status_code == 204
    assert client.get("/api/chat/history", headers=headers).json() == []


def test_chat_requires_authentication(client):
    assert client.post("/api/chat",
                       json={"message": "hi", "language": "en"}).status_code == 401


def test_pdf_report_downloads_in_both_languages(client, student_auth):
    for lang in ("en", "ar"):
        response = client.get(f"/api/report/pdf?lang={lang}", headers=student_auth)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF-")
        assert len(response.content) > 5000
        assert lang in response.headers["content-disposition"]


def test_arabic_report_embeds_the_arabic_font(client, student_auth):
    """Without the embedded face the Arabic would silently render as blanks."""
    content = client.get("/api/report/pdf?lang=ar", headers=student_auth).content
    assert b"NotoNaskhArabic" in content


def test_arabic_shaping_and_bidi_are_applied():
    from app.services.pdf_report import shape
    shaped = shape("مسار")
    assert shaped != "مسار"
    # Reshaping maps to presentation forms (U+FE70-U+FEFF).
    assert any("ﹰ" <= ch <= "﻿" for ch in shaped)


def test_latin_runs_are_tagged_for_a_latin_font():
    """The Arabic face has no Latin glyphs, so Latin must be tagged."""
    from app.services.pdf_report import tag_runs
    markup = tag_runs("Demo Student 2026")
    # Latin letters are tagged; spaces and digits are in the Arabic face, so
    # they stay untagged and the words are split across separate runs.
    assert markup.count('<font name="Helvetica">') >= 2
    assert "Demo" in markup and "Student" in markup and "2026" in markup
    assert tag_runs("مسار") == "مسار"


def test_arabic_week_agreement():
    from app.services.i18n import weeks
    assert weeks(1, "ar") == "أسبوع واحد"
    assert weeks(2, "ar") == "أسبوعان"
    assert weeks(8, "ar") == "8 أسابيع"
    assert weeks(16, "ar") == "16 أسبوعاً"
    assert weeks(1, "en") == "1 week"
    assert weeks(8, "en") == "8 weeks"


def test_report_requires_a_complete_profile(client, fresh_user):
    headers, _ = fresh_user
    assert client.get("/api/report/pdf", headers=headers).status_code == 409

"""Public catalog endpoints and their filters."""
from __future__ import annotations


def test_catalog_is_public(client):
    assert client.get("/api/careers").status_code == 200
    assert client.get("/api/courses").status_code == 200
    assert client.get("/api/sectors").status_code == 200


def test_catalog_sizes_match_the_specification(client):
    assert client.get("/api/careers").json()["total"] == 60
    assert client.get("/api/courses").json()["total"] == 120
    assert len(client.get("/api/sectors").json()["sectors"]) == 15
    assert len(client.get("/api/skills").json()["skills"]) == 40


def test_every_career_is_fully_bilingual(client):
    for career in client.get("/api/careers").json()["careers"]:
        assert career["title_en"].strip() and career["title_ar"].strip()
        assert career["description_en"].strip() and career["description_ar"].strip()
        assert career["degrees_en"] and career["degrees_ar"]
        assert career["employers_en"] and career["employers_ar"]


def test_every_course_is_fully_bilingual(client):
    for course in client.get("/api/courses").json()["courses"]:
        assert course["title_en"].strip() and course["title_ar"].strip()
        assert course["description_en"].strip() and course["description_ar"].strip()


def test_career_salary_ranges_are_coherent(client):
    for career in client.get("/api/careers").json()["careers"]:
        salary = career["salary_aed"]
        assert 0 < salary["min"] < salary["max"]
        assert salary["note_en"] and salary["note_ar"]


def test_every_career_skill_exists_in_the_taxonomy(client):
    known = {skill["id"] for skill in client.get("/api/skills").json()["skills"]}
    for career in client.get("/api/careers").json()["careers"]:
        assert set(career["skills"]) <= known, career["id"]


def test_search_matches_english_and_arabic(client):
    english = client.get("/api/careers", params={"q": "engineer"}).json()
    arabic = client.get("/api/careers", params={"q": "مهندس"}).json()
    assert english["total"] > 0
    assert arabic["total"] > 0


def test_sector_filter(client):
    body = client.get("/api/careers", params={"sector": "ai_data"}).json()
    assert body["total"] == 4
    assert all(career["sector"] == "ai_data" for career in body["careers"])


def test_course_filters_combine(client):
    body = client.get("/api/courses", params={"cost": "free", "language": "ar"}).json()
    assert body["total"] > 0
    assert all(course["cost"] == "free" and course["language"] == "ar"
               for course in body["courses"])


def test_course_skill_filter(client):
    body = client.get("/api/courses", params={"skill": "cybersecurity"}).json()
    assert body["total"] >= 2
    assert all("cybersecurity" in course["skills"] for course in body["courses"])


def test_career_detail_includes_resolved_skills_and_initiatives(client):
    career = client.get("/api/careers/machine_learning_engineer").json()
    assert career["sector_detail"]["name_ar"]
    assert career["skill_detail"][0]["name_en"]
    # Skills come back ordered by importance.
    weights = [skill["weight"] for skill in career["skill_detail"]]
    assert weights == sorted(weights, reverse=True)
    assert career["initiative_detail"]


def test_unknown_career_returns_404(client):
    assert client.get("/api/careers/does_not_exist").status_code == 404


def test_pagination(client):
    page = client.get("/api/careers", params={"limit": 5, "offset": 10}).json()
    assert page["count"] == 5
    assert page["total"] == 60

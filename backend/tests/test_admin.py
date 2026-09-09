"""Admin panel: access control, statistics, catalog CRUD and model metrics."""
from __future__ import annotations

import uuid

CAREER = {
    "id": "test_career_alpha",
    "title_en": "Test Career", "title_ar": "مهنة اختبارية",
    "sector": "ai_data", "demand": "high",
    "description_en": "A career created by the test suite.",
    "description_ar": "مهنة أنشأتها مجموعة الاختبارات.",
    "skills": {"programming": 80, "mathematics": 60, "teamwork": 50},
    "profile": {"riasec": {k: 50 for k in "RIASEC"},
                "bigfive": {k: 50 for k in "OCEAN"},
                "subjects": {"arabic": 55, "english": 55, "math": 80, "physics": 55,
                             "chemistry": 55, "biology": 55, "islamic": 55,
                             "social": 55, "computer_science": 85}},
    "salary_aed": {"min": 10000, "max": 20000},
    "degrees_en": ["Computer Science"], "degrees_ar": ["علوم الحاسوب"],
    "employers_en": ["test employers"], "employers_ar": ["جهات اختبارية"],
    "initiatives": ["ai_strategy_2031"],
}

COURSE = {
    "id": "test_course_alpha",
    "title_en": "Test Course", "title_ar": "دورة اختبارية",
    "provider": "Coursera", "provider_type": "global", "level": "beginner",
    "cost": "free", "language": "both", "duration_weeks": 4,
    "skills": {"programming": 40},
    "description_en": "A course created by the test suite.",
    "description_ar": "دورة أنشأتها مجموعة الاختبارات.",
    "search_query": "Test Course Coursera",
}


def test_admin_endpoints_reject_anonymous_callers(client):
    assert client.get("/api/admin/stats").status_code == 401


def test_admin_endpoints_reject_students(client, student_auth):
    assert client.get("/api/admin/stats", headers=student_auth).status_code == 403
    assert client.post("/api/admin/careers", headers=student_auth,
                       json=CAREER).status_code == 403


def test_stats_report_users_activity_and_catalog(client, admin_auth, student_auth):
    client.get("/api/recommendations", headers=student_auth)   # generate activity
    body = client.get("/api/admin/stats", headers=admin_auth).json()
    assert body["users"]["total"] >= 2
    assert body["catalog"]["careers"] >= 60
    assert body["catalog"]["courses"] >= 120
    assert body["activity"]["recommendation_runs"] >= 1
    assert body["most_recommended"]
    assert body["sector_distribution"][0]["name_ar"]
    assert body["mentor_mode"] in {"offline", "anthropic"}


def test_student_list_is_anonymised(client, admin_auth):
    body = client.get("/api/admin/students", headers=admin_auth).json()
    assert body["total"] >= 1
    serialised = str(body)
    assert "@masar.ae" not in serialised
    assert "Demo Student" not in serialised
    assert body["students"][0]["reference"].startswith("STU-")


def test_career_crud_round_trip(client, admin_auth):
    payload = dict(CAREER, id=f"test_{uuid.uuid4().hex[:8]}")

    created = client.post("/api/admin/careers", headers=admin_auth, json=payload)
    assert created.status_code == 201
    assert created.json()["title_ar"] == "مهنة اختبارية"

    # A duplicate id is refused.
    assert client.post("/api/admin/careers", headers=admin_auth,
                       json=payload).status_code == 409

    # It appears immediately in the public catalog.
    assert client.get(f"/api/careers/{payload['id']}").status_code == 200

    updated = client.put(f"/api/admin/careers/{payload['id']}", headers=admin_auth,
                         json=dict(payload, title_en="Renamed Career"))
    assert updated.json()["title_en"] == "Renamed Career"

    assert client.delete(f"/api/admin/careers/{payload['id']}",
                         headers=admin_auth).status_code == 204
    assert client.get(f"/api/careers/{payload['id']}").status_code == 404


def test_course_crud_round_trip(client, admin_auth):
    payload = dict(COURSE, id=f"test_{uuid.uuid4().hex[:8]}")
    assert client.post("/api/admin/courses", headers=admin_auth,
                       json=payload).status_code == 201
    assert client.get(f"/api/courses/{payload['id']}").status_code == 200
    updated = client.put(f"/api/admin/courses/{payload['id']}", headers=admin_auth,
                         json=dict(payload, duration_weeks=9))
    assert updated.json()["duration_weeks"] == 9
    assert client.delete(f"/api/admin/courses/{payload['id']}",
                         headers=admin_auth).status_code == 204


def test_a_new_career_becomes_recommendable_without_a_restart(client, admin_auth,
                                                              student_auth):
    """The cached recommender must be invalidated by a catalog edit."""
    payload = dict(CAREER, id=f"test_{uuid.uuid4().hex[:8]}")
    client.post("/api/admin/careers", headers=admin_auth, json=payload)
    body = client.get("/api/recommendations", headers=student_auth,
                      params={"top_n": 60}).json()
    ids = [item["career_id"] for item in body["recommendations"]]
    assert payload["id"] in ids
    client.delete(f"/api/admin/careers/{payload['id']}", headers=admin_auth)


def test_updating_a_career_id_is_refused(client, admin_auth):
    response = client.put("/api/admin/careers/data_scientist", headers=admin_auth,
                          json=dict(CAREER, id="something_else"))
    assert response.status_code == 400


def test_crud_rejects_an_invalid_id_format(client, admin_auth):
    response = client.post("/api/admin/careers", headers=admin_auth,
                           json=dict(CAREER, id="Not Valid ID!"))
    assert response.status_code == 422


def test_model_endpoint_exposes_metrics(client, admin_auth):
    body = client.get("/api/admin/model", headers=admin_auth).json()
    assert body["model"]["available"] is True
    assert body["model"]["name"] == "logistic_regression"
    assert body["metrics"]["available"] is True
    selected = body["metrics"]["selected_model"]
    assert 0 < selected["test"]["accuracy"] <= 1
    # Four candidates since v2 added gradient boosting to the comparison.
    assert set(body["metrics"]["model_comparison"]) == {
        "random_forest", "logistic_regression", "knn", "gradient_boosting"}

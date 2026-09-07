"""Recommendation engine, skill gap and learning pathway endpoints."""
from __future__ import annotations

import pytest


def test_recommendations_return_ten_ranked_careers(client, student_auth):
    body = client.get("/api/recommendations", headers=student_auth).json()
    items = body["recommendations"]
    assert len(items) == 10
    assert [item["rank"] for item in items] == list(range(1, 11))
    assert items == sorted(items, key=lambda item: -item["match"])


def test_every_recommendation_carries_an_explanation(client, student_auth):
    for item in client.get("/api/recommendations", headers=student_auth).json()["recommendations"]:
        assert item["reasons"], item["career_id"]
        for reason in item["reasons"]:
            assert reason["label_en"] and reason["label_ar"]
        assert item["confidence"] in {"high", "moderate", "low"}


def test_explanations_only_cite_shared_strengths(client, student_auth):
    """A reason must be something the student has *and* the career wants."""
    for item in client.get("/api/recommendations", headers=student_auth).json()["recommendations"]:
        for reason in item["reasons"]:
            assert reason["contribution"] > 0


def test_match_scores_are_percentages(client, student_auth):
    for item in client.get("/api/recommendations", headers=student_auth).json()["recommendations"]:
        assert 0 <= item["match"] <= 100


def test_sector_probabilities_sum_to_one(client, student_auth):
    body = client.get("/api/recommendations", headers=student_auth).json()
    total = sum(entry["probability"] for entry in body["sector_probabilities"])
    # Probabilities are rounded to four decimals for the wire, so the sum can
    # drift by up to 15 * 5e-5.
    assert total == pytest.approx(1.0, abs=1e-3)
    assert len(body["sector_probabilities"]) == 15


def test_recommendations_are_deterministic(client, student_auth):
    first = client.get("/api/recommendations", headers=student_auth).json()
    second = client.get("/api/recommendations", headers=student_auth).json()
    assert ([item["career_id"] for item in first["recommendations"]]
            == [item["career_id"] for item in second["recommendations"]])


def test_incomplete_profile_is_refused_with_a_clear_error(client, fresh_user):
    headers, _ = fresh_user
    response = client.get("/api/recommendations", headers=headers)
    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "profile_incomplete"
    assert detail["message_en"] and detail["message_ar"]


def test_skill_gap_reports_current_required_and_gap(client, student_auth):
    top = client.get("/api/recommendations", headers=student_auth).json()["recommendations"][0]
    gap = client.get(f"/api/skill-gap/{top['career_id']}", headers=student_auth).json()
    assert gap["skills"]
    for entry in gap["skills"]:
        assert 0 <= entry["current"] <= 100
        assert 0 < entry["required"] <= 100
        assert entry["gap"] == pytest.approx(max(0.0, entry["required"] - entry["current"]),
                                             abs=0.05)
    assert 0 <= gap["readiness"] <= 100


def test_skill_gap_is_sorted_by_priority(client, student_auth):
    gap = client.get("/api/skill-gap/machine_learning_engineer", headers=student_auth).json()
    priorities = [entry["priority"] for entry in gap["skills"]]
    assert priorities == sorted(priorities, reverse=True)


def test_skill_gap_rejects_an_unknown_career(client, student_auth):
    assert client.get("/api/skill-gap/astronaut_wrangler",
                      headers=student_auth).status_code == 404


def test_learning_path_has_four_phases_and_real_courses(client, student_auth):
    path = client.get("/api/learning-path/machine_learning_engineer",
                      headers=student_auth).json()
    assert [phase["id"] for phase in path["phases"]] == \
        ["now", "6_months", "12_months", "24_months"]
    assert path["total_courses"] > 0
    for phase in path["phases"]:
        for course in phase["courses"]:
            assert course["title_en"] and course["title_ar"]
            assert course["kind"] in {"close_gap", "strengthen"}


def test_learning_path_never_repeats_a_course(client, student_auth):
    path = client.get("/api/learning-path/machine_learning_engineer",
                      headers=student_auth).json()
    ids = [course["id"] for phase in path["phases"] for course in phase["courses"]]
    assert len(ids) == len(set(ids))


def test_learning_path_is_populated_even_for_a_student_with_no_gaps(client, student_auth):
    """A strong student must not receive an empty roadmap."""
    gap = client.get("/api/skill-gap/qa_automation_engineer", headers=student_auth).json()
    path = client.get("/api/learning-path/qa_automation_engineer",
                      headers=student_auth).json()
    if not [entry for entry in gap["skills"] if entry["gap"] > 0]:
        assert path["total_courses"] > 0
        assert all(course["kind"] == "strengthen"
                   for phase in path["phases"] for course in phase["courses"])


def test_estimated_skills_cover_the_whole_taxonomy(client, student_auth):
    skills = client.get("/api/skills/me", headers=student_auth).json()["skills"]
    assert len(skills) == 40
    assert all(0 <= skill["value"] <= 100 for skill in skills)


def test_saving_and_unsaving_a_career(client, student_auth):
    assert client.post("/api/saved/data_scientist",
                       headers=student_auth).status_code == 201
    saved = client.get("/api/saved", headers=student_auth).json()["saved"]
    assert "data_scientist" in [row["career_id"] for row in saved]
    # Saving twice must not create a duplicate.
    client.post("/api/saved/data_scientist", headers=student_auth)
    saved = client.get("/api/saved", headers=student_auth).json()["saved"]
    assert len([r for r in saved if r["career_id"] == "data_scientist"]) == 1

    assert client.delete("/api/saved/data_scientist",
                         headers=student_auth).status_code == 204
    saved = client.get("/api/saved", headers=student_auth).json()["saved"]
    assert "data_scientist" not in [row["career_id"] for row in saved]


def test_saving_an_unknown_career_is_rejected(client, student_auth):
    assert client.post("/api/saved/nope", headers=student_auth).status_code == 404

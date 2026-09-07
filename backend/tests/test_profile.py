"""The four-step onboarding wizard, including resume and validation."""
from __future__ import annotations

GRADES = {"arabic": 80, "english": 85, "math": 90, "physics": 88, "chemistry": 75,
          "biology": 70, "islamic": 82, "social": 78, "computer_science": 92}


def _riasec_answers(client) -> dict[str, int]:
    items = client.get("/api/profile/questionnaires/riasec").json()["items"]
    return {item["id"]: 4 for item in items}


def _bigfive_answers(client) -> dict[str, int]:
    items = client.get("/api/profile/questionnaires/bigfive").json()["items"]
    return {item["id"]: 3 for item in items}


def test_questionnaires_have_the_specified_length(client):
    riasec = client.get("/api/profile/questionnaires/riasec").json()
    bigfive = client.get("/api/profile/questionnaires/bigfive").json()
    assert len(riasec["items"]) == 30
    assert len(bigfive["items"]) == 25
    assert {d["code"] for d in riasec["dimensions"]} == set("RIASEC")
    assert {d["code"] for d in bigfive["dimensions"]} == set("OCEAN")


def test_every_questionnaire_item_is_bilingual(client):
    for name in ("riasec", "bigfive"):
        for item in client.get(f"/api/profile/questionnaires/{name}").json()["items"]:
            assert item["text_en"].strip()
            assert item["text_ar"].strip()


def test_unknown_questionnaire_returns_404(client):
    assert client.get("/api/profile/questionnaires/mbti").status_code == 404


def test_wizard_saves_each_step_and_completes(client, fresh_user):
    headers, _ = fresh_user
    assert client.get("/api/profile", headers=headers).json()["completed_steps"] == 0

    step1 = client.put("/api/profile/step1", headers=headers, json={
        "full_name": "Wizard Tester", "emirate": "sharjah",
        "school": "Test Secondary School", "grade_level": "12", "track": "advanced"})
    assert step1.status_code == 200
    assert step1.json()["completed_steps"] == 1

    step2 = client.put("/api/profile/step2", headers=headers,
                       json={"grades": GRADES, "emsat": {"math": 1200}})
    assert step2.json()["completed_steps"] == 2
    assert step2.json()["grades"]["math"] == 90

    step3 = client.put("/api/profile/step3", headers=headers,
                       json={"answers": _riasec_answers(client)})
    assert step3.json()["completed_steps"] == 3
    assert set(step3.json()["riasec"]) == set("RIASEC")

    step4 = client.put("/api/profile/step4", headers=headers,
                       json={"answers": _bigfive_answers(client)})
    body = step4.json()
    assert body["completed_steps"] == 4
    assert body["is_complete"] is True


def test_partial_questionnaire_saves_but_does_not_complete_the_step(client, fresh_user):
    """A student must be able to stop halfway and come back."""
    headers, _ = fresh_user
    answers = _riasec_answers(client)
    half = dict(list(answers.items())[:10])
    response = client.put("/api/profile/step3", headers=headers, json={"answers": half})
    assert response.status_code == 200
    assert response.json()["completed_steps"] == 0
    assert len(response.json()["riasec_answers"]) == 10


def test_step2_rejects_an_out_of_range_grade(client, fresh_user):
    headers, _ = fresh_user
    response = client.put("/api/profile/step2", headers=headers,
                          json={"grades": {"math": 140}})
    assert response.status_code == 422
    assert "math" in response.json()["details"][0]["message_en"]


def test_step2_rejects_an_unknown_subject(client, fresh_user):
    headers, _ = fresh_user
    response = client.put("/api/profile/step2", headers=headers,
                          json={"grades": {"astronomy": 80}})
    assert response.status_code == 422


def test_step2_rejects_an_out_of_range_emsat_score(client, fresh_user):
    headers, _ = fresh_user
    response = client.put("/api/profile/step2", headers=headers,
                          json={"grades": GRADES, "emsat": {"math": 200}})
    assert response.status_code == 422


def test_step1_rejects_an_unknown_emirate(client, fresh_user):
    headers, _ = fresh_user
    response = client.put("/api/profile/step1", headers=headers, json={
        "full_name": "Tester", "emirate": "doha", "school": "School",
        "grade_level": "12", "track": "general"})
    assert response.status_code == 422


def test_validation_errors_are_bilingual(client, fresh_user):
    headers, _ = fresh_user
    response = client.put("/api/profile/step2", headers=headers,
                          json={"grades": {"math": 500}})
    body = response.json()
    assert body["message_en"] and body["message_ar"]
    assert body["details"][0]["message_ar"]


def test_reverse_scored_items_are_flipped(client):
    """A student who agrees with everything must not max out every trait."""
    from app.ml_loader import load_questionnaire
    from recommender import score_questionnaire
    items = load_questionnaire("bigfive")["items"]
    all_agree = {item["id"]: 5 for item in items}
    scores = score_questionnaire(all_agree, items)
    # Every Big Five trait has at least one reverse-keyed item, so no trait can
    # reach 100 by agreeing with everything.
    assert all(value < 100 for value in scores.values()), scores


def test_profile_requires_authentication(client):
    assert client.get("/api/profile").status_code == 401

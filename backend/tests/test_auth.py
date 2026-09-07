"""Authentication: registration, login, tokens and role enforcement."""
from __future__ import annotations

import uuid


def test_register_returns_token_and_user(client):
    email = f"new-{uuid.uuid4().hex[:8]}@masar.ae"
    response = client.post("/api/auth/register", json={
        "email": email, "password": "Strong@123", "full_name": "New Student"})
    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["user"]["email"] == email
    assert body["user"]["role"] == "student"


def test_register_rejects_duplicate_email(client):
    response = client.post("/api/auth/register", json={
        "email": "student@masar.ae", "password": "Strong@123", "full_name": "Copy"})
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "email_taken"


def test_register_rejects_weak_password(client):
    response = client.post("/api/auth/register", json={
        "email": f"weak-{uuid.uuid4().hex[:8]}@masar.ae",
        "password": "onlyletters", "full_name": "Weak"})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_register_rejects_invalid_email(client):
    response = client.post("/api/auth/register", json={
        "email": "not-an-email", "password": "Strong@123", "full_name": "Bad"})
    assert response.status_code == 422


def test_login_succeeds_for_demo_student(client):
    response = client.post("/api/auth/login",
                           json={"email": "student@masar.ae", "password": "Demo@1234"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "student"


def test_login_rejects_wrong_password(client):
    response = client.post("/api/auth/login",
                           json={"email": "student@masar.ae", "password": "wrong-one"})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


def test_login_does_not_reveal_whether_an_account_exists(client):
    """Unknown email and wrong password must be indistinguishable."""
    unknown = client.post("/api/auth/login",
                          json={"email": "nobody@masar.ae", "password": "Demo@1234"})
    wrong = client.post("/api/auth/login",
                        json={"email": "student@masar.ae", "password": "Nope@1234"})
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()


def test_me_requires_a_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_a_garbage_token(client):
    response = client.get("/api/auth/me",
                          headers={"Authorization": "Bearer not.a.real.token"})
    assert response.status_code == 401


def test_me_returns_the_authenticated_user(client, student_auth):
    response = client.get("/api/auth/me", headers=student_auth)
    assert response.status_code == 200
    assert response.json()["email"] == "student@masar.ae"


def test_password_hash_is_not_reversible():
    from app.core.security import hash_password, verify_password
    hashed = hash_password("Demo@1234")
    assert hashed != "Demo@1234"
    assert hashed.startswith("$2")
    assert verify_password("Demo@1234", hashed)
    assert not verify_password("Demo@12345", hashed)


def test_password_longer_than_bcrypt_limit_is_handled():
    """bcrypt truncates at 72 bytes; it must not raise."""
    from app.core.security import hash_password, verify_password
    long_password = "A1" + "x" * 200
    hashed = hash_password(long_password)
    assert verify_password(long_password, hashed)

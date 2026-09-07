"""Test fixtures.

Every test runs against a throwaway SQLite file seeded with the real catalogs,
so the tests exercise the same 60 careers and 120 courses the application
ships with rather than a hand-made fixture that could drift from them.
"""
from __future__ import annotations

import os
import pathlib
import sys
import tempfile

import pytest

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# The database URL has to be set before app.core.config is imported, because
# the engine is created at import time.
_TMP = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{pathlib.Path(_TMP.name) / 'test.db'}"
os.environ["SECRET_KEY"] = "test-secret-key-not-used-anywhere-else"
os.environ["AUTO_SEED"] = "1"
os.environ.pop("ANTHROPIC_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _database() -> None:
    Base.metadata.create_all(engine)
    from seed import seed_all
    with SessionLocal() as db:
        seed_all(db, quiet=True)
    yield
    _TMP.cleanup()


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def student_auth(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login",
                           json={"email": "student@masar.ae", "password": "Demo@1234"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin_auth(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login",
                           json={"email": "admin@masar.ae", "password": "Admin@1234"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def fresh_user(client: TestClient):
    """Register a brand-new student and return (headers, email)."""
    import uuid
    email = f"test-{uuid.uuid4().hex[:10]}@masar.ae"
    response = client.post("/api/auth/register", json={
        "email": email, "password": "Test@1234", "full_name": "Test Student"})
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}, email

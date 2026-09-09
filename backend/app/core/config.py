"""Application settings, loaded from the environment with working defaults."""
from __future__ import annotations

import pathlib

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
# The catalogs moved into the app's public directory in v2, where the static
# export serves them straight to the browser. The backend is no longer the
# runtime (see docs/DECISIONS.md D-05) but it must not read a stale second copy,
# so it points at the same files.
DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"
ML_DIR = ROOT_DIR / "ml"
ARTIFACTS_DIR = ML_DIR / "artifacts"


class Settings(BaseSettings):
    """Every field has a default, so the app runs with no .env at all."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Masar AI"
    api_v1_prefix: str = "/api"
    environment: str = "development"

    database_url: str = f"sqlite:///{BACKEND_DIR / 'masar.db'}"
    secret_key: str = "dev-only-insecure-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5"

    auto_seed: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def uses_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def mentor_mode(self) -> str:
        """``anthropic`` when an API key is configured, otherwise ``offline``."""
        return "anthropic" if self.anthropic_api_key.strip() else "offline"


settings = Settings()

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    github_token: str | None = None
    github_api_url: str = "https://api.github.com"
    github_timeout: float = 10.0
    max_readme_chars: int = 20_000
    cors_origins: list[str] = ["http://localhost:3000"]

    gemma_api_key: str | None = None
    gemma_model: str = "gemma-4-26b-a4b-it"
    gemma_timeout: float = 90.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
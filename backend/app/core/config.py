import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Football Predictions API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://football_user:football_pass@localhost:5432/football_predictions"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # External APIs
    API_FOOTBALL_KEY: Optional[str] = None
    FOOTBALL_DATA_KEY: Optional[str] = None
    API_FOOTBALL_BASE_URL: str = "https://v3.football.api-sports.io"
    FOOTBALL_DATA_BASE_URL: str = "https://api.football-data.org/v4"

    # AI Provider (for natural language match analysis)
    AI_PROVIDER: str = "openai"  # openai, openrouter, gemini, ollama
    AI_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o-mini"
    AI_BASE_URL: Optional[str] = None  # Custom API endpoint (e.g. OpenRouter, local Ollama)
    AI_MAX_TOKENS: int = 500
    AI_TEMPERATURE: float = 0.7

    # ML
    MODEL_PATH: str = "/app/models"
    MODEL_VERSION: str = "1.0.0"

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
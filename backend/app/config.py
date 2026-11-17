import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./goalinsight.db"
    
    # Provider 1: Football-Data.org v4
    football_data_token: str = "b7e6bea2bbea49b59808336137209ef8"
    football_data_base_url: str = "https://api.football-data.org/v4"
    
    # Provider 2: Sportmonks v3
    sportmonks_api_token: str = "ahErAJVsYUkqeKctYZfTBYr6jW5L8eNSn2zUyEr9wOfpdywIk9KBunCPLyLY"
    sportmonks_base_url: str = "https://api.sportmonks.com/v3"
    
    fixture_horizon_days: int = 7
    cache_ttl_seconds: int = 600
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,*"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

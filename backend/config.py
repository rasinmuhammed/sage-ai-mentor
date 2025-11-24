import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Reflog AI Mentor API"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = ""
    
    # Database
    DATABASE_URL: str = "sqlite:///./sage.db" # Default fallback
    
    # Security / Auth
    SECRET_KEY: str = "your-secret-key-here" # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # External Services
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    GITHUB_TOKEN: Optional[str] = None
    
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "Sage <onboarding@resend.dev>"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()

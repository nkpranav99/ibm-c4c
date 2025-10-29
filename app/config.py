from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres@/waste_marketplace?host=/var/run/postgresql/"
    DISABLE_DB: bool = True


    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://127.0.0.1:3000", "http://127.0.0.1:3001"]
    
    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5242880  # 5MB
    
    class Config:
        env_file = ".env"


settings = Settings()


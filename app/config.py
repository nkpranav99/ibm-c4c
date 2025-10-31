from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    # Database (disabled - using JSON file storage instead)
    DATABASE_URL: str = "sqlite:///./waste_marketplace.db"  # Not used
    DISABLE_DB: bool = True

    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - Allow both localhost and 127.0.0.1 for development
    # Using List[str] type hint for better Pydantic parsing
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]
    
    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5242880  # 5MB
    
    # Watson Orchestrate Configuration
    WATSON_API_KEY: Optional[str] = None
    WATSON_INSTANCE_ID: Optional[str] = None  # Instance ID - will be appended to base URL
    WATSON_HOST_URL: Optional[str] = "https://api.au-syd.watson-orchestrate.cloud.ibm.com"  # Base API URL (without /instances/)
    WATSON_AGENT_ID: Optional[str] = None
    WATSON_ENABLED: bool = False
    
    # Watsonx.ai Configuration (for general responses)
    WATSONX_API_KEY: Optional[str] = None
    WATSONX_PROJECT_ID: Optional[str] = None
    WATSONX_URL: Optional[str] = None
    WATSONX_MODEL_ID: str = "llama-3-405b-instruct"
    WATSONX_ENABLED: bool = False
    
    class Config:
        env_file = ".env"


settings = Settings()


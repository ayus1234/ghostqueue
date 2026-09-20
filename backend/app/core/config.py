import os
from typing import List


class Settings:
    PROJECT_NAME: str = "GhostQueue"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin.strip()
    ]
    
    # AWS configuration (environment-driven, no hardcoded credentials)
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    BEDROCK_MODEL_ID: str = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
    
    # Privacy principle: raw custom datasets are NEVER stored in persistent storage
    TEMP_STORAGE_DIR: str = os.getenv("TEMP_STORAGE_DIR", "temp_uploads")


settings = Settings()

# app/config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GOOGLE_CLOUD_PROJECT: str

    # Optional fields that may exist in .env but aren't required
    qwiz_api_backend_url: str = "http://localhost:8080"
    host_gcloud_path: str = ""
    container_gcloud_path: str = ""
    google_application_credentials: str = ""

    class Config:
        env_file = os.path.join(BASE_DIR, ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra fields in .env

settings = Settings()
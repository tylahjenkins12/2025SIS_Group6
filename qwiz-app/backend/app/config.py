# app/config.py

import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Define the absolute path to the .env file
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GOOGLE_CLOUD_PROJECT: str
    
    # Add these new attributes to match the .env file
    # Pydantic will automatically convert from the uppercase env variable names
    # to the lowercase attribute names.
    host_gcloud_path: str
    container_gcloud_path: str
    google_application_credentials: str
    qwiz_api_backend_url: str

    class Config:
        env_file = os.path.join(BASE_DIR, ".env")
        env_file_encoding = "utf-8"

settings = Settings()
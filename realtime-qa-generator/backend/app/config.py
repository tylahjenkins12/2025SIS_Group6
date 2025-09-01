# app/config.py

import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Define the absolute path to the .env file in the backend/ directory
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GOOGLE_CLOUD_PROJECT: str

    class Config:
        env_file = os.path.join(BASE_DIR, ".env")
        env_file_encoding = "utf-8"

settings = Settings()


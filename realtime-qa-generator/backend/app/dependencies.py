# app/dependencies.py
from google.cloud import firestore
from app.config import settings
from app.services import SessionManager

# Initialize the Firestore client and SessionManager instance here
db = firestore.Client(project=settings.GOOGLE_CLOUD_PROJECT)
session_manager = SessionManager(db_client=db)

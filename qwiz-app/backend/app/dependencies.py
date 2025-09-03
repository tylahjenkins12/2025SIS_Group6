# app/dependencies.py
from google.cloud import firestore
from app.config import settings
from app.services import SessionManager
from app.analytics import AnalyticsService

# Initialize the Firestore client and SessionManager instance here
db = firestore.Client(project=settings.GOOGLE_CLOUD_PROJECT)
session_manager = SessionManager(db_client=db)
analytics_service = AnalyticsService(db_client=db, session_manager=session_manager)

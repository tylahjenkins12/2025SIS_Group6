# app/dependencies.py
from app.config import settings
from app.services import SessionManager
from app.analytics import AnalyticsService
from google.cloud import firestore

print("🔥 Using real Firestore")
db = firestore.Client(project=settings.GOOGLE_CLOUD_PROJECT)

session_manager = SessionManager(db_client=db)
analytics_service = AnalyticsService(db_client=db, session_manager=session_manager)

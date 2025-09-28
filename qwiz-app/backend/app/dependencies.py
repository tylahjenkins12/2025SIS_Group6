# app/dependencies.py
import os
from app.config import settings
from app.services import SessionManager
from app.analytics import AnalyticsService

# For local development, use mock Firestore to avoid authentication issues
USE_MOCK_FIRESTORE = os.getenv("USE_MOCK_FIRESTORE", "true").lower() == "true"

if USE_MOCK_FIRESTORE:
    print("🔧 Using Mock Firestore for local development")
    from app.mock_firestore import create_mock_firestore_client
    db = create_mock_firestore_client(settings.GOOGLE_CLOUD_PROJECT)
else:
    print("🔥 Using real Firestore")
    from google.cloud import firestore
    db = firestore.Client(project=settings.GOOGLE_CLOUD_PROJECT)

session_manager = SessionManager(db_client=db)
analytics_service = AnalyticsService(db_client=db, session_manager=session_manager)

#!/usr/bin/env python3
"""
Test Firestore connection and operations
"""
import os
import sys
from datetime import datetime, timezone

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from google.cloud import firestore
from app.config import settings

def test_firestore():
    print("🔥 Testing Firestore Connection...")

    try:
        # Initialize Firestore client
        db = firestore.Client(project=settings.GOOGLE_CLOUD_PROJECT)
        print(f"✅ Connected to project: {settings.GOOGLE_CLOUD_PROJECT}")

        # Test write operation
        test_doc_ref = db.collection('test').document('connection_test')
        test_data = {
            'timestamp': datetime.now(timezone.utc),
            'message': 'Test connection from backend',
            'status': 'success'
        }

        print("📝 Testing write operation...")
        test_doc_ref.set(test_data)
        print("✅ Write operation successful")

        # Test read operation
        print("📖 Testing read operation...")
        doc = test_doc_ref.get()
        if doc.exists:
            print(f"✅ Read operation successful: {doc.to_dict()}")
        else:
            print("❌ Document not found after write")

        # Clean up test document
        test_doc_ref.delete()
        print("🧹 Cleaned up test document")

        # Test session collection access
        print("📚 Testing sessions collection...")
        sessions_ref = db.collection('sessions')

        # Try to create a test session
        session_data = {
            'createdAt': datetime.now(timezone.utc),
            'lecturerName': 'Test Lecturer',
            'courseName': 'Test Course',
            'questionIntervalSeconds': 30,
            'answerTimeSeconds': 30,
            'transcriptionIntervalSeconds': 10,
            'status': 'active',
            'lecturerTranscript': ''
        }

        session_ref = sessions_ref.document()  # Auto-generate ID
        session_ref.set(session_data)
        session_id = session_ref.id

        print(f"✅ Test session created: {session_id}")

        # Test reading the session back
        session_doc = session_ref.get()
        if session_doc.exists:
            print("✅ Session read back successfully")
            print(f"Session data: {session_doc.to_dict()}")

        # Clean up test session
        session_ref.delete()
        print("🧹 Cleaned up test session")

        print("\n🎉 All Firestore tests passed!")
        return True

    except Exception as e:
        print(f"❌ Firestore test failed: {e}")
        print("\n🔧 Troubleshooting tips:")
        print("1. Make sure you're authenticated with Google Cloud SDK:")
        print("   gcloud auth application-default login")
        print("2. Check if Firestore is enabled in your project:")
        print("   https://console.cloud.google.com/firestore")
        print("3. Verify project ID in .env file")
        return False

if __name__ == "__main__":
    test_firestore()
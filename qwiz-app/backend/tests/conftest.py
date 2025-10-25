"""
Pytest configuration and shared fixtures for backend tests
"""
import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, MagicMock, patch

# Mock Google Cloud dependencies at module level to prevent import issues
sys.modules['google.cloud'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()
sys.modules['firebase_admin'] = MagicMock()


@pytest.fixture(scope="session", autouse=True)
def mock_env_vars():
    """Mock environment variables for all tests"""
    os.environ['GOOGLE_CLOUD_PROJECT'] = 'test-project'
    os.environ['GEMINI_API_KEY'] = 'test-key'


@pytest.fixture
def client():
    """FastAPI test client for API endpoint testing"""
    # Mock Firestore and other cloud dependencies before app import
    with patch('google.cloud.firestore.Client') as mock_firestore:
        mock_db = Mock()
        mock_firestore.return_value = mock_db

        # Import app after mocking cloud dependencies
        from app.main import app

        # Disable startup events to prevent blocking
        app.router.on_startup = []

        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client


@pytest.fixture
def mock_firestore_client():
    """Mock Firestore client to avoid hitting real database"""
    mock_db = Mock()

    # Mock collection -> document chain
    mock_collection = Mock()
    mock_document = Mock()
    mock_doc_ref = Mock()

    # Setup method chaining
    mock_db.collection.return_value = mock_collection
    mock_collection.document.return_value = mock_document
    mock_document.get.return_value = mock_doc_ref

    # Mock document data
    mock_doc_ref.exists = True
    mock_doc_ref.to_dict.return_value = {
        "id": "test-session-123",
        "code": "ABC123",
        "lecturerName": "Dr. Test",
        "courseName": "Test Course",
        "status": "active",
        "questionReleaseMode": "active",
        "answerTimeSeconds": 30
    }

    return mock_db


@pytest.fixture
def mock_session_manager():
    """Mock WebSocket session manager"""
    mock_manager = Mock()
    mock_manager.broadcast = AsyncMock()
    mock_manager.connect = AsyncMock()
    mock_manager.disconnect = AsyncMock()
    mock_manager.send_personal_message = AsyncMock()
    mock_manager.active_connections = {}
    return mock_manager


@pytest.fixture
def mock_analytics_service():
    """Mock analytics service"""
    mock_service = Mock()
    mock_service.log_student_join = Mock()
    mock_service.log_student_leave = Mock()
    mock_service.log_question_generated = Mock()
    mock_service.log_answer_submitted = Mock()
    mock_service.get_session_analytics = Mock(return_value={
        "session_id": "test-session",
        "active_students": 5,
        "total_questions": 3,
        "total_answers": 15,
        "accuracy_percentage": 75.0
    })
    return mock_service


@pytest.fixture
def mock_gemini_api():
    """Mock Gemini AI API responses"""
    mock_response = Mock()
    mock_response.text = """[
        {
            "questionText": "What is machine learning?",
            "options": ["A subset of AI", "A programming language", "A database", "An OS"],
            "correctAnswer": "A subset of AI",
            "explanation": "Machine learning is a subset of artificial intelligence."
        },
        {
            "questionText": "What are the types of ML?",
            "options": ["Supervised/Unsupervised/Reinforcement", "Only supervised", "Only deep learning", "None"],
            "correctAnswer": "Supervised/Unsupervised/Reinforcement",
            "explanation": "There are three main types of machine learning."
        },
        {
            "questionText": "What is supervised learning?",
            "options": ["Uses labeled data", "Uses unlabeled data", "No data needed", "Only images"],
            "correctAnswer": "Uses labeled data",
            "explanation": "Supervised learning uses labeled training data."
        }
    ]"""
    return mock_response


@pytest.fixture
def sample_session_data():
    """Sample session data for testing"""
    return {
        "lecturer_name": "Dr. Test",
        "course_name": "AI 101",
        "answer_time_seconds": 30,
        "transcription_interval_minutes": 5,
        "question_release_mode": "active"
    }


@pytest.fixture
def sample_question_data():
    """Sample question data for testing"""
    return {
        "questionText": "What is the capital of France?",
        "options": ["Paris", "London", "Berlin", "Madrid"],
        "correctAnswer": "Paris",
        "explanation": "Paris is the capital of France."
    }


@pytest.fixture
def sample_student_answer():
    """Sample student answer for testing"""
    return {
        "question_id": "q-123",
        "selected_option": "Paris",
        "response_time_ms": 5000
    }

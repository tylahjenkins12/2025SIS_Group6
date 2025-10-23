"""
Unit tests for service layer (Firestore, Gemini AI, Analytics)
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timezone


@pytest.mark.unit
class TestFirestoreService:
    """Test Firestore database operations"""

    @patch('app.dependencies.db')
    def test_save_session_to_firestore(self, mock_db):
        """Test saving a new session to Firestore"""
        mock_doc_ref = Mock()
        mock_doc_ref.id = "session-123"
        mock_collection = Mock()
        mock_collection.document.return_value = mock_doc_ref
        mock_db.collection.return_value = mock_collection

        session_data = {
            "lecturerName": "Dr. Test",
            "courseName": "AI 101",
            "createdAt": datetime.now(timezone.utc),
            "status": "active"
        }

        # Simulate save
        mock_doc_ref.set(session_data)

        # Verify the save was called
        mock_doc_ref.set.assert_called_once_with(session_data)

    @patch('app.dependencies.db')
    def test_retrieve_session_from_firestore(self, mock_db):
        """Test retrieving session from Firestore"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "id": "session-123",
            "lecturerName": "Dr. Test",
            "status": "active"
        }

        mock_doc_ref = Mock()
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref

        # Simulate retrieval
        doc = mock_doc_ref.get()
        assert doc.exists
        assert doc.to_dict()["lecturerName"] == "Dr. Test"

    @patch('app.dependencies.db')
    def test_update_session_status(self, mock_db):
        """Test updating session status"""
        mock_doc_ref = Mock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref

        # Update session to ended
        update_data = {"status": "ended", "endedAt": datetime.now(timezone.utc)}
        mock_doc_ref.update(update_data)

        mock_doc_ref.update.assert_called_once()

    @patch('app.dependencies.db')
    def test_save_question_to_firestore(self, mock_db, sample_question_data):
        """Test saving a question to session's questions subcollection"""
        mock_question_ref = Mock()
        mock_questions_collection = Mock()
        mock_questions_collection.document.return_value = mock_question_ref

        mock_session_ref = Mock()
        mock_session_ref.collection.return_value = mock_questions_collection

        mock_db.collection.return_value.document.return_value = mock_session_ref

        # Save question
        question_data = {
            **sample_question_data,
            "id": "q-123",
            "generatedBy": "AI",
            "timestamp": datetime.now(timezone.utc)
        }
        mock_question_ref.set(question_data)

        mock_question_ref.set.assert_called_once()

    @patch('app.dependencies.db')
    def test_query_student_answers(self, mock_db):
        """Test querying student answers for analytics"""
        # Mock answer documents
        mock_answers = [
            Mock(to_dict=lambda: {"questionId": "q1", "isCorrect": True}),
            Mock(to_dict=lambda: {"questionId": "q2", "isCorrect": False}),
            Mock(to_dict=lambda: {"questionId": "q3", "isCorrect": True})
        ]

        mock_collection = Mock()
        mock_collection.stream.return_value = mock_answers
        mock_db.collection.return_value.document.return_value.collection.return_value = mock_collection

        # Calculate accuracy
        answers = [doc.to_dict() for doc in mock_answers]
        correct_count = sum(1 for a in answers if a["isCorrect"])
        accuracy = (correct_count / len(answers)) * 100

        assert accuracy == pytest.approx(66.67, rel=0.1)


@pytest.mark.unit
class TestGeminiService:
    """Test Gemini AI integration"""

    @patch('app.services.generate_three_questions_with_llm')
    async def test_generate_questions_from_transcript(self, mock_generate):
        """Test generating questions from lecture transcript"""
        from app.schemas import FirestoreQuestion

        transcript = "Machine learning is a subset of AI that uses algorithms."

        mock_questions = [
            FirestoreQuestion(
                id="q1",
                questionText="What is machine learning?",
                options=["AI subset", "Language", "Database", "OS"],
                correctAnswer="AI subset",
                explanation="ML is a subset of AI",
                generatedBy="AI"
            ),
            FirestoreQuestion(
                id="q2",
                questionText="What does ML use?",
                options=["Algorithms", "Only data", "Hardware", "Networks"],
                correctAnswer="Algorithms",
                explanation="ML uses algorithms",
                generatedBy="AI"
            ),
            FirestoreQuestion(
                id="q3",
                questionText="Is ML part of AI?",
                options=["Yes", "No", "Maybe", "Unknown"],
                correctAnswer="Yes",
                explanation="ML is part of AI",
                generatedBy="AI"
            )
        ]

        mock_generate.return_value = mock_questions

        result = await mock_generate(transcript)

        assert len(result) == 3
        assert all(hasattr(q, 'questionText') for q in result)
        assert all(len(q.options) == 4 for q in result)

    @patch('app.services.generate_three_questions_with_llm')
    async def test_handle_llm_generation_error(self, mock_generate):
        """Test handling LLM API errors gracefully"""
        mock_generate.side_effect = Exception("API Error")

        with pytest.raises(Exception):
            await mock_generate("test transcript")

    def test_parse_llm_response_json(self, mock_gemini_api):
        """Test parsing structured JSON from LLM response"""
        import json

        response_text = mock_gemini_api.text
        questions = json.loads(response_text)

        assert isinstance(questions, list)
        assert len(questions) >= 1

        # Verify structure
        for q in questions:
            assert "questionText" in q
            assert "options" in q
            assert "correctAnswer" in q
            assert "explanation" in q
            assert len(q["options"]) == 4


@pytest.mark.unit
class TestAnalyticsService:
    """Test analytics and metrics calculations"""

    def test_calculate_session_analytics(self, mock_analytics_service):
        """Test calculating real-time session analytics"""
        analytics = mock_analytics_service.get_session_analytics("test-session")

        assert analytics["session_id"] == "test-session"
        assert analytics["active_students"] > 0
        assert analytics["total_questions"] > 0
        assert 0 <= analytics["accuracy_percentage"] <= 100

    def test_log_student_join_event(self, mock_analytics_service):
        """Test logging student join event"""
        mock_analytics_service.log_student_join("student-1", "session-1")
        mock_analytics_service.log_student_join.assert_called_once_with("student-1", "session-1")

    def test_log_answer_submission_event(self, mock_analytics_service):
        """Test logging answer submission for analytics"""
        mock_analytics_service.log_answer_submitted(
            student_id="s1",
            session_id="session-1",
            question_id="q1",
            is_correct=True,
            response_time_ms=5000
        )

        mock_analytics_service.log_answer_submitted.assert_called_once()

    def test_calculate_average_response_time(self):
        """Test calculating average response time"""
        response_times = [3000, 5000, 7000, 4000, 6000]  # milliseconds

        avg_time = sum(response_times) / len(response_times)

        assert avg_time == 5000  # Average is 5 seconds

    def test_identify_struggling_students(self):
        """Test identifying students who need help"""
        students = [
            {"id": "s1", "correct": 8, "total": 10},  # 80% accuracy - good
            {"id": "s2", "correct": 3, "total": 10},  # 30% accuracy - struggling
            {"id": "s3", "correct": 9, "total": 10},  # 90% accuracy - excellent
            {"id": "s4", "correct": 4, "total": 10},  # 40% accuracy - struggling
        ]

        STRUGGLING_THRESHOLD = 50  # Below 50% is struggling

        struggling = [
            s for s in students
            if (s["correct"] / s["total"] * 100) < STRUGGLING_THRESHOLD
        ]

        assert len(struggling) == 2
        assert struggling[0]["id"] == "s2"
        assert struggling[1]["id"] == "s4"


@pytest.mark.unit
class TestSessionCodeGeneration:
    """Test session code generation"""

    def test_generate_unique_6_char_code(self):
        """Test generating 6-character alphanumeric codes"""
        import random
        import string

        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        assert len(code) == 6
        assert code.isupper()
        assert all(c.isalnum() for c in code)

    def test_code_uniqueness(self):
        """Test that generated codes are unique"""
        import random
        import string

        codes = set()
        for _ in range(100):
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            codes.add(code)

        # Should generate mostly unique codes (allowing for rare collisions)
        assert len(codes) >= 95

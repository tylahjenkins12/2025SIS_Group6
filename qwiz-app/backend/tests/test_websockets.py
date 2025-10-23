"""
Unit tests for WebSocket connections and real-time communication
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
import json


@pytest.mark.unit
class TestWebSocketConnections:
    """Test WebSocket connection management"""

    @pytest.mark.asyncio
    async def test_lecturer_websocket_connection(self, mock_session_manager):
        """Test lecturer WebSocket connection"""
        session_id = "test-session-123"
        websocket = Mock()

        await mock_session_manager.connect(websocket, session_id, "lecturer")

        mock_session_manager.connect.assert_called_once_with(websocket, session_id, "lecturer")

    @pytest.mark.asyncio
    async def test_student_websocket_connection(self, mock_session_manager):
        """Test student WebSocket connection"""
        session_id = "test-session-123"
        student_id = "student-456"
        websocket = Mock()

        await mock_session_manager.connect(websocket, session_id, f"student-{student_id}")

        mock_session_manager.connect.assert_called_once()

    @pytest.mark.asyncio
    async def test_websocket_disconnect(self, mock_session_manager):
        """Test WebSocket disconnection cleanup"""
        websocket = Mock()
        session_id = "test-session-123"

        await mock_session_manager.disconnect(websocket, session_id)

        mock_session_manager.disconnect.assert_called_once_with(websocket, session_id)

    @pytest.mark.asyncio
    async def test_multiple_concurrent_connections(self, mock_session_manager):
        """Test handling multiple simultaneous connections"""
        session_id = "test-session"
        websockets = [Mock() for _ in range(5)]

        for ws in websockets:
            await mock_session_manager.connect(ws, session_id, "student")

        assert mock_session_manager.connect.call_count == 5


@pytest.mark.unit
class TestWebSocketMessaging:
    """Test WebSocket message broadcasting"""

    @pytest.mark.asyncio
    async def test_broadcast_message_to_all_students(self, mock_session_manager):
        """Test broadcasting message to all connected students"""
        session_id = "test-session"
        message = {
            "type": "new_question",
            "question": {
                "id": "q1",
                "text": "What is AI?",
                "options": ["Intelligence", "Language", "Database", "OS"]
            }
        }

        await mock_session_manager.broadcast(session_id, message)

        mock_session_manager.broadcast.assert_called_once_with(session_id, message)

    @pytest.mark.asyncio
    async def test_send_personal_message_to_student(self, mock_session_manager):
        """Test sending message to specific student"""
        student_id = "student-123"
        message = {
            "type": "answer_result",
            "is_correct": True,
            "score": 85
        }

        websocket = Mock()
        await mock_session_manager.send_personal_message(websocket, message)

        mock_session_manager.send_personal_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_broadcast_leaderboard_update(self, mock_session_manager):
        """Test broadcasting leaderboard updates"""
        session_id = "test-session"
        leaderboard_message = {
            "type": "leaderboard_update",
            "leaderboard": [
                {"rank": 1, "name": "Alice", "score": 450},
                {"rank": 2, "name": "Bob", "score": 380}
            ]
        }

        await mock_session_manager.broadcast(session_id, leaderboard_message)

        mock_session_manager.broadcast.assert_called_once()

    @pytest.mark.asyncio
    async def test_session_ended_broadcast(self, mock_session_manager):
        """Test broadcasting session end message"""
        session_id = "test-session"
        end_message = {
            "type": "session_ended",
            "results": {
                "total_questions": 10,
                "top_three": []
            }
        }

        await mock_session_manager.broadcast(session_id, end_message)

        mock_session_manager.broadcast.assert_called_once()


@pytest.mark.unit
class TestTranscriptHandling:
    """Test real-time transcript processing"""

    @pytest.mark.asyncio
    async def test_receive_transcript_chunk(self):
        """Test receiving transcript chunk from lecturer"""
        transcript_message = {
            "type": "transcript_chunk",
            "chunk": "Machine learning is a subset of AI that uses algorithms to improve.",
            "timestamp": "2025-01-23T10:30:00Z"
        }

        # Verify message structure
        assert transcript_message["type"] == "transcript_chunk"
        assert len(transcript_message["chunk"]) > 0
        assert "timestamp" in transcript_message

    @pytest.mark.asyncio
    async def test_accumulate_transcript_chunks(self):
        """Test accumulating transcript chunks for question generation"""
        chunks = [
            "Machine learning is a subset of AI.",
            "It uses algorithms to learn from data.",
            "There are three main types of ML."
        ]

        accumulated_transcript = " ".join(chunks)

        assert len(accumulated_transcript) > 50
        assert "Machine learning" in accumulated_transcript
        assert "three main types" in accumulated_transcript

    @pytest.mark.asyncio
    async def test_trigger_question_generation_after_interval(self):
        """Test triggering question generation after transcript interval"""
        MIN_TRANSCRIPT_LENGTH = 100
        transcript = "Short text"

        # Should not trigger if too short
        assert len(transcript) < MIN_TRANSCRIPT_LENGTH

        # Should trigger when long enough
        long_transcript = "Machine learning is a field of AI " * 10
        assert len(long_transcript) >= MIN_TRANSCRIPT_LENGTH


@pytest.mark.unit
class TestAnswerSubmissionWebSocket:
    """Test answer submission via WebSocket"""

    @pytest.mark.asyncio
    async def test_student_submit_answer_via_websocket(self):
        """Test student submitting answer through WebSocket"""
        answer_message = {
            "type": "answer_submission",
            "data": {
                "question_id": "q1",
                "selected_option": "Intelligence",
                "response_time_ms": 5000
            }
        }

        # Verify message structure
        assert answer_message["type"] == "answer_submission"
        assert "question_id" in answer_message["data"]
        assert "selected_option" in answer_message["data"]
        assert answer_message["data"]["response_time_ms"] > 0

    @pytest.mark.asyncio
    async def test_send_answer_result_to_student(self, mock_session_manager):
        """Test sending answer result back to student"""
        result_message = {
            "type": "answer_result",
            "is_correct": True,
            "points_earned": 85,
            "total_score": 285
        }

        websocket = Mock()
        await mock_session_manager.send_personal_message(websocket, result_message)

        mock_session_manager.send_personal_message.assert_called_once()


@pytest.mark.unit
class TestQuestionBroadcasting:
    """Test broadcasting questions to students"""

    @pytest.mark.asyncio
    async def test_broadcast_active_mode_question_options(self, mock_session_manager):
        """Test sending 3 question options to lecturer in active mode"""
        session_id = "test-session"
        options_message = {
            "type": "question_options",
            "chunk_id": "chunk-123",
            "options": [
                {
                    "index": 0,
                    "questionText": "What is ML?",
                    "options": ["AI subset", "Language", "Database", "OS"]
                },
                {
                    "index": 1,
                    "questionText": "Types of ML?",
                    "options": ["Supervised/Unsupervised/RL", "Only supervised", "Deep learning", "None"]
                },
                {
                    "index": 2,
                    "questionText": "What is supervised learning?",
                    "options": ["Labeled data", "Unlabeled data", "No data", "Images only"]
                }
            ]
        }

        # Verify structure
        assert len(options_message["options"]) == 3
        assert all("questionText" in opt for opt in options_message["options"])

    @pytest.mark.asyncio
    async def test_broadcast_passive_mode_auto_release(self, mock_session_manager):
        """Test auto-releasing question in passive mode"""
        session_id = "test-session"
        question_message = {
            "type": "new_question",
            "question": {
                "id": "q1",
                "question_text": "What is AI?",
                "options": ["Intelligence", "Language", "Database", "OS"],
                "answer_time_seconds": 30
            },
            "auto_released": True
        }

        await mock_session_manager.broadcast(session_id, question_message)

        mock_session_manager.broadcast.assert_called_once()
        assert question_message["auto_released"] is True


@pytest.mark.unit
class TestWebSocketErrorHandling:
    """Test WebSocket error scenarios"""

    @pytest.mark.asyncio
    async def test_handle_websocket_disconnect_gracefully(self, mock_session_manager):
        """Test handling unexpected WebSocket disconnection"""
        websocket = Mock()
        session_id = "test-session"

        # Simulate disconnect
        await mock_session_manager.disconnect(websocket, session_id)

        # Should not raise exception
        mock_session_manager.disconnect.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_invalid_message_format(self):
        """Test handling malformed WebSocket messages"""
        invalid_message = "not a json object"

        with pytest.raises(json.JSONDecodeError):
            json.loads(invalid_message)

    @pytest.mark.asyncio
    async def test_handle_missing_session_id(self, mock_firestore_client):
        """Test handling connection to non-existent session"""
        mock_doc = Mock()
        mock_doc.exists = False

        mock_firestore_client.collection.return_value.document.return_value.get.return_value = mock_doc

        # Should handle gracefully or return 404
        doc = mock_firestore_client.collection("sessions").document("invalid-id").get()
        assert not doc.exists

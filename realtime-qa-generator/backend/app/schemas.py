# app/schemas.py

import uuid
from typing import List
from pydantic import BaseModel, Field

# --- Pydantic Models for Data Validation ---

# Model for the data received from the LLM to create a new question.
# The backend will add the 'generatedBy' and 'timestamp' fields before saving to Firestore.
class QuestionFromLLM(BaseModel):
    """Represents the structured JSON data received from the LLM API."""
    question_text: str
    options: List[str]
    correct_answer: str

# Model for a student's answer submission.
# This validates the data a student sends to the WebSocket endpoint.
class StudentAnswer(BaseModel):
    """Validates the data for a student's answer to a question."""
    question_id: str
    selected_option: str

# Model for creating a new session.
# The lecturerId will be derived from authentication, and other fields are
# managed by the backend (e.g., status, startTime).
class SessionCreate(BaseModel):
    """Validates the data to start a new quiz session."""
    course_name: str
    
# Model for the full Question object that will be stored in Firestore.
# This includes the fields managed by the backend.
class FirestoreQuestion(BaseModel):
    """Represents a complete question document as it will be stored in Firestore."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    questionText: str
    options: List[str]
    correctAnswer: str
    generatedBy: str
    # Note: timestamp is a Firestore ServerTimestamp, which Pydantic doesn't handle natively.
    # We will handle this field in the service layer.

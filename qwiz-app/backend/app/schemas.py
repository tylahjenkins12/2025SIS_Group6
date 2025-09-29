# app/schemas.py

import uuid
from typing import List, Optional, Literal
from datetime import datetime
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
    response_time_ms: Optional[int] = None

# Model for lecturer question selection
class LecturerQuestionSelection(BaseModel):
    """Validates the data when lecturer selects a question from the 3 options."""
    session_id: str
    selected_question_index: int = Field(ge=0, le=2)  # 0, 1, or 2 for the 3 options
    chunk_id: str  # Identifier for the transcript chunk this question set came from

# Model for creating a new session with lecturer setup
class SessionCreate(BaseModel):
    """Validates the data to start a new quiz session."""
    lecturer_name: str
    course_name: str
    answer_time_seconds: Literal[20, 30, 45, 60, 90] = Field(default=30)  # 20s, 30s, 45s, 1min, 1.5min
    transcription_interval_minutes: Literal[5, 7, 9, 12] = Field(default=5)  # Fixed intervals: 5, 7, 9, or 12 minutes
    
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

# --- Analytics Models ---

class StudentJoinEvent(BaseModel):
    """Analytics event for when a student joins a session."""
    student_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=datetime.now)

class StudentLeaveEvent(BaseModel):
    """Analytics event for when a student leaves a session."""
    student_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=datetime.now)

class QuestionGeneratedEvent(BaseModel):
    """Analytics event for when a question is generated."""
    question_id: str
    session_id: str
    generation_method: str  # "AI" or "manual"
    timestamp: datetime = Field(default_factory=datetime.now)

class AnswerSubmittedEvent(BaseModel):
    """Analytics event for when a student submits an answer."""
    student_id: str
    session_id: str
    question_id: str
    selected_option: str
    correct_answer: str
    is_correct: bool
    response_time_ms: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class SessionAnalytics(BaseModel):
    """Real-time session analytics summary."""
    session_id: str
    active_students: int
    total_questions: int
    total_answers: int
    average_response_time_ms: Optional[float] = None
    accuracy_percentage: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)

# --- Leaderboard and Game End Models ---

class StudentScore(BaseModel):
    """Individual student score for leaderboard."""
    student_id: str
    student_name: Optional[str] = None
    score: int
    correct_answers: int
    total_answers: int
    average_response_time_ms: Optional[float] = None

class Leaderboard(BaseModel):
    """Current session leaderboard."""
    session_id: str
    students: List[StudentScore]
    timestamp: datetime = Field(default_factory=datetime.now)

class SessionEnd(BaseModel):
    """Session end summary with final results."""
    session_id: str
    top_three: List[StudentScore]  # Podium winners
    total_participants: int
    total_questions: int
    session_duration_seconds: int
    struggling_students: List[StudentScore]  # Students with low accuracy
    timestamp: datetime = Field(default_factory=datetime.now)

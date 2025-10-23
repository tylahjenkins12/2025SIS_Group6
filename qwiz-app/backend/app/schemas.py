
import uuid
from typing import List, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


# LLM response data - backend adds 'generatedBy' and 'timestamp' before saving to Firestore
class QuestionFromLLM(BaseModel):
    question_text: str
    options: List[str]
    correct_answer: str
    explanation: str

class StudentAnswer(BaseModel):
    question_id: str
    selected_option: str
    response_time_ms: Optional[int] = None

class LecturerQuestionSelection(BaseModel):
    session_id: str
    selected_question_index: int = Field(ge=0, le=2)
    chunk_id: str

class SessionCreate(BaseModel):
    lecturer_name: str
    course_name: str
    answer_time_seconds: Literal[20, 30, 45, 60, 90] = Field(default=30)
    transcription_interval_minutes: Literal[0.33, 5, 7, 9, 12] = Field(default=5)
    question_release_mode: Literal["active", "passive"] = Field(default="active")

class FirestoreQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    questionText: str
    options: List[str]
    correctAnswer: str
    explanation: str
    generatedBy: str
    # Note: timestamp is a Firestore ServerTimestamp handled in service layer

class StudentJoinEvent(BaseModel):
    student_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=datetime.now)

class StudentLeaveEvent(BaseModel):
    student_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=datetime.now)

class QuestionGeneratedEvent(BaseModel):
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

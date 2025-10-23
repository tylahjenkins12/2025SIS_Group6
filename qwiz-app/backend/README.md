# Qwiz Backend

FastAPI-powered backend service providing real-time quiz management, AI question generation, and WebSocket communication for the Qwiz interactive learning platform.

## Overview

The backend handles:
- **Session Management:** Create and manage quiz sessions with unique join codes
- **Real-time Communication:** WebSocket connections for live updates to students and lecturers
- **AI Question Generation:** Gemini API integration for automatic quiz question creation
- **Data Persistence:** Firestore database for sessions, questions, students, and answers
- **Scoring & Leaderboards:** Real-time score calculations and rankings

## Local Development Setup

**See [LOCAL_SETUP.md](../LOCAL_SETUP.md)** for complete setup instructions including:
- Google Cloud authentication and configuration
- Environment variable setup
- Docker and manual setup options
- Troubleshooting common issues

### Quick Start (Manual)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run_local.py
```

Backend runs at http://localhost:8080 | API docs at http://localhost:8080/docs

## Architecture

### Tech Stack
- **Framework:** FastAPI (Python 3.11)
- **Database:** Google Firestore (NoSQL)
- **AI:** Google Gemini 1.5 Flash
- **Real-time:** WebSockets via FastAPI
- **Authentication:** Application Default Credentials (ADC)
- **Deployment:** Docker + Google Cloud Run

### Project Structure
```
backend/
├── app/
│   ├── main.py              # FastAPI app, routes, WebSocket endpoints
│   ├── schemas.py           # Pydantic request/response models
│   ├── config.py            # Configuration and settings
│   ├── dependencies.py      # Dependency injection (db, session_manager)
│   ├── services.py          # Business logic (Gemini AI, question generation)
│   ├── analytics.py         # Analytics and metrics calculations
│   └── api/
│       └── sessions.py      # Session management endpoints
├── tests/
│   ├── conftest.py          # Pytest fixtures and configuration
│   ├── test_api_sessions.py # API endpoint tests
│   ├── test_services.py     # Service layer tests
│   ├── test_websockets.py   # WebSocket tests
│   └── legacy/              # Archived manual test scripts
├── Dockerfile               # Container configuration
├── pytest.ini               # Pytest configuration
├── requirements.txt         # Python dependencies (includes test deps)
└── run_local.py            # Local development entrypoint
```

## API Endpoints

FastAPI provides **interactive documentation** at http://localhost:8080/docs with full request/response schemas and a testing interface.

### Key Endpoints

**Session Management**
- `POST /api/sessions/create` - Create new session with unique code
- `POST /api/sessions/join` - Student joins session by code
- `GET /api/sessions/{session_id}` - Get session details
- `POST /api/sessions/{session_id}/end` - End session

**Question Management**
- `POST /api/questions/generate` - Generate questions from content using Gemini AI
- `POST /api/questions/publish` - Publish question to students via WebSocket
- `GET /api/sessions/{session_id}/results/{question_id}` - Get answer distribution

**Student Interaction**
- `POST /api/answers/submit` - Submit answer and calculate score
- `GET /api/sessions/{session_id}/leaderboard` - Get current rankings

**Health & Monitoring**
- `GET /health` - Health check endpoint
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc alternative documentation

**Scoring Formula:** `score = 100 × (1 - time_taken/duration)` if correct, 0 if incorrect

## WebSocket Communication

### Lecturer WebSocket
```
ws://localhost:8080/ws/lecturer/{session_id}
```

**Receives (from server):**
- `student-joined` - `{ type: "student-joined", student: {...} }`
- `answer-submitted` - `{ type: "answer-submitted", student_id, answer }`
- `all-answered` - `{ type: "all-answered", count }`

**Sends (to server):**
- `publish-question` - `{ type: "publish-question", question_id, duration }`
- `end-question` - `{ type: "end-question", question_id }`
- `end-session` - `{ type: "end-session" }`

### Student WebSocket
```
ws://localhost:8080/ws/student/{session_id}/{student_id}
```

**Receives (from server):**
- `question-published` - `{ type: "question-published", question: {...}, duration }`
- `question-ended` - `{ type: "question-ended", question_id, results }`
- `leaderboard-update` - `{ type: "leaderboard-update", leaderboard: [...] }`
- `session-ended` - `{ type: "session-ended" }`

**Sends (to server):**
- `submit-answer` - `{ type: "submit-answer", question_id, answer, time_taken }`
- `ping` - Keepalive message

## Database Schema

### Firestore Collections

#### `sessions`
```javascript
{
  id: "session-abc123",
  code: "842956",              // 6-digit join code
  lecturer_id: "prof-456",
  course_name: "Introduction to AI",
  status: "active" | "ended",
  created_at: Timestamp,
  student_count: 25,
  current_question: "q3"
}
```

#### `questions`
```javascript
{
  id: "q1",
  session_id: "session-abc123",
  text: "What is machine learning?",
  options: ["A subset of AI", "A language", "A database", "An OS"],
  correct: 0,                  // Index of correct answer
  explanation: "ML is a subset of AI...",
  published_at: Timestamp,
  duration: 30,                // Seconds
  stats: {
    total_answers: 20,
    correct_answers: 15,
    answer_distribution: [15, 3, 1, 1]
  }
}
```

#### `students`
```javascript
{
  id: "student-789",
  session_id: "session-abc123",
  name: "John Doe",
  score: 350,
  joined_at: Timestamp,
  answers: [
    {
      question_id: "q1",
      answer: 0,
      correct: true,
      score: 85,
      time_taken: 15.3
    }
  ]
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Sessions: public read for joining, authenticated write
    match /sessions/{session} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Questions: read only for session participants
    match /questions/{question} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Students: own data only
    match /students/{student} {
      allow read: if true;
      allow create: if true;
      allow update: if request.auth != null || resource.id == request.resource.id;
    }
  }
}
```

## AI Integration

### Gemini Configuration

```python
# app/services/gemini.py
MODEL = "gemini-1.5-flash"
GENERATION_CONFIG = {
    "temperature": 0.7,          # Creativity level
    "max_output_tokens": 2048,   # Response length
    "top_p": 0.95,
    "top_k": 40
}
```

### Question Generation Prompt

The system uses structured prompting to generate consistent quiz questions:

```python
prompt = f"""
Generate {count} multiple choice questions based on this lecture content:

{content}

Requirements:
- 4 answer options per question (A, B, C, D)
- Exactly one correct answer
- Clear, concise explanations
- Difficulty: appropriate for university students
- Format: JSON

Return JSON in this exact format:
{{
  "questions": [
    {{
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Explanation of why this is correct"
    }}
  ]
}}
"""
```

## Performance & Optimization

### Connection Management
- **Firestore:** Single client instance reused across requests
- **WebSocket:** Automatic cleanup on disconnect, heartbeat monitoring
- **Gemini API:** Request pooling with retry logic

### Caching Strategy
- Generated questions cached in Firestore (no in-memory cache currently)
- Session data retrieved once per WebSocket connection
- Leaderboard computed on-demand (future: cache for 5 seconds)

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found (session/question doesn't exist)
- `409` - Conflict (duplicate submission)
- `500` - Internal Server Error (logged to Cloud Logging)

### Logging
Structured JSON logs to stdout for Cloud Run:
```python
logger.info("Session created", extra={
    "session_id": session_id,
    "lecturer_id": lecturer_id,
    "code": code
})
```

## Testing

### Run Tests

Ensure you're in the `backend/` directory with the virtual environment activated:

```bash
# Activate virtual environment
source venv/bin/activate

# Install test dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api_sessions.py -v

# Run only unit tests
pytest -m unit

# Run with verbose output
pytest -vv
```

Coverage reports are generated in `htmlcov/` - open `htmlcov/index.html` in a browser.

### Test Structure

```
tests/
├── conftest.py              # Shared fixtures and test configuration
├── test_api_sessions.py     # API endpoint tests (sessions, questions, answers, leaderboard)
├── test_services.py         # Service layer tests (Firestore, Gemini AI, analytics)
├── test_websockets.py       # WebSocket connection and messaging tests
└── legacy/                  # Old manual test scripts (archived)
    ├── test_firestore.py
    ├── test_mvp_flow.py
    └── test_websocket.py
```

### Test Coverage

The test suite covers:
- ✅ Session creation and data validation (Pydantic schemas)
- ✅ Question generation logic and structure validation
- ✅ Answer submission and scoring algorithms
- ✅ Leaderboard calculations and ranking
- ✅ WebSocket connection management and messaging
- ✅ Firestore operations (mocked)
- ✅ Analytics calculations and metrics
- ✅ Error handling and edge cases

**Note:** Tests use mocked dependencies (Firestore, Gemini API) to ensure fast, reliable execution without external service calls.

### Writing New Tests

Tests use pytest with mocked dependencies (Firestore, Gemini API). Example:

```python
@pytest.mark.unit
def test_example(sample_session_data):
    """Test data validation logic"""
    from app.schemas import SessionCreate

    session = SessionCreate(**sample_session_data)
    assert session.lecturer_name is not None
```

Available fixtures in `tests/conftest.py`:
- `client` - FastAPI TestClient (health check endpoint only)
- `mock_firestore_client` - Mocked Firestore database
- `mock_session_manager` - Mocked WebSocket manager
- `mock_analytics_service` - Mocked analytics service
- `sample_session_data` - Sample session creation data
- `sample_question_data` - Sample question structure

**Legacy Tests:** Manual integration tests are in `tests/legacy/` and excluded from automated runs.

## Deployment

### Docker Build
```bash
docker build -t qwiz-backend .
docker run -p 8080:8080 --env-file .env qwiz-backend
```

### Google Cloud Run
See [main README](../README.md#deployment-to-the-production-environment) for Cloud Run deployment instructions.

## Related Documentation

- **[Local Setup Guide](../LOCAL_SETUP.md)** - Complete development environment setup
- **[Main README](../README.md)** - Project overview and deployment
- **[Frontend README](../frontend/README.md)** - Frontend integration details

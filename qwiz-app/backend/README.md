# 🚀 Qwiz Backend

FastAPI-powered backend service providing real-time quiz management, AI question generation, and WebSocket communication.

## 🎯 Quick Start

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server (http://localhost:8080)
uvicorn app.main:app --reload --port 8080
```

📚 API Documentation available at http://localhost:8080/docs

## 🏗️ Architecture

### Tech Stack
- **Framework:** FastAPI (Python 3.11)
- **Database:** Google Firestore
- **AI Integration:** Google Gemini API
- **Real-time:** WebSockets via FastAPI
- **Authentication:** Application Default Credentials (ADC)

### Project Structure
```
backend/
├── app/
│   ├── main.py           # FastAPI application & routes
│   ├── models.py         # Pydantic models
│   ├── services/         
│   │   ├── firestore.py  # Database operations
│   │   ├── gemini.py     # AI question generation
│   │   └── websocket.py  # WebSocket manager
│   └── utils/            # Helper functions
├── Dockerfile            # Container configuration
└── requirements.txt      # Python dependencies
```

## 🔌 API Endpoints

### Session Management

#### `POST /api/sessions/create`
Creates a new quiz session with unique 6-digit code.
```json
Request: { "lecturer_id": "prof123" }
Response: { 
  "session_id": "abc-123",
  "code": "842956",
  "created_at": "2025-01-01T10:00:00Z"
}
```

#### `POST /api/sessions/join`
Students join an active session.
```json
Request: { "code": "842956", "name": "John Doe" }
Response: { 
  "student_id": "stu-456",
  "session_id": "abc-123",
  "status": "joined"
}
```

#### `GET /api/sessions/{session_id}`
Retrieve session details and current state.

#### `POST /api/sessions/{session_id}/end`
End session and cleanup resources.

### Question Generation

#### `POST /api/questions/generate`
Generate questions from lecture content using Gemini AI.
```json
Request: {
  "session_id": "abc-123",
  "content": "Lecture transcript...",
  "count": 5
}
Response: {
  "questions": [
    {
      "id": "q1",
      "text": "What is the main topic?",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "The correct answer is A because..."
    }
  ]
}
```

#### `POST /api/questions/publish`
Publish question to all connected students.
```json
Request: {
  "session_id": "abc-123",
  "question_id": "q1",
  "duration": 30
}
```

### Answer Submission

#### `POST /api/answers/submit`
Submit student answer and calculate score.
```json
Request: {
  "student_id": "stu-456",
  "question_id": "q1",
  "answer": 0,
  "time_taken": 15.3
}
Response: {
  "correct": true,
  "score": 100,
  "total_score": 300
}
```

#### `GET /api/sessions/{session_id}/results`
Get aggregated results for current question.

### Leaderboard

#### `GET /api/sessions/{session_id}/leaderboard`
Real-time leaderboard with student rankings.
```json
Response: {
  "leaderboard": [
    { "rank": 1, "name": "Alice", "score": 450 },
    { "rank": 2, "name": "Bob", "score": 380 }
  ]
}
```

## 🔄 WebSocket Events

### Lecturer Connection
```
ws://localhost:8080/ws/lecturer/{session_id}
```

**Receives:**
- `student-joined` - New student joined
- `answer-submitted` - Student submitted answer
- `all-answered` - All students have answered

**Sends:**
- `publish-question` - Send question to students
- `end-question` - Stop accepting answers
- `end-session` - Close the session

### Student Connection
```
ws://localhost:8080/ws/student/{session_id}
```

**Receives:**
- `question-published` - New question available
- `question-ended` - Time's up or manually ended
- `leaderboard-update` - Score changes
- `session-ended` - Quiz complete

**Sends:**
- `submit-answer` - Send answer to server
- `ping` - Keep connection alive

## 🗄️ Database Schema (Firestore)

### Collections

#### `sessions`
```javascript
{
  id: "session-123",
  code: "842956",
  lecturer_id: "prof-456",
  status: "active|ended",
  created_at: timestamp,
  student_count: 25,
  current_question: "q3"
}
```

#### `questions`
```javascript
{
  id: "q1",
  session_id: "session-123",
  text: "Question text",
  options: ["A", "B", "C", "D"],
  correct: 0,
  published_at: timestamp,
  stats: {
    total_answers: 20,
    correct_answers: 15
  }
}
```

#### `students`
```javascript
{
  id: "student-789",
  session_id: "session-123",
  name: "John Doe",
  score: 350,
  answers: [
    { question_id: "q1", answer: 0, correct: true }
  ]
}
```

## 🤖 AI Integration

### Gemini API Configuration
```python
# app/services/gemini.py
GEMINI_MODEL = "gemini-1.5-flash"
GENERATION_CONFIG = {
    "temperature": 0.7,
    "max_output_tokens": 2048,
}
```

### Question Generation Prompt
```python
prompt = f"""
Generate {count} multiple choice questions from this content:
{content}

Format as JSON:
{{
  "questions": [
    {{
      "text": "question",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "why this is correct"
    }}
  ]
}}
"""
```

## 🔐 Authentication & Security

### Google Cloud Authentication
```bash
# Local development
gcloud auth application-default login

# Docker/Production
# Uses mounted credentials or service account
```

### Environment Variables
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GEMINI_API_KEY=your-api-key  # From Google Cloud Secrets
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Firestore Security Rules
```javascript
// firestore.rules
match /sessions/{session} {
  allow read: if true;  // Public read for joining
  allow write: if request.auth != null;  // Authenticated writes
}
```

## 🐳 Docker Deployment

```dockerfile
FROM python:3.11-slim
WORKDIR /usr/src/app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## 🧪 Testing

```bash
# Run unit tests
pytest tests/

# Test coverage
pytest --cov=app tests/

# Load testing with locust
locust -f tests/load_test.py --host=http://localhost:8080
```

## 📊 Performance Considerations

- **Connection Pooling:** Firestore client reused across requests
- **Async Operations:** All I/O operations are async
- **WebSocket Management:** Automatic cleanup on disconnect
- **Rate Limiting:** 100 requests/minute per IP
- **Question Caching:** Generated questions cached for 1 hour

## 🚦 Error Handling

- **400:** Invalid request data
- **404:** Session/resource not found
- **409:** Duplicate submission
- **429:** Rate limit exceeded
- **500:** Server error (logged to Cloud Logging)

## 🔍 Monitoring

- **Health Check:** `GET /health`
- **Metrics:** `GET /metrics` (Prometheus format)
- **Logging:** Structured JSON logs to stdout
- **Tracing:** OpenTelemetry integration

---

📚 For frontend integration details, see [frontend README](../frontend/README.md)  
🔧 For deployment and infrastructure, see [main README](../README.md)
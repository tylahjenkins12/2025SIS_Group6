# Qwiz App

Real-time AI-powered quiz application for interactive lectures. Students join sessions with unique codes and answer AI-generated questions while lecturers monitor engagement through live analytics.

## Overview

Qwiz App enhances lecture engagement by automatically generating quiz questions from live content using AI. The system provides real-time feedback to both students and lecturers, creating an interactive learning environment.

## Features

- **Live Quiz Sessions**: Students join with unique codes, answer MCQs in real-time
- **AI Question Generation**: Auto-generate questions from lecture transcripts using Gemini AI
- **Real-time Leaderboard**: Live scoring and competitive rankings
- **Lecturer Dashboard**: Session management and student performance analytics
- **WebSocket Communication**: Real-time data sync across all participants
- **Ephemeral Sessions**: Privacy-focused with no persistent student data

## Tech Stack

- **Backend**: FastAPI (Python) with Firestore database
- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **AI**: Google Gemini API for question generation
- **Deployment**: Google Cloud Run with Docker containers
- **Real-time**: WebSocket connections for live updates

## Architecture

```
┌─────────────┐    WebSocket    ┌─────────────┐    Firestore    ┌─────────────┐
│   Frontend  │◄───────────────►│   Backend   │◄───────────────►│  Database   │
│  (Next.js)  │                 │  (FastAPI)  │                 │ (Firestore) │
└─────────────┘                 └─────────────┘                 └─────────────┘
                                        │
                                        ▼
                                ┌─────────────┐
                                │  Gemini AI  │
                                │    (API)    │
                                └─────────────┘
```

## Project Structure

```
├── backend/              # FastAPI Python server
│   ├── app/             # Application code
│   ├── Dockerfile       # Backend container
│   └── requirements.txt # Python dependencies
├── frontend/            # Next.js React app  
│   ├── src/            # Source code
│   ├── Dockerfile      # Frontend container
│   └── package.json    # Node dependencies
├── docker-compose.yml  # Local development
└── README.md          # This file
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Google Cloud CLI (for deployment)
- Node.js 18+ (for local frontend development)
- Python 3.8+ (for local backend development)

### Run with Docker Compose
```bash
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Individual Development
```bash
# Backend
cd backend && pip install -r requirements.txt
cp .env.example .env  # Configure environment variables
uvicorn app.main:app --reload --port 8080

# Frontend  
cd frontend && npm install && npm run dev
```

## Environment Setup

### Backend Environment (.env)
```bash
cd backend
cp .env.example .env
```

Required variables:
```env
GOOGLE_CLOUD_PROJECT="your-project-id"
GEMINI_API_KEY="your-gemini-api-key"
GOOGLE_APPLICATION_CREDENTIALS="./secrets/firestore-key.json"
```

### Firestore Authentication
```bash
# Create secrets directory
mkdir backend/secrets

# Download service account key
gcloud secrets versions access latest \
  --secret="LECTURE-QUIZ-FIRESTORE-KEY" \
  --format="json" > ./backend/secrets/firestore-key.json
```

## Deployment

**⚠️ Important**: Deploy backend first, then frontend (frontend depends on backend URL)

### 1. Deploy Backend to Cloud Run
```bash
cd backend
gcloud run deploy qwiz-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT="your-project",GEMINI_API_KEY="your-key"
```

### 2. Deploy Frontend to Cloud Run  
```bash
cd frontend
gcloud run deploy qwiz-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars QWIZ_API_BACKEND_URL="https://qwiz-backend-xxx.run.app"
```

### Docker Individual Containers
```bash
# Build images
docker build -t qwiz-backend ./backend
docker build -t qwiz-frontend ./frontend

# Deploy to your container platform
```

## Testing

### Backend API Testing
```bash
# Health check
curl http://localhost:8080/

# Create session
curl -X POST http://localhost:8080/start-session

# WebSocket testing with wscat
wscat -c ws://localhost:8080/ws/lecturer/{session-id}
wscat -c ws://localhost:8080/ws/student/{session-id}
```

### Frontend Testing
- Navigate to http://localhost:3000
- Test lecturer flow: `/lecturer` → create session → manage questions
- Test student flow: `/student` → join with code → answer questions

## Development

- **Backend**: See `backend/README.md` for FastAPI setup and API documentation
- **Frontend**: See `frontend/README.md` for Next.js development and component structure

## License

MIT - see LICENSE file
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
qwiz-app/
├── backend/              # FastAPI Python server
│   ├── app/             # Application code
│   ├── tests/           # Backend test scripts 
│   ├── Dockerfile       # Backend container
│   └── run_local.py     # entrypoint
│   └── requirements.txt # Python dependencies
├── frontend/            # Next.js React app  
│   ├── src/            # Source code
│   ├── Dockerfile      # Frontend container
│   └── package.json    # Node dependencies
├── .env                # Environment configuration (create from .env.example)
├── .env.example        # Template for environment variables
├── docker-compose.yml  # Local development orchestration
|── LOCAL_SETUP.md     # Setup process file
└── README.md          # This file
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Google Cloud CLI (for deployment)
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Project best practices 
Reference to git good resource website, reference PR template, and explicitly mention specific code qualities and standards 



## Deployment to the Production Environment
This deployment process leverages GCP and its apps for best practice deployment practices, Cloud Build to build the containers which are then saved to Artefacts which are then used as the source for the Cloud Run service deployment and hosting. 

**⚠️ Important**: Deploy backend first, then frontend (frontend depends on backend URL)

### Prerequisites
```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Set your project
gcloud config set project software-innovation-studio-6
```

### 1. Deploy Backend to Cloud Run
```bash
cd backend

gcloud run deploy qwiz-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 2. Deploy Frontend to Cloud Run
```bash
cd frontend

gcloud run deploy qwiz-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NEXT_PUBLIC_BACKEND_URL=https://qwiz-backend-303494497673.us-central1.run.app
```

After deployment, Cloud Run provides URLs for both services. Update `NEXT_PUBLIC_BACKEND_URL` if the backend URL changes.



## Testing

### Backend Tests

Comprehensive pytest-based test suite covering all backend logic:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
pytest
```

**Test Coverage:**
- API endpoints (sessions, questions, answers, leaderboard)
- WebSocket connections and real-time messaging
- Gemini AI question generation
- Firestore database operations
- Analytics and scoring calculations
- Error handling and edge cases

See [backend/README.md](backend/README.md#testing) for detailed testing documentation.

### Frontend Tests

Frontend testing to be implemented. Current focus is on backend test coverage for core business logic.

## Development

- **Backend**: See `backend/README.md` for FastAPI setup and API documentation
- **Frontend**: See `frontend/README.md` for Next.js development and component structure

## License

MIT - see LICENSE file
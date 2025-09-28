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
│   ├── Dockerfile       # Backend container
│   └── requirements.txt # Python dependencies
├── frontend/            # Next.js React app  
│   ├── src/            # Source code
│   ├── Dockerfile      # Frontend container
│   └── package.json    # Node dependencies
├── .env                # Environment configuration (create from .env.example)
├── .env.example        # Template for environment variables
├── docker-compose.yml  # Local development orchestration
└── README.md          # This file
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Google Cloud CLI (for deployment)
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)


### Daily Git Workflow 

1. Update local main branch:
`git fetch origin && git checkout main && git pull origin main`

2. Create/switch to your branch:
`checkout -b your-feature-name`    # Create new branch
`git checkout your-feature-name`       # OR switch to existing branch

3. Make changes, then commit:
`git add .`
`git commit -m "Descriptive commit message"`

**Switch back and rebase**
`git rebase main`

**If conflicts occur: resolve in editor, then**
`git add . && git rebase --continue`

**Force push when complete**
`git push --force-with-lease origin your-feature-name`

4. Create Pull Request on GitHub

### Environment Setup

1. **Copy the environment template**:
```bash
cp .env.example .env
```

2. **Edit `.env` file with your configuration**:
- Add your Gemini API key (accessed via Google Cloud Secrets)
- Update the HOST_GCLOUD_PATH to your local gcloud config directory
- Keep QWIZ_API_URL as http://localhost:8080 for local development or switch to using the production backend

### Run with Docker Compose

```bash
# Build and start both services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

Access the services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

### Individual Development (Without Docker)

**Backend**:
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the development server
uvicorn app.main:app --reload --port 8080    
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Google Cloud Authentication

The application uses Application Default Credentials (ADC) for Google Cloud services:

### Local Development
```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Set your project
gcloud config set project software-innovation-studio-6
```

This creates credentials at `~/.config/gcloud/application_default_credentials.json` which are automatically mounted in Docker containers via the volume mapping in docker-compose.yml.

## Deployment to Production

**⚠️ Important**: Deploy backend first, then frontend (frontend depends on backend URL)

### 1. Deploy Backend to Cloud Run
```bash
cd backend

gcloud run deploy qwiz-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --env-vars-file ../env.yaml
```

### 2. Deploy Frontend to Cloud Run  
```bash
cd frontend

gcloud run deploy qwiz-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
  --env-vars-file ../env.yaml
```

### Docker Individual Containers
```bash
# Build images
docker build -t qwiz-backend ./backend
docker build -t qwiz-frontend ./frontend
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
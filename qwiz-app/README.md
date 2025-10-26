# Qwiz App

Real-time AI-powered quiz application for interactive lectures. Students join sessions with unique codes and answer AI-generated questions while lecturers monitor engagement through live analytics.

## Overview

Qwiz enhances lecture engagement by automatically generating quiz questions from live content using AI. The system provides real-time feedback to both students and lecturers, creating an interactive learning environment.

## Features

- **Live Quiz Sessions**: Students join with unique codes, answer MCQs in real-time
- **AI Question Generation**: Auto-generate questions from lecture transcripts using Gemini AI
- **Real-time Leaderboard**: Live scoring and competitive rankings
- **Lecturer Dashboard**: Session management and student performance analytics
- **WebSocket Communication**: Real-time data sync across all participants
- **Ephemeral Sessions**: Privacy-focused with no persistent student data

## Tech Stack

- **Backend**: FastAPI (Python) with FireStore database
- **Real-time**: WebSocket connections for live updates
- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **AI**: Google Gemini API for question generation
- **Deployment**: Google Cloud Run with Docker containers

## Architecture

```
┌─────────────┐    WebSocket    ┌─────────────┐    FireStore    ┌─────────────┐
│   Frontend  │◄───────────────►│   Backend   │◄───────────────►│  Database   │
│  (Next.js)  │                 │  (FastAPI)  │                 │ (FireStore) │
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

**See [LOCAL_SETUP.md](LOCAL_SETUP.md)** for complete setup instructions including GCP authentication, environment configuration, and running the app locally.

### Prerequisites
- Docker & Docker Compose OR Node.js 18+ & Python 3.11+
- Google Cloud CLI (authenticated with Application Default Credentials)
- Firebase project with FireStore enabled
- Gemini API key

## Development Best Practices

### Code Quality
- **Linting**: ESLint (frontend), Flake8 (backend)
- **Testing**: Jest + React Testing Library (frontend), pytest (backend)
- **Type Safety**: TypeScript (frontend), Pydantic schemas (backend)

### Git Workflow
1. Create feature branch from `main`
2. Make changes with clear, descriptive commits
3. Open Pull Request using the PR template
4. **Automated CI checks run on every PR:**
   - Linting (ESLint + Flake8)
   - Unit tests (Jest + pytest)
   - Build verification
5. Address review feedback
6. Merge after approval and passing checks

### Pull Request Template
All PRs must include:
- Description of changes
- Testing performed (unit + manual)
- Link to related Trello ticket
- Reviewer checklist completion

See `.github/PULL_REQUEST_TEMPLATE.md` for full template.



## Deployment

**Deployment uses Google Cloud Run** with automated container builds via Cloud Build. Containers are stored in Artifact Registry and deployed as Cloud Run services.

**⚠️ Deploy Order**: Backend first, then frontend (frontend needs backend URL)

### Prerequisites
```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Set project
gcloud config set project software-innovation-studio-6
```

### Deploy Backend
```bash
cd backend
gcloud run deploy qwiz-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars GOOGLE_CLOUD_PROJECT=software-innovation-studio-6,ALLOWED_ORIGINS=https://qwiz-app-303494497673.us-central1.run.app
```

Note: Update `ALLOWED_ORIGINS` if your frontend URL is different.

### Deploy Frontend
```bash
cd frontend
gcloud run deploy qwiz-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

**Note:** The frontend gets its backend URL from `frontend/.env.production` at build time. Ensure this file exists with:
```
NEXT_PUBLIC_BACKEND_URL=https://qwiz-backend-303494497673.us-central1.run.app
```



## Testing

### Automated Testing (CI/CD)

**GitHub Actions** automatically run on every push and pull request:
- ✅ Linting (ESLint + Flake8)
- ✅ Unit tests (Jest + pytest)
- ✅ Build verification

See `.github/workflows/ci.yml` for full configuration.

### Running Tests Locally

**Frontend:**
```bash
cd frontend
npm test              # Run Jest tests (17 tests)
npm run lint          # ESLint
npm run build         # Verify build
```

**Backend:**
```bash
cd backend
pytest                # Run all tests
flake8 app --max-line-length=120  # Lint
```

### Test Coverage

**Frontend** (Jest + React Testing Library):
- UI components (Button, Input, Badge, ConfirmDialog)
- Chart rendering and data visualization
- Validation logic (session codes, names, scoring)

**Backend** (pytest):
- API endpoints and schemas
- WebSocket real-time messaging
- Analytics and leaderboard calculations
- Error handling

See component READMEs for detailed testing documentation:
- [frontend/README.md](frontend/README.md#testing)
- [backend/README.md](backend/README.md#testing)

## Development

- **Backend**: See `backend/README.md` for FastAPI setup and API documentation
- **Frontend**: See `frontend/README.md` for Next.js development and component structure

## License

MIT - see LICENSE file
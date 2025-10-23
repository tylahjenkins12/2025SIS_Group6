# Local Development Setup

Complete guide for setting up the Qwiz application locally. Choose between Docker (recommended) or manual setup.

## Prerequisites

### Required Tools
- **Docker Desktop** (for Docker setup) - [Download](https://www.docker.com/products/docker-desktop)
- **Google Cloud CLI** - [Install Guide](https://cloud.google.com/sdk/docs/install)
- **Node.js 18+** (for manual frontend setup)
- **Python 3.11+** (for manual backend setup)

### Google Cloud Account
- Access to project: `software-innovation-studio-6`
- Required permissions: Firestore access, Secret Manager access
- Team member with appropriate IAM roles

## Google Cloud Setup

### 1. Install Google Cloud CLI

If not already installed, follow the [official installation guide](https://cloud.google.com/sdk/docs/install) for your platform

Verify installation:
```bash
gcloud --version
```

### 2. Authenticate with Google Cloud

```bash
# Login to your Google account
gcloud auth login
```

This opens a browser window for authentication. Sign in with your UTS/project Google account that has access to the `software-innovation-studio-6` project.

### 3. Set Up Application Default Credentials (ADC)

ADC allows the application to authenticate with Google Cloud services (FireStore, Gemini API) without hardcoding credentials:

```bash
# Set up ADC - required for local development
gcloud auth application-default login
```

This creates credentials at `~/.config/gcloud/application_default_credentials.json` that are automatically discovered by Google Cloud client libraries.

### 4. Configure Default Project

```bash
# Set the active project
gcloud config set project software-innovation-studio-6

# Verify configuration
gcloud config list
```

### 5. Verify Access to Required Services

**Test Firestore access:**
```bash
gcloud firestore databases list
```

**Check Secret Manager (for Gemini API key):**
```bash
gcloud secrets list
```

### Understanding GCP Integration

The application uses Google Cloud Platform for:

- **Firestore:** NoSQL database storing sessions, questions, students, and answers
- **Gemini API:** AI model for generating quiz questions from lecture transcripts
- **Application Default Credentials:** Automatic authentication without managing service account keys

In local development, ADC uses your personal credentials. In production (Cloud Run), it uses the service account attached to the Cloud Run service.


## Environment Configuration

### 1. Create Environment File

Copy the example file and configure:
```bash
cd qwiz-app
cp .env.example .env
```

### 2. Update `.env` File

```bash
# Google Cloud Authentication (required for Docker setup)
HOST_GCLOUD_PATH=/Users/YOUR-USERNAME/.config/gcloud
CONTAINER_GCLOUD_PATH=/root/.config/gcloud
GOOGLE_APPLICATION_CREDENTIALS=${CONTAINER_GCLOUD_PATH}/application_default_credentials.json

# Backend Configuration
GOOGLE_CLOUD_PROJECT=software-innovation-studio-6
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

**Important:**
- Replace `YOUR-USERNAME` in `HOST_GCLOUD_PATH` with your actual system username
- Obtain the Gemini API key from Google Cloud Secret Manager or your team lead
- The `.env` file is gitignored and should never be committed

## Setup Options

Choose **one** of the following approaches:

---

## Option A: Docker Setup (Recommended)

Run the entire stack in isolated containers with a single command.

### Start the Application

```bash
# From qwiz-app directory
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **API Docs:** http://localhost:8080/docs

### Stop the Application
```bash
docker-compose down
```

### Troubleshooting Docker Setup
- **Port conflicts:** Ensure ports 3000 and 8080 are available
- **GCP auth errors:** Verify `HOST_GCLOUD_PATH` in `.env` matches your system path
- **Build failures:** Clear Docker cache with `docker-compose build --no-cache`

---

## Option B: Manual Local Setup

Run backend and frontend separately for active development.

### Backend Setup

1. **Navigate to backend:**
   ```bash
   cd qwiz-app/backend
   ```

2. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start backend server:**
   ```bash
   python run_local.py
   ```

**Backend URLs:**
- API: http://localhost:8080
- WebSocket: ws://localhost:8080/ws
- Docs: http://localhost:8080/docs

### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd qwiz-app/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

**Frontend URL:** http://localhost:3000

---

## Verification

### Test the Full Stack

1. **Access Frontend:** Navigate to http://localhost:3000

2. **Lecturer Flow:**
   - Go to http://localhost:3000/lecturer
   - Fill in session details (name, course, interval)
   - Click "Start session"
   - Verify session code is generated

3. **Student Flow:**
   - Open http://localhost:3000/student in a new tab
   - Enter the session code from lecturer view
   - Enter a student name and join
   - Verify successful connection

4. **Backend Health:**
   - Visit http://localhost:8080/docs
   - Verify API documentation loads
   - Check http://localhost:8080/health returns `{"status": "healthy"}`

### Check WebSocket Connection

Open browser DevTools → Network → WS tab to verify WebSocket connections are established for both lecturer and student interfaces.

## Common Issues

### Authentication Errors
```
Error: Could not load Application Default Credentials
```
**Solution:** Run `gcloud auth application-default login` and restart the application.

### Port Already in Use
```
Error: Port 8080 is already allocated
```
**Solution:** Stop other services using ports 3000/8080 or change ports in `docker-compose.yml`.

### Module Import Errors (Backend)
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solution:** Ensure virtual environment is activated and dependencies are installed:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Build Errors
```
Error: Cannot find module 'next'
```
**Solution:** Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### FireStore Connection Issues
**Symptoms:** Sessions fail to create, database errors in logs
**Solution:**
1. Verify GCP authentication: `gcloud auth list`
2. Check project is set: `gcloud config get-value project`
3. Ensure Firestore API is enabled in the GCP console

## Development Workflow

### Hot Reloading
- **Frontend:** Automatically reloads on file changes
- **Backend:** Restart required (or use `uvicorn --reload` instead of `run_local.py`)

### Viewing Logs
```bash
# Docker
docker-compose logs -f

# Manual setup
# Backend: Check terminal running run_local.py
# Frontend: Check terminal running npm run dev
```

### Stopping Services
```bash
# Docker
docker-compose down

# Manual setup
# Press Ctrl+C in each terminal
```

## Next Steps

- **Deployment:** See [README.md](README.md#deployment-to-the-production-environment) for GCP Cloud Run deployment
- **Backend API:** See [backend/README.md](backend/README.md) for API documentation
- **Frontend Development:** See [frontend/README.md](frontend/README.md) for component structure

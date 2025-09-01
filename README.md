### Qwiz-app
This repository contains all the code for the Qwiz App, a project developed for the Software Innovation Studio subject at The University of Technology Sydney (UTS).

## Key Features
- **Real-time Transcription:** Uses AI to convert live audio from the lecturer into text.
- **AI-Powered Question Generation:** Generates relevant multiple-choice questions from the lecture content.
- **Live Quizzing:** Students can join a session with a unique ID and answer questions as they are generated.
- **Live Leaderboard:** Tracks and displays student scores in real-time.
- **Lecturer Analytics:** Provides lecturers with a live view of student performance to identify areas needing clarification.
- **Ephemeral Sessions:** Session data is not stored after the session ends to protect student privacy.

## Project Structure
This repository is organized into two main parts: the backend and the frontend.

**backend/:** Contains the FastAPI application, which handles all server-side logic, AI integration, and communication with Firestore. The README.md in this directory provides specific instructions for setting up the backend environment.

**frontend/:** Contains the web application code (HTML, CSS, JavaScript) that provides the user interface for both students and lecturers. The README.md in this directory provides instructions for running and building the frontend.

**Dockerfile:** A single Dockerfile is used to build a container image that packages both the backend and frontend for seamless deployment to Cloud Run.

**LICENSE:** Details the licensing information for this project.

## Getting Started
To get started with local development, you will need to set up both the backend and the frontend environments.

### Backend Setup:
Navigate to the backend/ directory and follow the instructions in its README.md to install dependencies and configure Firestore authentication.

# Follow the instructions in backend/README.md
`cd backend/`

### Frontend Setup:
Navigate to the frontend/ directory and follow the instructions in its README.md to run the client-side application.

# Follow the instructions in frontend/README.md
`cd frontend/`

## Running the Full Application:
Once both the backend and frontend are running locally, you can connect them to test the full application flow. The frontend will be configured to point to your local backend API endpoints (e.g., http://localhost:8080).

## Deployment
This application is designed to be deployed to Google Cloud's Cloud Run. The Dockerfile handles the entire build process. Deployment is managed by the gcloud CLI.

## How to Deploy:
From the root of the repository, use the following command to build and deploy the application.
```
gcloud run deploy realtime-qa-generator \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## License
This project is licensed under the MIT License - see the `LICENSE` file for details.
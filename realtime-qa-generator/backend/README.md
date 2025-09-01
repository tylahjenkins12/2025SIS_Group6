# Realtime QA Generator Backend

This is the backend for the Realtime QA Generator, a web application designed to enhance student engagement during lectures. The backend is built with FastAPI and leverages Google Cloud's Firestore and Gemini AI for real-time question generation and data management.

### Project Structure

* `backend/`: The root directory for the backend application.
* `__pycache__/`: Python's cache directory. Can be ignored.
* `venv/`: The Python virtual environment.
* `.env.example`: A template for setting up local environment variables. **Copy this to a file named `.env` and fill in the values.**
* `.firebaserc`: Firebase configuration file, specifies the project ID.
* `Dockerfile`: Defines the container image for deploying the application to Cloud Run.
* `firebase.json`: Firebase CLI configuration for deploying Firestore rules and other services.
* `firestore.rules`: Defines the security rules for the Firestore database.
* `main.py`: The core FastAPI application code, containing all API routes and logic.
* `README.md`: Project documentation.
* `requirements.txt`: Lists all Python package dependencies.

---

### Environment Setup

This guide will walk you through setting up the local development environment.

**Prerequisites:**
* Python 3.8+ installed
* [Pyenv](https://github.com/pyenv/pyenv) (recommended for managing Python versions)
* [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (gcloud CLI) installed and authenticated.
* [Docker](https://www.docker.com/) installed and available.

**Step-by-Step Instructions:**

1.  **Clone the Repository:**
    Navigate to your desired directory and clone the project.
    ```bash
    git clone [https://github.com/your-repo/realtime-qa-generator.git](https://github.com/your-repo/realtime-qa-generator.git)
    cd realtime-qa-generator/backend
    ```

2.  **Create and Activate a Virtual Environment:**
    A virtual environment keeps project dependencies isolated.
    ```bash
    pyenv install 3.11  # Or your desired Python version
    pyenv virtualenv 3.11 venv
    pyenv activate venv
    ```
    *If you are not using `pyenv`, you can use `python3 -m venv venv` followed by `source venv/bin/activate`.*

3.  **Install Python Dependencies:**
    Install all required packages listed in `requirements.txt`.
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Firestore Authentication:**
    To connect to the Firestore database, you need a service account key. This key is stored securely in Google Cloud Secret Manager.

    * **Ensure `gcloud` is configured:** Verify that you are logged in to the correct GCP project.
        ```bash
        gcloud auth list
        gcloud config get-value project
        ```
    * **Create a `secrets` directory:** This directory will store the key file and is included in `.gitignore`.
        ```bash
        mkdir secrets
        ```
    * **Download the Secret:** Access the secret from Secret Manager and save it to `secrets/firestore-key.json`.
        ```bash
        gcloud secrets versions access latest --secret="LECTURE-QUIZ-FIRESTORE-KEY" --format="json" > ./secrets/firestore-key.json
        ```
        *Note: If the secret name is different, update the command accordingly.*

5.  **Set Environment Variables:**
    Create a local `.env` file by copying the template, then fill in the path to your secret key file. The application will read this to authenticate.

    ```bash
    cp .env.example .env
    # Open .env and ensure it looks like this:
    # GOOGLE_APPLICATION_CREDENTIALS="./secrets/firestore-key.json"
    ```

6.  **Run the Backend Application:**
    You can now run the application locally. It will start a server on `http://localhost:8080`.

    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8080
    ```
    * `--reload`: Automatically reloads the server on code changes.
    * `--host 0.0.0.0`: Makes the server accessible externally (useful for Docker).
    * `main:app`: Refers to the `app` object within the `main.py` file.

---





### Testing Local Development

After the server is running, you can test the basic functionality using `curl` or a tool like Postman.

1.  **Check API Status:**
    Confirm the server is operational.
    ```bash
    curl http://localhost:8080/
    ```
    *Expected output: `{"message":"QA Generator Backend is running"}`*

2.  **Create a New Session:**
    Simulate a lecturer starting a session. The response will include a `sessionId`.
    ```bash
    curl -X POST http://localhost:8080/start-session
    ```
    *Expected output: `{"sessionId":"your-generated-id"}`*

3.  **Test WebSocket Connection (Manual):**
    WebSocket connections can be tested manually using a dedicated client like websocat or a simple Python script. This example uses two separate terminal windows to simulate a lecturer and a student.

    **Step 1: Open a new terminal for the Student**
    In this terminal, you'll act as the student, listening for new questions. Replace your-generated-id with the actual session ID from the previous step.

    # Ensure you have websocat installed: `pip install wscat`
    `wscat -c ws://127.0.0.1:8000/ws/student/{generated-session-id}`

    **Step 2: Open a new terminal for the Lecturer**
    In a separate terminal, you'll act as the lecturer. First, connect to the WebSocket, then send a JSON message containing a transcript chunk.

    `wscat -c ws://127.0.0.1:8000/ws/lecturer/{generated-session-id}`

    # Once connected, paste this JSON string and press Enter:
    ```
    > {"type": "transcript_chunk", "chunk": "A design system is a comprehensive set of standards, components, and principles that guides the creation of products. It ensures visual and functional consistency across different applications."}
    ```

    ```
    **Expected Output:**
    The student's terminal (from Step 1) should receive a new JSON message containing the generated question.

    {
    "type": "new_question",
    "question": {
        "id": "...",
        "questionText": "What is the primary purpose of a design system?",
        "options": ["To create new products quickly", "To ensure consistency and reusability", "To improve a company's marketing", "To manage project deadlines"],
        "correctAnswer": "To ensure consistency and reusability",
        "generatedBy": "AI"
        }
    }
    ```

---

### Deployment

Deployment is managed by Cloud Run and should only be performed after a branch has been reviewed, approved, and merged to the `main` branch.

**How to Deploy:**

1.  Ensure you are in the `backend` directory.
2.  Run the following `gcloud` command, which uses the `Dockerfile` to build and deploy the container image.
    ```bash
    gcloud run deploy realtime-qa-generator \
        --source . \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --set-env-vars=GOOGLE_CLOUD_PROJECT="software-innovation-studio-6",GEMINI_API_KEY="your-gemini-key"
    ```
*Note: This command will automatically build the image and push it to Google Container Registry before deploying it to Cloud Run. Subsequent deployments will be faster as they only push changed layers.*



### docker development 

deploying container locally commands 

build container - `docker build -t qwiz-app-backend .`
run container with credentials mounted (for firestore access) - `docker run -p 8080:8080 --env-file ./backend/.env -v ~/.config/gcloud/application_default_credentials.json:/root/.config/gcloud/application_default_credentials.json qwiz-app-backend`
shell into container - 
1. get container id `docker ps`
2. `docker exec -it {container-id} sh`
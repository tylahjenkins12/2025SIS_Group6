# app/api/sessions.py
import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

# Note: The import below assumes that db and session_manager are accessible this way.
from app.dependencies import db, session_manager
# from app.config import settings # You would need this import if using the settings object directly
from app.schemas import FirestoreQuestion
from app.services import generate_question_with_llm


router = APIRouter()

# Store a temporary transcript per session
temp_transcripts = {}
last_transcript_time = {}

# The minimum time in seconds between automatic question generations
GENERATION_INTERVAL = 30 
# The minimum length of the transcript before a question is generated
MIN_TRANSCRIPT_LENGTH = 150

async def generate_and_save_question(session_id: str):
    """
    Background task to generate and save a question from the transcript.
    """
    transcript = temp_transcripts.get(session_id, "")
    if transcript and len(transcript) >= MIN_TRANSCRIPT_LENGTH:
        print("Automatically generating question from transcript...")
        # Make sure to pass the API key as the second argument
        question_data = await generate_question_with_llm(transcript)
        
        if question_data:
            session_ref = db.collection('sessions').document(session_id)
            questions_ref = session_ref.collection('questions')
            
            # The function already returns a FirestoreQuestion object, so just use it
            questions_ref.add(question_data.model_dump())
            
            # Clear the temporary transcript after a question is generated
            temp_transcripts[session_id] = ""
            last_transcript_time[session_id] = datetime.now(timezone.utc)
            print("Question saved to Firestore.")
        else:
            await session_manager.broadcast(session_id, {"type": "error", "message": "Failed to generate question automatically."})


@router.post("/start-session", status_code=201)
async def start_session():
    """
    Creates a new session in Firestore and returns the session ID.
    This also initializes a transcript store for the session.
    """
    # Create a new document in the 'sessions' collection
    session_ref = db.collection('sessions').document()
    session_id = session_ref.id

    try:
        # Save the session to Firestore with a creation timestamp
        session_ref.set({
            "createdAt": datetime.now(timezone.utc),
            "status": "active",
            "lecturerTranscript": "",
        })

        # Initialize temporary transcript and last timestamp
        temp_transcripts[session_id] = ""
        last_transcript_time[session_id] = datetime.now(timezone.utc)

        # Start the real-time listener for this session's questions
        session_manager.start_listener(session_id)

        print(f"Session {session_id} created successfully.")
        return {"sessionId": session_id}

    except Exception as e:
        print(f"Error creating session: {e}")
        # If Firestore call fails, a 500 error is a good response
        raise HTTPException(status_code=500, detail="Error creating session")

@router.websocket("/ws/{client_type}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, client_type: str, session_id: str):
    """
    Handles WebSocket connections for lecturers and students.
    """
    # Check if the session exists in Firestore
    session_ref = db.collection('sessions').document(session_id)
    session_doc = session_ref.get()
    
    if not session_doc.exists:
        await websocket.close(code=1008, reason="Session not found")
        return

    # Add the new connection to the session manager
    await session_manager.connect(session_id, websocket)

    try:
        # A simple background task that runs continuously to check for new questions
        async def automatic_generation_loop():
            while True:
                # Calculate time since last chunk
                time_diff = (datetime.now(timezone.utc) - last_transcript_time.get(session_id, datetime.now(timezone.utc))).total_seconds()
                
                # Check if it's time to generate a question and there's enough transcript
                if time_diff >= GENERATION_INTERVAL and temp_transcripts.get(session_id) and len(temp_transcripts.get(session_id, "")) >= MIN_TRANSCRIPT_LENGTH:
                    await generate_and_save_question(session_id)
                
                # Wait for a bit before checking again
                await asyncio.sleep(5)
        
        # Start the loop as a background task
        if client_type == "lecturer":
            asyncio.create_task(automatic_generation_loop())

        while True:
            # Receive data from the WebSocket
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")

            if client_type == "lecturer":
                if message_type == "transcript_chunk":
                    # Append the transcript chunk and update the last timestamp
                    transcript_chunk = message.get("chunk", "")
                    temp_transcripts[session_id] += transcript_chunk
                    last_transcript_time[session_id] = datetime.now(timezone.utc)
                    print(f"Transcript chunk received: {transcript_chunk}")
            
            # Additional logic for student client type can be added here
            
    except WebSocketDisconnect:
        # A client has disconnected, remove them from the session
        session_manager.disconnect(session_id, websocket)

    except Exception as e:
        print(f"An error occurred in the WebSocket loop: {e}")
        # Clean up on unexpected error
        session_manager.disconnect(session_id, websocket)
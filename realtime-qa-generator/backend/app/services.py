# app/services.py
import json
import uuid
import asyncio
import requests
from typing import List, Dict, Union, Optional

from fastapi import WebSocket, WebSocketDisconnect
from google.cloud import firestore

from app.config import settings
from app.schemas import QuestionFromLLM, FirestoreQuestion

class SessionManager:
    """
    Manages WebSocket connections and Firestore listeners based on session ID.
    This class is now defined here but the instance is created in dependencies.py.
    """
    def __init__(self, db_client):
        self.active_sessions: Dict[str, List[WebSocket]] = {}
        self.snapshot_listeners = {}
        # The db client is now passed in via dependency injection
        self.db = db_client

    async def connect(self, session_id: str, websocket: WebSocket):
        """Adds a new WebSocket to an active session."""
        await websocket.accept()
        if session_id not in self.active_sessions:
            self.active_sessions[session_id] = []
        self.active_sessions[session_id].append(websocket)
        print(f"WebSocket connected to session {session_id}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        """Removes a WebSocket from an active session."""
        if session_id in self.active_sessions:
            self.active_sessions[session_id].remove(websocket)
            if not self.active_sessions[session_id]:
                # If no connections left, clean up the session from memory
                del self.active_sessions[session_id]
                self.remove_listener(session_id)
        print(f"WebSocket disconnected from session {session_id}")

    async def broadcast(self, session_id: str, message: dict):
        """Broadcasts a message to all connections in a specific session."""
        if session_id in self.active_sessions:
            disconnected_websockets = []
            for connection in self.active_sessions[session_id]:
                try:
                    await connection.send_json(message)
                except WebSocketDisconnect:
                    disconnected_websockets.append(connection)
                except Exception as e:
                    print(f"An unexpected error occurred during broadcast: {e}")
            for ws in disconnected_websockets:
                # Remove disconnected websockets
                if ws in self.active_sessions[session_id]:
                    self.active_sessions[session_id].remove(ws)

    def start_listener(self, session_id: str):
        """Sets up a real-time Firestore listener for a session's questions."""
        # Check if a listener is already running for this session
        if session_id in self.snapshot_listeners:
            return

        # Reference to the questions sub-collection for the given session
        questions_ref = self.db.collection('sessions').document(session_id).collection('questions')

        # The on_snapshot function will be called on every change
        def on_snapshot(col_snapshot, changes, read_time):
            print(f"Snapshot received for session {session_id}")
            for change in changes:
                if change.type.name == 'ADDED':
                    new_question_data = change.document.to_dict()
                    # Broadcast the new question to all connected students for this session
                    asyncio.run(self.broadcast(session_id, {"type": "new_question", "question": new_question_data}))

        # Start the listener and store the callback in a dictionary to manage it later
        print(f"Starting Firestore listener for session {session_id}")
        self.snapshot_listeners[session_id] = questions_ref.on_snapshot(on_snapshot)
    
    def remove_listener(self, session_id: str):
        """Detaches the Firestore listener for a session."""
        if session_id in self.snapshot_listeners:
            self.snapshot_listeners[session_id]()
            del self.snapshot_listeners[session_id]
            print(f"Firestore listener for session {session_id} detached.")

async def generate_question_with_llm(transcript: str) -> Optional[FirestoreQuestion]:
    """
    Uses the Gemini API to generate a single multiple-choice question from a transcript.
    The API request is configured to return a structured JSON response.
    Returns a formatted FirestoreQuestion object or None on failure.
    """
    api_key = settings.GEMINI_API_KEY
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={api_key}"
    
    prompt = f"""Based on the following lecture transcript, generate a single multiple-choice question. 
    For the question, provide four distinct options, and specify the correct answer. 
    Ensure the question is directly relevant to the transcript content.

    Transcript:
    {transcript}
    """
    
    # Define the desired JSON schema for the LLM response
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "question_text": {"type": "STRING"},
            "options": {
                "type": "ARRAY",
                "items": {"type": "STRING"}
            },
            "correct_answer": {"type": "STRING"}
        },
        "propertyOrdering": ["question_text", "options", "correct_answer"]
    }
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": response_schema
        }
    }
    
    try:
        response = requests.post(api_url, json=payload, headers={'Content-Type': 'application/json'})
        response.raise_for_status()
        
        result = response.json()
        if result.get("candidates"):
            json_text = result["candidates"][0]["content"]["parts"][0]["text"]
            parsed_json = json.loads(json_text)
            
            # Validate and format the LLM response into a FirestoreQuestion object
            llm_question = QuestionFromLLM(**parsed_json)
            
            # The FirestoreQuestion model will add its own ID
            return FirestoreQuestion(
                questionText=llm_question.question_text,
                options=llm_question.options,
                correctAnswer=llm_question.correct_answer,
                generatedBy="AI"
            )
        else:
            print("LLM response did not contain candidates.")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error calling Gemini API: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from LLM response: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None
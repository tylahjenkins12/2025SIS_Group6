# app/api/sessions.py
import asyncio
import json
import uuid
import random
import string
from datetime import datetime, timedelta, timezone

### temporary imports
import random
import string
### end temporary imports

import requests
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

# Note: The import below assumes that db and session_manager are accessible this way.
from app.dependencies import db, session_manager, analytics_service
# from app.config import settings # You would need this import if using the settings object directly
from app.schemas import SessionCreate, FirestoreQuestion, StudentAnswer, LecturerQuestionSelection
from app.services import generate_three_questions_with_llm


router = APIRouter()

# Store a temporary transcript per session
temp_transcripts = {}
last_transcript_time = {}
session_start_times = {}

# Default constants (will be overridden by session configuration)
GENERATION_INTERVAL = 30
MIN_TRANSCRIPT_LENGTH = 150

def generate_short_session_code() -> str:
    """Generate a short 6-character session code (alphanumeric, uppercase)."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def generate_question_options_for_lecturer(session_id: str, transcript_chunk: str):
    """
    Generate 3 question options from transcript chunk and send to lecturer for selection.
    """
    if len(transcript_chunk.strip()) < MIN_TRANSCRIPT_LENGTH:
        print(f"Transcript chunk too short ({len(transcript_chunk)} chars), skipping question generation")
        return

    print(f"Generating 3 question options from transcript chunk...")
    question_options = await generate_three_questions_with_llm(transcript_chunk)

    if question_options and len(question_options) > 0:
        # Create a unique chunk ID for this set of questions
        chunk_id = str(uuid.uuid4())

        # Send the 3 questions to the lecturer via WebSocket
        await session_manager.broadcast(session_id, {
            "type": "question_options",
            "chunk_id": chunk_id,
            "questions": [
                {
                    "index": i,
                    "question_text": q.questionText,
                    "options": q.options,
                    "correct_answer": q.correctAnswer
                }
                for i, q in enumerate(question_options)
            ],
            "transcript_chunk": transcript_chunk[:200] + "..." if len(transcript_chunk) > 200 else transcript_chunk
        })

        print(f"Sent {len(question_options)} question options to lecturer for session {session_id}")
    else:
        await session_manager.broadcast(session_id, {
            "type": "error",
            "message": "Failed to generate question options from transcript chunk."
        })


@router.post("/start-session", status_code=201)
async def start_session(session_data: SessionCreate):
    """
    Creates a new session with lecturer configuration.
    """
    # Generate a short session code instead of using UUID
    session_code = generate_short_session_code()

    # Ensure the session code is unique (check Firestore)
    max_attempts = 10
    for attempt in range(max_attempts):
        session_ref = db.collection('sessions').document(session_code)
        if not session_ref.get().exists:
            break
        session_code = generate_short_session_code()
        if attempt == max_attempts - 1:
            raise HTTPException(status_code=500, detail="Could not generate unique session code")

    session_id = session_code
    session_start_time = datetime.now(timezone.utc)

    try:
        # Save the session to Firestore with lecturer configuration
        session_ref.set({
            "createdAt": session_start_time,
            "lecturerName": session_data.lecturer_name,
            "courseName": session_data.course_name,
            "answerTimeSeconds": session_data.answer_time_seconds,
            "transcriptionIntervalSeconds": session_data.transcription_interval_minutes * 60,
            "status": "active",
            "lecturerTranscript": "",
        })

        # Initialize temporary transcript and last timestamp
        temp_transcripts[session_id] = ""
        last_transcript_time[session_id] = session_start_time
        
        # Store session start time for duration calculation
        session_start_times[session_id] = session_start_time

        # Start the real-time listener for this session's questions
        session_manager.start_listener(session_id)

        print(f"Session {session_id} created successfully.")
        return {
            "sessionId": session_id,
            "lecturerName": session_data.lecturer_name,
            "courseName": session_data.course_name,
            "answerTime": session_data.answer_time_seconds,
            "transcriptionInterval": session_data.transcription_interval_minutes * 60
        }

    except Exception as e:
        print(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Error creating session")

@router.post("/select-question", status_code=201)
async def select_question(selection_data: LecturerQuestionSelection):
    """
    Lecturer selects one of the 3 generated questions to release to students.
    """
    try:
        # Validate session exists
        session_ref = db.collection('sessions').document(selection_data.session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")

        # Note: In a full implementation, you would:
        # 1. Store the mapping of chunk_id to the 3 questions (currently not stored)
        # 2. Retrieve the selected question from that mapping
        # 3. Save the selected question to Firestore
        # 4. Broadcast the question to all students

        # For now, we'll create a placeholder response
        print(f"Lecturer selected question {selection_data.selected_question_index} for chunk {selection_data.chunk_id}")

        # Broadcast to session that a question has been selected
        await session_manager.broadcast(selection_data.session_id, {
            "type": "question_selected",
            "message": f"Question {selection_data.selected_question_index + 1} has been selected and released to students",
            "chunk_id": selection_data.chunk_id
        })

        return {
            "status": "success",
            "message": "Question selected and released to students",
            "selected_index": selection_data.selected_question_index
        }

    except Exception as e:
        print(f"Error selecting question: {e}")
        raise HTTPException(status_code=500, detail="Error processing question selection")

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
    
    # Generate a unique student ID for tracking (in a real app, this would come from authentication)
    student_id = f"student_{id(websocket)}"
    
    # Track student joining if it's a student connection
    if client_type == "student":
        await analytics_service.track_student_join(session_id, student_id)

    try:
        # No automatic generation loop needed - questions are generated per transcript chunk

        while True:
            # Receive data from the WebSocket
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")

            if client_type == "lecturer":
                if message_type == "transcript_chunk":
                    # Process transcript chunk and generate 3 questions for lecturer
                    transcript_chunk = message.get("chunk", "")
                    timestamp = message.get("timestamp", "")

                    print(f"Transcript chunk received at {timestamp}: {transcript_chunk}")

                    # Send acknowledgment to frontend
                    await websocket.send_json({
                        "type": "transcript_received",
                        "chunk_length": len(transcript_chunk),
                        "timestamp": timestamp
                    })

                    # Generate 3 question options for lecturer selection
                    await generate_question_options_for_lecturer(session_id, transcript_chunk)
                    
            elif client_type == "student":
                if message_type == "answer_submission":
                    # Handle student answer submission
                    try:
                        answer_data = StudentAnswer(**message.get("data", {}))
                        
                        # Get the correct answer from Firestore
                        question_ref = db.collection('sessions').document(session_id).collection('questions').document(answer_data.question_id)
                        question_doc = question_ref.get()
                        
                        if question_doc.exists:
                            question_data = question_doc.to_dict()
                            correct_answer = question_data.get('correctAnswer')
                            
                            # Track the answer submission
                            await analytics_service.track_answer_submitted(
                                session_id=session_id,
                                student_id=student_id,
                                question_id=answer_data.question_id,
                                selected_option=answer_data.selected_option,
                                correct_answer=correct_answer,
                                response_time_ms=answer_data.response_time_ms
                            )
                            
                            # Send confirmation back to student
                            is_correct = answer_data.selected_option == correct_answer
                            await websocket.send_json({
                                "type": "answer_result",
                                "question_id": answer_data.question_id,
                                "is_correct": is_correct,
                                "correct_answer": correct_answer
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Question not found"
                            })
                    except Exception as e:
                        print(f"Error handling answer submission: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "message": "Invalid answer format"
                        })
            
    except WebSocketDisconnect:
        # A client has disconnected, remove them from the session
        session_manager.disconnect(session_id, websocket)
        
        # Track student leaving if it's a student connection
        if client_type == "student":
            await analytics_service.track_student_leave(session_id, student_id)

    except Exception as e:
        print(f"An error occurred in the WebSocket loop: {e}")
        # Clean up on unexpected error
        session_manager.disconnect(session_id, websocket)
        
        # Track student leaving if it's a student connection
        if client_type == "student":
            await analytics_service.track_student_leave(session_id, student_id)

@router.get("/sessions/{session_id}/analytics")
async def get_session_analytics(session_id: str):
    """
    Get real-time analytics for a specific session.
    """
    try:
        # Check if session exists
        session_ref = db.collection('sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get current analytics
        analytics = await analytics_service.get_session_analytics(session_id)
        return {"analytics": analytics.model_dump()}
        
    except Exception as e:
        print(f"Error retrieving session analytics: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving analytics")

@router.get("/sessions/{session_id}/leaderboard")
async def get_session_leaderboard(session_id: str):
    """
    Get current session leaderboard.
    """
    try:
        # Check if session exists
        session_ref = db.collection('sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get leaderboard
        leaderboard = await analytics_service.get_leaderboard(session_id)
        return {"leaderboard": leaderboard.model_dump()}
        
    except Exception as e:
        print(f"Error retrieving leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving leaderboard")

@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    """
    End a quiz session and return final results.
    """
    try:
        # Check if session exists
        session_ref = db.collection('sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session status
        session_ref.update({"status": "ended", "endedAt": datetime.now(timezone.utc)})
        
        # Get session start time
        start_time = session_start_times.get(session_id, datetime.now(timezone.utc))
        
        # End session and get results
        results = await analytics_service.end_session(session_id, start_time)
        
        # Clean up session data
        if session_id in temp_transcripts:
            del temp_transcripts[session_id]
        if session_id in last_transcript_time:
            del last_transcript_time[session_id]
        if session_id in session_start_times:
            del session_start_times[session_id]
            
        # Remove Firestore listener
        session_manager.remove_listener(session_id)
        
        return {"results": results.model_dump()}
        
    except Exception as e:
        print(f"Error ending session: {e}")
        raise HTTPException(status_code=500, detail="Error ending session")

@router.get("/api/session_id/get")
async def get_session_id():

    ### temporary code generation functionality (moved from frontend to backend to test connection), to be updated!
    # Define the characters to choose from (Upper case alphabet + numbers)
    characters = string.ascii_uppercase + string.digits
    
    # Generate a random 4 character code
    code = ''.join(random.choice(characters) for _ in range(4))

    return {"code": code}
# app/api/sessions.py
import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

# Note: The import below assumes that db and session_manager are accessible this way.
from app.dependencies import db, session_manager, analytics_service
# from app.config import settings # You would need this import if using the settings object directly
from app.schemas import FirestoreQuestion, StudentAnswer
from app.services import generate_question_with_llm


router = APIRouter()

# Store a temporary transcript per session
temp_transcripts = {}
last_transcript_time = {}
session_start_times = {}

# Default constants (will be overridden by session configuration)
GENERATION_INTERVAL = 30 
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
            
            # Track the question generation analytics
            await analytics_service.track_question_generated(session_id, question_data.id, "AI")
            
            # Clear the temporary transcript after a question is generated
            temp_transcripts[session_id] = ""
            last_transcript_time[session_id] = datetime.now(timezone.utc)
            print("Question saved to Firestore.")
        else:
            await session_manager.broadcast(session_id, {"type": "error", "message": "Failed to generate question automatically."})


@router.post("/start-session", status_code=201)
async def start_session(session_data: SessionCreate):
    """
    Creates a new session with lecturer configuration.
    """
    # Create a new document in the 'sessions' collection
    session_ref = db.collection('sessions').document()
    session_id = session_ref.id
    session_start_time = datetime.now(timezone.utc)

    try:
        # Save the session to Firestore with lecturer configuration
        session_ref.set({
            "createdAt": session_start_time,
            "lecturerName": session_data.lecturer_name,
            "courseName": session_data.course_name,
            "questionIntervalSeconds": session_data.question_interval_seconds,
            "answerTimeSeconds": session_data.answer_time_seconds,
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
            "questionInterval": session_data.question_interval_seconds,
            "answerTime": session_data.answer_time_seconds
        }

    except Exception as e:
        print(f"Error creating session: {e}")
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
    
    # Generate a unique student ID for tracking (in a real app, this would come from authentication)
    student_id = f"student_{id(websocket)}"
    
    # Track student joining if it's a student connection
    if client_type == "student":
        await analytics_service.track_student_join(session_id, student_id)

    try:
        # A simple background task that runs continuously to check for new questions
        async def automatic_generation_loop():
            # Get session configuration for intervals
            session_doc = session_ref.get()
            if not session_doc.exists:
                return
            session_data = session_doc.to_dict()
            question_interval = session_data.get('questionIntervalSeconds', GENERATION_INTERVAL)
            
            while True:
                # Calculate time since last chunk
                time_diff = (datetime.now(timezone.utc) - last_transcript_time.get(session_id, datetime.now(timezone.utc))).total_seconds()
                
                # Check if it's time to generate a question and there's enough transcript
                if time_diff >= question_interval and temp_transcripts.get(session_id) and len(temp_transcripts.get(session_id, "")) >= MIN_TRANSCRIPT_LENGTH:
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